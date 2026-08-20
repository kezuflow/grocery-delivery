import { describe, expect, it } from "vitest";

import { createSubscription } from "@carbon/domain";
import {
  DefaultSubscriptionCommandService,
  DefaultSubscriptionCreationService,
  DefaultSubscriptionBillingService,
  InMemoryIdempotencyStore,
  InMemorySubscriptionRepository,
} from "./subscriptions.js";

describe("subscription command application", () => {
  const initial = createSubscription({
    id: "subscription-1",
    customerId: "customer-1",
    planId: "plan-small",
    status: "active",
    skippedCycleId: null,
    lastAction: null,
    createdAt: "2026-08-18T00:00:00.000Z",
    updatedAt: "2026-08-18T00:00:00.000Z",
  });

  it("replays the original result for the same idempotency key", async () => {
    const service = new DefaultSubscriptionCommandService(
      new InMemorySubscriptionRepository([initial]),
      new InMemoryIdempotencyStore(),
    );
    const input = {
      customerId: "customer-1",
      idempotencyKey: "request-1",
      command: {
        action: "pause" as const,
        cycleId: "cycle-1",
        cutoffAt: "2026-08-21T10:00:00.000Z",
        now: "2026-08-20T10:00:00.000Z",
      },
    };

    const first = await service.execute(input);
    const replay = await service.execute(input);

    expect(replay).toEqual(first);
  });

  it("rejects reuse of a key for a different command", async () => {
    const service = new DefaultSubscriptionCommandService(
      new InMemorySubscriptionRepository([initial]),
      new InMemoryIdempotencyStore(),
    );
    const input = {
      customerId: "customer-1",
      idempotencyKey: "request-1",
      command: {
        action: "pause" as const,
        cycleId: "cycle-1",
        cutoffAt: "2026-08-21T10:00:00.000Z",
        now: "2026-08-20T10:00:00.000Z",
      },
    };

    await service.execute(input);
    await expect(
      service.execute({ ...input, command: { ...input.command, action: "cancel" } }),
    ).rejects.toThrow("different command");
  });

  it("creates one active subscription from a server-selected plan and replays it", async () => {
    const repository = new InMemorySubscriptionRepository();
    const service = new DefaultSubscriptionCreationService(
      repository,
      new InMemoryIdempotencyStore(),
      { findActiveById: (planId) => Promise.resolve({ id: planId }) },
      () => "subscription-created-1",
    );
    const input = {
      customerId: "customer-1",
      planId: "plan-medium",
      idempotencyKey: "create-1",
      now: "2026-08-20T10:00:00.000Z",
    };

    const first = await service.execute(input);
    const replay = await service.execute(input);

    expect(first.status).toBe("active");
    expect(first.planId).toBe("plan-medium");
    expect(replay).toEqual(first);
  });

  it("rejects a second subscription and conflicting idempotency reuse", async () => {
    const service = new DefaultSubscriptionCreationService(
      new InMemorySubscriptionRepository(),
      new InMemoryIdempotencyStore(),
      { findActiveById: (planId) => Promise.resolve({ id: planId }) },
      () => "subscription-created-2",
    );
    await service.execute({
      customerId: "customer-1",
      planId: "plan-small",
      idempotencyKey: "create-2",
      now: "2026-08-20T10:00:00.000Z",
    });
    await expect(
      service.execute({
        customerId: "customer-1",
        planId: "plan-large",
        idempotencyKey: "create-2",
        now: "2026-08-20T10:00:00.000Z",
      }),
    ).rejects.toThrow("different command");
    await expect(
      service.execute({
        customerId: "customer-1",
        planId: "plan-large",
        idempotencyKey: "create-3",
        now: "2026-08-20T10:00:00.000Z",
      }),
    ).rejects.toThrow("already has a subscription");
  });

  it("rejects an inactive or unknown plan before persistence", async () => {
    const service = new DefaultSubscriptionCreationService(
      new InMemorySubscriptionRepository(),
      new InMemoryIdempotencyStore(),
      { findActiveById: () => Promise.resolve(null) },
    );

    await expect(
      service.execute({
        customerId: "customer-1",
        planId: "plan-retired",
        idempotencyKey: "create-retired",
        now: "2026-08-20T10:00:00.000Z",
      }),
    ).rejects.toThrow("plan is unavailable");
  });

  it("changes plans only after resolving the active server-owned plan", async () => {
    const service = new DefaultSubscriptionCommandService(
      new InMemorySubscriptionRepository([initial]),
      new InMemoryIdempotencyStore(),
      {
        findActiveById: (planId) =>
          Promise.resolve(planId === "plan-medium" ? { id: planId } : null),
      },
    );
    const input = {
      customerId: "customer-1",
      idempotencyKey: "change-plan-1",
      command: {
        action: "change-plan" as const,
        planId: "plan-medium",
        cycleId: "cycle-2026-08-22",
        cutoffAt: "2026-08-21T10:00:00.000Z",
        now: "2026-08-20T10:00:00.000Z",
      },
    };

    await expect(service.execute(input)).resolves.toMatchObject({
      planId: "plan-medium",
      effectiveCycleId: "cycle-2026-08-22",
    });
    await expect(
      service.execute({
        ...input,
        idempotencyKey: "change-plan-2",
        command: { ...input.command, planId: "plan-retired" },
      }),
    ).rejects.toThrow("plan is unavailable");
  });

  it("records past-due billing transitions idempotently", async () => {
    const service = new DefaultSubscriptionBillingService(
      new InMemorySubscriptionRepository([initial]),
      new InMemoryIdempotencyStore(),
    );
    const input = {
      customerId: "customer-1",
      billingStatus: "past_due" as const,
      idempotencyKey: "billing-1",
      now: "2026-08-20T10:00:00.000Z",
    };

    await expect(service.execute(input)).resolves.toMatchObject({ billingStatus: "past_due" });
    await expect(service.execute(input)).resolves.toMatchObject({ billingStatus: "past_due" });
  });
});
