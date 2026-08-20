import { describe, expect, it } from "vitest";

import { parseOutboxProcessingMessage, resolveEventProcessorKind } from "./event-processing.js";

describe("event processing", () => {
  it("resolves server-owned notification, payment, and retention lanes", () => {
    expect(resolveEventProcessorKind("order.locked")).toBe("notification");
    expect(resolveEventProcessorKind("delivery.delivered")).toBe("notification");
    expect(resolveEventProcessorKind("payment.reconcile")).toBe("payment");
    expect(resolveEventProcessorKind("retention.expire-media")).toBe("retention");
    expect(() => resolveEventProcessorKind("admin.changed")).toThrow(
      "unsupported outbox event type",
    );
  });

  it("rejects incomplete, malformed, and unbounded messages", () => {
    expect(parseOutboxProcessingMessage(null)).toBeNull();
    expect(parseOutboxProcessingMessage({ outboxEventId: "event-1" })).toBeNull();
    expect(parseOutboxProcessingMessage(message({ payloadJson: "not-json" }))).toBeNull();
    expect(parseOutboxProcessingMessage(message({ eventType: "x".repeat(129) }))).toBeNull();
  });

  it("freezes a complete message without trusting extra fields", () => {
    const parsed = parseOutboxProcessingMessage(message({ unexpected: "ignored" }));
    expect(parsed).toEqual(message());
    expect(Object.isFrozen(parsed)).toBe(true);
  });
});

function message(overrides: Readonly<Record<string, unknown>> = {}) {
  return {
    outboxEventId: "event-1",
    eventType: "order.locked",
    aggregateId: "order-1",
    occurredAt: "2026-08-20T00:00:00.000Z",
    payloadJson: "{}",
    claimToken: "claim-1",
    correlationId: "correlation-1",
    ...overrides,
  };
}
