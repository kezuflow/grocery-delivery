import { describe, expect, it } from "vitest";

import { createSubscription } from "@carbon/domain";
import {
  DefaultSubscriptionCommandService,
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
});
