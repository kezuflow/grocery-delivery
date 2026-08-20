import { describe, expect, it } from "vitest";
import { createDeliveryEvent } from "./delivery-events.js";

describe("delivery events", () => {
  it("validates immutable event input", () => {
    const event = {
      id: "event-1",
      clientEventId: "client-event-1",
      assignmentId: "assignment-1",
      orderId: "order-1",
      deliverymanUserId: "driver-1",
      type: "picked_up" as const,
      occurredAt: "2026-08-22T04:00:00.000Z",
      receivedAt: "2026-08-22T04:01:00.000Z",
      note: null,
      failureReason: null,
    };
    expect(createDeliveryEvent(event)).toMatchObject(event);
    expect(() => createDeliveryEvent({ ...event, type: "unknown" as never })).toThrow("event type");
    expect(() => createDeliveryEvent({ ...event, type: "failed" })).toThrow("require a reason");
    expect(() => createDeliveryEvent({ ...event, failureReason: "customer_unavailable" })).toThrow(
      "only failed deliveries",
    );
  });
});
