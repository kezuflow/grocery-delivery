import { describe, expect, it } from "vitest";

import {
  launchConfigurationApplyRequestSchema,
  launchConfigurationResponseSchema,
} from "./launch-configuration.js";

describe("launch configuration contracts", () => {
  it("accepts a bounded manifest without a client-owned final price", () => {
    const parsed = launchConfigurationApplyRequestSchema.parse(launchConfiguration());

    expect(parsed.skus[0]).not.toHaveProperty("price");
    expect(parsed).toMatchObject({
      categories: [{ id: "fruit" }],
      skus: [{ procurementCostCentavos: 10_000, markupBasisPoints: 2_500 }],
      deliveryWindows: [{ capacity: 50 }],
    });
  });

  it("rejects client-owned final prices and malformed windows", () => {
    const input = launchConfiguration();
    expect(() =>
      launchConfigurationApplyRequestSchema.parse({
        ...input,
        skus: [{ ...input.skus[0], price: { centavos: 1, currency: "PHP" } }],
      }),
    ).toThrow();
    expect(() =>
      launchConfigurationApplyRequestSchema.parse({
        ...input,
        deliveryWindows: [{ ...input.deliveryWindows[0], capacity: 0 }],
      }),
    ).toThrow();
  });

  it("validates the applied configuration response", () => {
    expect(
      launchConfigurationResponseSchema.parse({
        data: {
          idempotencyKey: "launch-1",
          categoryCount: 1,
          skuCount: 1,
          deliveryWindowCount: 1,
          appliedAt: "2026-08-21T08:00:00.000Z",
          replayed: false,
        },
        meta: { correlationId: "correlation-1" },
      }),
    ).toBeDefined();
  });
});

function launchConfiguration() {
  return {
    reason: "Approved staging launch manifest",
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
        priceEffectiveAt: "2026-08-21T08:00:00.000Z",
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
  } as const;
}
