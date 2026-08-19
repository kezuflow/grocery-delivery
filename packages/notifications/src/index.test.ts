import { describe, expect, it } from "vitest";
import { InMemoryNotificationSender } from "./index.js";

describe("notification sender", () => {
  it("deduplicates retries by idempotency key", async () => {
    const sender = new InMemoryNotificationSender();
    const notification = {
      id: "notification-1",
      idempotencyKey: "delivery-event:event-1",
      customerId: "customer-1",
      orderId: "order-1",
      type: "delivery_update" as const,
      eventType: "delivered" as const,
      occurredAt: "2026-08-22T04:00:00.000Z",
    };
    await sender.send(notification);
    await sender.send(notification);
    expect(sender.notifications).toHaveLength(1);
  });
});
