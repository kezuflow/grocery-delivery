import { describe, expect, it } from "vitest";

import { createMoney } from "./money.js";
import { evaluatePromotion, normalizePromotionCode, type Promotion } from "./promotions.js";

const base: Promotion = {
  id: "promo-1",
  code: "WELCOME10",
  version: 1,
  status: "active",
  startsAt: "2026-08-01T00:00:00.000Z",
  endsAt: "2026-09-01T00:00:00.000Z",
  discount: { kind: "percentage", basisPoints: 1000, maximum: createMoney(5000) },
  minimumSubtotal: createMoney(10000),
  planIds: [],
  skuIds: [],
  categoryIds: [],
  firstOrderOnly: false,
  firstWeekOnly: false,
  totalBudget: createMoney(100000),
  totalRedemptions: 10,
  perCustomerRedemptions: 1,
  redeemedAmount: createMoney(0),
  redemptionCount: 0,
  allowsStacking: false,
};
const context = {
  now: "2026-08-20T10:00:00.000Z",
  subtotal: createMoney(30000),
  deliveryFee: createMoney(5000),
  planId: "plan-1",
  lines: [{ skuId: "sku-1", categoryId: "cat-1", quantity: 1, unitPrice: createMoney(30000) }],
  isFirstOrder: true,
  isFirstWeek: true,
  customerRedemptions: 0,
} as const;

describe("promotions", () => {
  it("calculates capped percentage savings server-side", () =>
    expect(evaluatePromotion(base, context)).toMatchObject({
      discount: createMoney(3000),
      deliveryFee: createMoney(5000),
      reason: null,
    }));
  it("enforces schedule, eligibility, limits, and budget", () => {
    expect(evaluatePromotion({ ...base, status: "paused" }, context).reason).toContain(
      "not active",
    );
    expect(
      evaluatePromotion({ ...base, firstOrderOnly: true }, { ...context, isFirstOrder: false })
        .reason,
    ).toContain("first orders");
    expect(
      evaluatePromotion(
        { ...base, perCustomerRedemptions: 1 },
        { ...context, customerRedemptions: 1 },
      ).reason,
    ).toContain("customer redemption");
    expect(
      evaluatePromotion({ ...base, totalBudget: createMoney(1000) }, context).reason,
    ).toContain("budget");
  });
  it("normalizes safe coupon codes", () => {
    expect(normalizePromotionCode(" welcome-10 ")).toBe("WELCOME-10");
    expect(() => normalizePromotionCode("bad code")).toThrow("invalid");
  });
});
