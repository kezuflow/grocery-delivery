import { describe, expect, it } from "vitest";

import {
  InMemoryLaunchConfigurationRepository,
  LaunchConfigurationConflictError,
  LaunchConfigurationService,
  type LaunchConfigurationInput,
} from "./launch-configuration.js";

const appliedAt = "2026-08-21T08:00:00.000Z";

describe("launch configuration application", () => {
  it("derives catalog prices and records an auditable configuration summary", async () => {
    const repository = new InMemoryLaunchConfigurationRepository();
    const service = new LaunchConfigurationService(repository, () => "audit-launch-1");

    const result = await service.apply({
      actorUserId: "admin-1",
      idempotencyKey: "launch-1",
      correlationId: "correlation-1",
      appliedAt,
      configuration: launchConfiguration(),
    });

    expect(result).toEqual({
      idempotencyKey: "launch-1",
      categoryCount: 1,
      skuCount: 1,
      deliveryWindowCount: 1,
      appliedAt,
      replayed: false,
    });
    expect(repository.applied[0]?.configuration.skus[0]?.sku.price).toEqual({
      centavos: 12_500,
      currency: "PHP",
    });
    expect(repository.applied[0]?.auditEvent).toMatchObject({
      id: "audit-launch-1",
      actorUserId: "admin-1",
      action: "launch-configuration.applied",
      metadata: {
        reason: "Approved staging launch manifest",
        correlationId: "correlation-1",
        categoryCount: "1",
        skuCount: "1",
        deliveryWindowCount: "1",
      },
    });
  });

  it("replays matching commands and rejects conflicting key reuse", async () => {
    const repository = new InMemoryLaunchConfigurationRepository();
    const service = new LaunchConfigurationService(repository);
    const command = {
      actorUserId: "admin-1",
      idempotencyKey: "launch-1",
      correlationId: "correlation-1",
      appliedAt,
      configuration: launchConfiguration(),
    } as const;

    await expect(service.apply(command)).resolves.toMatchObject({ replayed: false });
    await expect(
      service.apply({ ...command, appliedAt: "2026-08-21T08:05:00.000Z" }),
    ).resolves.toMatchObject({ appliedAt, replayed: true });
    expect(repository.applied).toHaveLength(1);

    await expect(
      service.apply({
        ...command,
        configuration: { ...command.configuration, reason: "A different approval" },
      }),
    ).rejects.toBeInstanceOf(LaunchConfigurationConflictError);
  });

  it.each([
    [
      "duplicate category slugs",
      {
        ...launchConfiguration(),
        categories: [
          launchConfiguration().categories[0]!,
          { id: "fruit-2", name: "More Fruit", slug: "fruit", active: true },
        ],
      },
      "category slug values must be unique",
    ],
    [
      "a SKU category outside the manifest",
      {
        ...launchConfiguration(),
        skus: [{ ...launchConfiguration().skus[0]!, categoryId: "missing-category" }],
      },
      "references a category outside this launch configuration",
    ],
    [
      "an active zero-price SKU",
      {
        ...launchConfiguration(),
        skus: [
          {
            ...launchConfiguration().skus[0]!,
            procurementCostCentavos: 0,
            markupBasisPoints: 0,
          },
        ],
      },
      "must resolve to a non-zero server-owned price",
    ],
  ])("rejects %s", async (_case, configuration, message) => {
    const service = new LaunchConfigurationService(new InMemoryLaunchConfigurationRepository());

    await expect(
      service.apply({
        actorUserId: "admin-1",
        idempotencyKey: "launch-1",
        correlationId: "correlation-1",
        appliedAt,
        configuration,
      }),
    ).rejects.toThrow(message);
  });
});

function launchConfiguration(): LaunchConfigurationInput {
  return {
    reason: " Approved staging launch manifest ",
    categories: [{ id: "fruit", name: "Fruit", slug: "fruit", active: true }],
    skus: [
      {
        id: "banana-kg",
        categoryId: "fruit",
        name: "Bananas",
        slug: "bananas",
        description: "Fresh bananas",
        unit: "kilogram",
        imageUrl: null,
        procurementCostCentavos: 10_000,
        markupBasisPoints: 2_500,
        priceEffectiveAt: appliedAt,
        active: true,
      },
    ],
    deliveryWindows: [
      {
        id: "window-1",
        cycleId: "cycle-2026-08-22",
        label: "Saturday morning",
        startsAt: "2026-08-22T00:00:00.000Z",
        endsAt: "2026-08-22T04:00:00.000Z",
        capacity: 50,
        active: true,
      },
    ],
  };
}
