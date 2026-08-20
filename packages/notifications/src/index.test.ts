import { describe, expect, it } from "vitest";
import { HttpNotificationTransport, InMemoryNotificationSender } from "./index.js";
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

describe("HTTP notification transport", () => {
  it("sends correlation and idempotency metadata", async () => {
    const requests: Request[] = [];
    const transport = new HttpNotificationTransport("https://notify.example.test/events", {
      fetch: (input, init) => {
        requests.push(new Request(input, init));
        return Promise.resolve(new Response(null, { status: 202 }));
      },
      token: "provider-token",
    });

    await transport.send({
      idempotencyKey: "outbox:event-1",
      eventType: "order.locked",
      aggregateId: "order-1",
      payloadJson: "{}",
      correlationId: "correlation-1",
    });

    expect(requests[0]?.headers.get("idempotency-key")).toBe("outbox:event-1");
    expect(requests[0]?.headers.get("x-correlation-id")).toBe("correlation-1");
    expect(requests[0]?.headers.get("authorization")).toBe("Bearer provider-token");
  });

  it("rejects insecure remote endpoints and provider failures", async () => {
    expect(() => new HttpNotificationTransport("http://notify.example.test/events")).toThrow(
      "must use HTTPS",
    );
    const transport = new HttpNotificationTransport("https://notify.example.test/events", {
      fetch: () => Promise.resolve(new Response(null, { status: 503 })),
    });
    await expect(
      transport.send({
        idempotencyKey: "event-1",
        eventType: "order.locked",
        aggregateId: "order-1",
        payloadJson: "{}",
        correlationId: "correlation-1",
      }),
    ).rejects.toThrow("status 503");
  });
});
