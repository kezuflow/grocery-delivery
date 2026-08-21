import { describe, expect, it } from "vitest";
import { createCustomerOrderRequest } from "@carbon/domain";
import { InMemoryCustomerOrderRequestRepository } from "./order-requests.js";

describe("customer order request repository", () => {
  it("scopes and replays requests by customer and idempotency key", async () => {
    const request = createCustomerOrderRequest({
      id: "request-1",
      customerId: "customer-1",
      orderId: "order-1",
      kind: "cancellation",
      reason: "I no longer need this order",
      status: "pending",
      idempotencyKey: "request-key-1",
      requestFingerprint: '{"orderId":"order-1"}',
      createdAt: "2026-08-20T10:00:00.000Z",
      updatedAt: "2026-08-20T10:00:00.000Z",
    });
    const repository = new InMemoryCustomerOrderRequestRepository([request]);
    await expect(repository.findByIdempotency("customer-1", "request-key-1")).resolves.toEqual(
      request,
    );
    await expect(repository.findByIdempotency("customer-2", "request-key-1")).resolves.toBeNull();
    await expect(repository.listByCustomer("customer-1")).resolves.toEqual([request]);
  });
});
