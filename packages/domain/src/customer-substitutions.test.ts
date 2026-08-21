import { describe, expect, it } from "vitest";
import { createCustomerOrderSubstitution } from "./customer-substitutions.js";

describe("customer order substitutions", () => {
  it("validates pending and completed customer decisions", () => {
    const proposal = createCustomerOrderSubstitution({
      id: "customer-substitution-1",
      customerId: "customer-1",
      orderId: "order-1",
      shortageId: "shortage-1",
      originalSkuId: "sku-1",
      procurementSubstitutionId: "procurement-substitution-1",
      substituteSkuId: "sku-2",
      quantity: 1,
      status: "pending",
      idempotencyKey: null,
      requestFingerprint: null,
      decidedAt: null,
      createdAt: "2026-08-21T00:00:00.000Z",
      updatedAt: "2026-08-21T00:00:00.000Z",
    });
    expect(proposal.status).toBe("pending");
    expect(() =>
      createCustomerOrderSubstitution({
        ...proposal,
        status: "accepted",
        decidedAt: null,
      }),
    ).toThrow("pending substitutions cannot have a decision timestamp");
  });
});
