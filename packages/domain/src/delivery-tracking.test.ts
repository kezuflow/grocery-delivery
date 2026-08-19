import { describe, expect, it } from "vitest";
import { createDeliveryTracking } from "./delivery-tracking.js";

describe("delivery tracking", () => {
  it("freezes a customer-scoped tracking snapshot", () => {
    const tracking = createDeliveryTracking({
      orderId: "order-1",
      customerId: "customer-1",
      assignmentId: null,
      windowId: null,
      status: "pending",
      latestEventType: null,
      events: [],
    });
    expect(Object.isFrozen(tracking)).toBe(true);
    expect(tracking.events).toEqual([]);
  });

  it("rejects empty ownership identifiers", () => {
    expect(() =>
      createDeliveryTracking({
        orderId: "",
        customerId: "customer-1",
        assignmentId: null,
        windowId: null,
        status: "pending",
        latestEventType: null,
        events: [],
      }),
    ).toThrow("tracking order id");
  });
});
