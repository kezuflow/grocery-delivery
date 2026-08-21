import { describe, expect, it } from "vitest";
import {
  customerOrderSubstitutionDecisionSchema,
  customerOrderSubstitutionsResponseSchema,
} from "./customer-substitutions";

describe("customer substitution contracts", () => {
  it("accepts server-owned proposals and bounded decisions", () => {
    expect(customerOrderSubstitutionDecisionSchema.parse({ decision: "accept" })).toEqual({
      decision: "accept",
    });
    expect(
      customerOrderSubstitutionsResponseSchema.parse({
        data: {
          substitutions: [
            {
              id: "substitution-1",
              customerId: "customer-1",
              orderId: "order-1",
              shortageId: "shortage-1",
              originalSkuId: "sku-1",
              procurementSubstitutionId: "procurement-substitution-1",
              substituteSkuId: "sku-2",
              quantity: 1,
              status: "pending",
              decidedAt: null,
              createdAt: "2026-08-21T00:00:00.000Z",
              updatedAt: "2026-08-21T00:00:00.000Z",
            },
          ],
        },
        meta: { correlationId: "correlation-1" },
      }).data.substitutions,
    ).toHaveLength(1);
  });
});
