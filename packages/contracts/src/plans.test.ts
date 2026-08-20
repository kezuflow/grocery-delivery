import { describe, expect, it } from "vitest";

import {
  orderCreateRequestSchema,
  orderResponseSchema,
  planAdminUpsertRequestSchema,
  plansListResponseSchema,
  subscriptionCreateRequestSchema,
  subscriptionActionRequestSchema,
} from "./plans.js";

describe("plan contracts", () => {
  it("accepts a public plan list with PHP fee and credit", () => {
    expect(
      plansListResponseSchema.parse({
        data: {
          plans: [
            {
              id: "plan-small",
              code: "family-box",
              name: "Family Box",
              weeklyFee: { centavos: 199_900, currency: "PHP" },
              weeklyCredit: { centavos: 199_900, currency: "PHP" },
              displayOrder: 10,
              active: true,
            },
          ],
        },
        meta: { correlationId: "plans-request" },
      }),
    ).toBeDefined();
  });

  it("accepts administrator plan settings with custom slugs", () => {
    expect(
      planAdminUpsertRequestSchema.parse({
        code: "family-box",
        name: "Family Box",
        weeklyFee: { centavos: 199_900, currency: "PHP" },
        weeklyCredit: { centavos: 210_000, currency: "PHP" },
        displayOrder: 5,
        active: true,
      }),
    ).toMatchObject({ code: "family-box" });
  });

  it("accepts only a server-resolved plan identifier for subscription creation", () => {
    expect(subscriptionCreateRequestSchema.parse({ planId: "plan-small" })).toEqual({
      planId: "plan-small",
    });
    expect(
      subscriptionCreateRequestSchema.parse({ planId: "plan-small", weeklyFeeCentavos: 1 }),
    ).toEqual({ planId: "plan-small" });
  });

  it("accepts plan changes without browser prices or customer ownership", () => {
    expect(
      subscriptionActionRequestSchema.parse({ action: "change-plan", planId: "plan-medium" }),
    ).toEqual({ action: "change-plan", planId: "plan-medium" });
    expect(() =>
      subscriptionActionRequestSchema.parse({
        action: "change-plan",
        planId: "plan-medium",
        customerId: "customer-from-browser",
        weeklyFeeCentavos: 1,
      }),
    ).not.toThrow();
    expect(
      subscriptionActionRequestSchema.parse({
        action: "change-plan",
        planId: "plan-medium",
        weeklyFeeCentavos: 1,
      }),
    ).toEqual({ action: "change-plan", planId: "plan-medium" });
  });

  it("accepts an order request and immutable order response", () => {
    expect(
      orderCreateRequestSchema.parse({
        lines: [{ skuId: "sku-bananas", quantity: 2 }],
      }),
    ).toEqual({ lines: [{ skuId: "sku-bananas", quantity: 2 }] });
    expect(
      orderResponseSchema.parse({
        data: {
          id: "order-1",
          subscriptionId: "subscription-1",
          planId: "plan-small",
          lines: [
            { skuId: "sku-bananas", quantity: 2, unitPrice: { centavos: 12_500, currency: "PHP" } },
          ],
          weeklyCredit: { centavos: 69_900, currency: "PHP" },
          totals: {
            subtotal: { centavos: 25_000, currency: "PHP" },
            weeklyFee: { centavos: 69_900, currency: "PHP" },
            includedCredit: { centavos: 25_000, currency: "PHP" },
            overage: { centavos: 0, currency: "PHP" },
            deliveryFee: { centavos: 5_000, currency: "PHP" },
            totalDue: { centavos: 74_900, currency: "PHP" },
          },
          status: "locked",
          lockedAt: "2026-08-20T10:00:00.000Z",
        },
        meta: { correlationId: "order-request" },
      }),
    ).toBeDefined();
  });
});
