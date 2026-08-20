import { describe, expect, it } from "vitest";

import { InMemoryOutboxRepository } from "./outbox.js";

const event = {
  id: "outbox-1",
  eventType: "order.locked",
  aggregateId: "order-1",
  occurredAt: "2026-08-22T04:00:00.000Z",
  payloadJson: '{"id":"order-1"}',
  attempts: 0,
  publishedAt: null,
  claimedAt: null,
  claimToken: null,
  nextAttemptAt: null,
  lastError: null,
  deadLetteredAt: null,
} as const;

describe("outbox repository", () => {
  it("schedules deterministic events once", async () => {
    const repository = new InMemoryOutboxRepository();
    const event = {
      id: "payment-reconcile:2026-08-20",
      eventType: "payment.reconcile",
      aggregateId: "2026-08-20",
      occurredAt: "2026-08-21T00:00:00.000Z",
      payloadJson: "{}",
    };
    await repository.schedule(event);
    await repository.schedule(event);
    const claimed = await repository.claimPending({
      now: "2026-08-21T00:00:01.000Z",
      limit: 10,
      leaseSeconds: 300,
      claimToken: "claim-scheduled",
    });
    expect(claimed).toHaveLength(1);
  });

  it("claims an event once and marks successful delivery", async () => {
    const repository = new InMemoryOutboxRepository([event]);
    const input = {
      now: "2026-08-22T04:00:00.000Z",
      limit: 10,
      leaseSeconds: 300,
      claimToken: "claim-1",
    };
    const claimed = await repository.claimPending(input);
    expect(claimed).toMatchObject([{ id: "outbox-1", claimToken: "claim-1" }]);
    await expect(repository.claimPending({ ...input, claimToken: "claim-2" })).resolves.toEqual([]);
    await expect(
      repository.markPublished("outbox-1", "claim-1", "2026-08-22T04:00:05.000Z"),
    ).resolves.toBe(true);
    await expect(repository.claimPending(input)).resolves.toEqual([]);
  });

  it("keeps retry state and dead-letters after the attempt limit", async () => {
    const repository = new InMemoryOutboxRepository([event]);
    await repository.claimPending({
      now: "2026-08-22T04:00:00.000Z",
      limit: 1,
      leaseSeconds: 300,
      claimToken: "claim-1",
    });
    await expect(
      repository.markFailed("outbox-1", "claim-1", {
        now: "2026-08-22T04:00:00.000Z",
        error: "temporary failure",
        maxAttempts: 2,
        retryDelaySeconds: 30,
      }),
    ).resolves.toBe("retry");
    await expect(
      repository.markFailed("outbox-1", "claim-1", {
        now: "2026-08-22T04:00:30.000Z",
        error: "permanent failure",
        maxAttempts: 2,
        retryDelaySeconds: 30,
      }),
    ).resolves.toBe("dead_letter");
    await expect(
      repository.claimPending({
        now: "2026-08-22T05:00:00.000Z",
        limit: 1,
        leaseSeconds: 300,
        claimToken: "claim-3",
      }),
    ).resolves.toEqual([]);
  });
});
