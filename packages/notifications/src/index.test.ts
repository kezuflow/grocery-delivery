import { describe, expect, it } from "vitest";
import { InMemoryNotificationSender } from "./index.js";
import { InMemoryIdentityEmailSender } from "./index.js";

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

describe("identity email delivery", () => {
  it("deduplicates retried verification and reset messages", async () => {
    const sender = new InMemoryIdentityEmailSender();
    const message = {
      idempotencyKey: "verification-1",
      recipient: "customer@example.com",
      type: "email_verification" as const,
      actionUrl: "https://api.example.test/api/auth/verify-email?token=opaque",
    };
    await sender.send(message);
    await sender.send(message);
    await sender.send({ ...message, idempotencyKey: "reset-1", type: "password_reset" });

    expect(sender.messages).toHaveLength(2);
    expect(sender.messages[0]?.actionUrl).toContain("token=opaque");
  });
});
