import { describe, expect, it } from "vitest";

import { InMemoryOutboxRepository } from "@carbon/db";
import { createReconciliationJob } from "./index.js";
import { createOutboxDispatcher, createOutboxQueueHandler } from "./index.js";

describe("reconciliation job adapter", () => {
  it("adds a deterministic job timestamp before invoking the billing runner", async () => {
    const calls: unknown[] = [];
    const job = createReconciliationJob(
      {
        run: (input) => {
          calls.push(input);
          return Promise.resolve({
            providerName: "fake",
            from: input.from,
            to: input.to,
            providerEntryCount: 0,
            discrepancyCount: 0,
            discrepancies: [],
          });
        },
      },
      () => new Date("2026-08-21T00:00:00.000Z"),
    );

    await expect(
      job({ from: "2026-08-20T00:00:00.000Z", to: "2026-08-20T23:59:59.000Z" }),
    ).resolves.toMatchObject({ providerName: "fake" });
    expect(calls).toEqual([
      {
        from: "2026-08-20T00:00:00.000Z",
        to: "2026-08-20T23:59:59.000Z",
        now: "2026-08-21T00:00:00.000Z",
      },
    ]);
  });
});

describe("outbox job adapter", () => {
  it("queues claimed events and marks them published after processing", async () => {
    const repository = new InMemoryOutboxRepository([createOutboxEvent()]);
    const messages: unknown[] = [];
    const dispatcher = createOutboxDispatcher(
      repository,
      {
        send: (message) => {
          messages.push(message);
          return Promise.resolve();
        },
      },
      {
        now: () => new Date("2026-08-22T04:00:00.000Z"),
        generateClaimToken: () => "claim-1",
        correlationId: "request-1",
      },
    );
    await expect(dispatcher.dispatch()).resolves.toEqual({ claimed: 1, queued: 1, failed: 0 });
    expect(messages).toHaveLength(1);
    const message = messages[0] as {
      outboxEventId: string;
      claimToken: string;
      correlationId: string;
    };
    let acknowledged = false;
    let processed = 0;
    const handler = createOutboxQueueHandler(
      repository,
      (job) => {
        expect(job.outboxEventId).toBe("outbox-1");
        processed += 1;
        return Promise.resolve();
      },
      { now: () => new Date("2026-08-22T04:00:05.000Z") },
    );
    await handler({
      messages: [
        {
          body: {
            ...message,
            eventType: "order.locked",
            aggregateId: "order-1",
            occurredAt: "2026-08-22T04:00:00.000Z",
            payloadJson: "{}",
          },
          attempts: 1,
          ack: () => {
            acknowledged = true;
          },
          retry: () => undefined,
        },
      ],
    });
    expect(acknowledged).toBe(true);
    await handler({
      messages: [
        {
          body: {
            ...message,
            eventType: "order.locked",
            aggregateId: "order-1",
            occurredAt: "2026-08-22T04:00:00.000Z",
            payloadJson: "{}",
          },
          attempts: 2,
          ack: () => undefined,
          retry: () => undefined,
        },
      ],
    });
    expect(processed).toBe(1);
    await expect(dispatcher.dispatch()).resolves.toEqual({ claimed: 0, queued: 0, failed: 0 });
  });

  it("acknowledges an exhausted job after recording dead-letter state", async () => {
    const repository = new InMemoryOutboxRepository([createOutboxEvent()]);
    await repository.claimPending({
      now: "2026-08-22T04:00:00.000Z",
      limit: 1,
      leaseSeconds: 300,
      claimToken: "claim-1",
    });
    let acknowledged = false;
    let retried = false;
    const handler = createOutboxQueueHandler(
      repository,
      () => Promise.reject(new Error("permanent failure")),
      {
        now: () => new Date("2026-08-22T04:00:00.000Z"),
        maxAttempts: 1,
      },
    );
    await handler({
      messages: [
        {
          body: createOutboxMessage("claim-1"),
          attempts: 1,
          ack: () => {
            acknowledged = true;
          },
          retry: () => {
            retried = true;
          },
        },
      ],
    });
    expect(acknowledged).toBe(true);
    expect(retried).toBe(false);
  });

  it("replays a dead-lettered event and preserves its original idempotency identity", async () => {
    const repository = new InMemoryOutboxRepository([createOutboxEvent()]);
    await repository.claimPending({
      now: "2026-08-22T04:00:00.000Z",
      limit: 1,
      leaseSeconds: 300,
      claimToken: "claim-1",
    });
    const handler = createOutboxQueueHandler(
      repository,
      () => Promise.reject(new Error("provider unavailable")),
      { now: () => new Date("2026-08-22T04:00:00.000Z"), maxAttempts: 1 },
    );
    await handler({
      messages: [
        {
          body: createOutboxMessage("claim-1"),
          attempts: 1,
          ack: () => undefined,
          retry: () => undefined,
        },
      ],
    });
    await repository.replayDeadLettered("outbox-1", "2026-08-22T04:05:00.000Z");
    const [replayed] = await repository.claimPending({
      now: "2026-08-22T04:05:00.000Z",
      limit: 1,
      leaseSeconds: 300,
      claimToken: "claim-2",
    });
    expect(replayed?.id).toBe("outbox-1");
  });
});

function createOutboxEvent() {
  return {
    id: "outbox-1",
    eventType: "order.locked",
    aggregateId: "order-1",
    occurredAt: "2026-08-22T04:00:00.000Z",
    payloadJson: "{}",
    attempts: 0,
    publishedAt: null,
    claimedAt: null,
    claimToken: null,
    nextAttemptAt: null,
    lastError: null,
    deadLetteredAt: null,
  } as const;
}

function createOutboxMessage(claimToken: string) {
  return {
    outboxEventId: "outbox-1",
    eventType: "order.locked",
    aggregateId: "order-1",
    occurredAt: "2026-08-22T04:00:00.000Z",
    payloadJson: "{}",
    claimToken,
    correlationId: "request-1",
  } as const;
}
