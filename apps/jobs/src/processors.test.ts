import { describe, expect, it } from "vitest";

import {
  createEventProcessorRouter,
  resolveEventProcessorKind,
  type OutboxJobMessage,
} from "./index.js";

const message = (eventType: string): OutboxJobMessage => ({
  outboxEventId: `event-${eventType}`,
  eventType,
  aggregateId: "aggregate-1",
  occurredAt: "2026-08-20T00:00:00.000Z",
  payloadJson: "{}",
  claimToken: "claim-1",
  correlationId: "correlation-1",
});

describe("outbox processor routing", () => {
  it("classifies notification, payment, and retention lanes", () => {
    expect(resolveEventProcessorKind("order.locked")).toBe("notification");
    expect(resolveEventProcessorKind("payment.failed")).toBe("payment");
    expect(resolveEventProcessorKind("retention.expire-media")).toBe("retention");
    expect(() => resolveEventProcessorKind("unknown.event")).toThrow(
      "unsupported outbox event type",
    );
  });

  it("invokes only the lane selected by the event type", async () => {
    const calls: string[] = [];
    const route = createEventProcessorRouter({
      notification: (input) => {
        calls.push(`notification:${input.outboxEventId}`);
        return Promise.resolve();
      },
      payment: (input) => {
        calls.push(`payment:${input.outboxEventId}`);
        return Promise.resolve();
      },
      retention: (input) => {
        calls.push(`retention:${input.outboxEventId}`);
        return Promise.resolve();
      },
    });
    await route(message("payment.succeeded"));
    expect(calls).toEqual(["payment:event-payment.succeeded"]);
  });
});
