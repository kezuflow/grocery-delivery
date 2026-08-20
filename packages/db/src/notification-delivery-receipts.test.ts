import { describe, expect, it } from "vitest";
import { InMemoryNotificationDeliveryReceiptRepository } from "./notification-delivery-receipts.js";

describe("notification delivery receipts", () => {
  it("keeps the first provider receipt for an idempotent retry", async () => {
    const repository = new InMemoryNotificationDeliveryReceiptRepository();
    const receipt = {
      idempotencyKey: "outbox:event-1",
      eventType: "delivery.delivered",
      aggregateId: "order-1",
      correlationId: "correlation-1",
      providerReference: "provider-1",
      acceptedAt: "2026-08-22T04:00:00.000Z",
    };
    await repository.save(receipt);
    await expect(repository.save({ ...receipt, providerReference: "provider-2" })).resolves.toEqual(
      receipt,
    );
  });
});
