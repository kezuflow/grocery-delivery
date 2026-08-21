import { describe, expect, it } from "vitest";
import { InMemoryCustomerOrderSubstitutionRepository } from "./customer-substitutions.js";

describe("customer order substitution repository", () => {
  it("isolates customers and remembers an idempotent decision", async () => {
    const repository = new InMemoryCustomerOrderSubstitutionRepository([
      {
        id: "substitution-1",
        customerId: "customer-1",
        orderId: "order-1",
        shortageId: "shortage-1",
        originalSkuId: "sku-1",
        procurementSubstitutionId: "procurement-substitution-1",
        substituteSkuId: "sku-2",
        quantity: 1,
        status: "accepted",
        idempotencyKey: "decision-1",
        requestFingerprint: '{"decision":"accept"}',
        decidedAt: "2026-08-21T01:00:00.000Z",
        createdAt: "2026-08-21T00:00:00.000Z",
        updatedAt: "2026-08-21T01:00:00.000Z",
      },
    ]);
    await expect(repository.listByCustomer("customer-2")).resolves.toEqual([]);
    await expect(repository.findByIdempotency("customer-1", "decision-1")).resolves.toMatchObject({
      id: "substitution-1",
      status: "accepted",
    });
  });
});
