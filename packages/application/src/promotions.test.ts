import { describe, expect, it } from "vitest";
import { createMoney, type Promotion } from "@carbon/domain";
import {
  InMemoryPromotionRepository,
  PromotionRedemptionService,
  assertPromotionStacking,
} from "./promotions.js";

const promotion: Promotion = {
  id: "promo-1",
  code: "WELCOME10",
  version: 1,
  status: "active",
  startsAt: "2026-08-01T00:00:00.000Z",
  endsAt: "2026-09-01T00:00:00.000Z",
  discount: { kind: "fixed", amount: createMoney(5000) },
  minimumSubtotal: null,
  planIds: [],
  skuIds: [],
  categoryIds: [],
  firstOrderOnly: false,
  firstWeekOnly: false,
  totalBudget: null,
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
  lines: [],
  isFirstOrder: true,
  isFirstWeek: true,
} as const;

describe("promotion redemption", () => {
  it("replays the same redemption and rejects conflicting key reuse", async () => {
    const service = new PromotionRedemptionService(
      new InMemoryPromotionRepository([promotion]),
      () => "redemption-1",
    );
    const input = {
      customerId: "customer-1",
      code: "welcome10",
      idempotencyKey: "coupon-1",
      context,
    };
    await expect(service.apply(input)).resolves.toMatchObject({
      id: "redemption-1",
      result: { discount: createMoney(5000) },
    });
    await expect(service.apply(input)).resolves.toMatchObject({ id: "redemption-1" });
    await expect(service.apply({ ...input, code: "OTHER" })).rejects.toThrow(
      "different promotion request",
    );
  });
  it("enforces per-customer redemption limits", async () => {
    const service = new PromotionRedemptionService(new InMemoryPromotionRepository([promotion]));
    await service.apply({
      customerId: "customer-1",
      code: "WELCOME10",
      idempotencyKey: "coupon-1",
      context,
    });
    await expect(
      service.apply({
        customerId: "customer-1",
        code: "WELCOME10",
        idempotencyKey: "coupon-2",
        context,
      }),
    ).rejects.toThrow("customer redemption limit");
  });
  it("recovers a concurrent idempotent persistence race", async () => {
    const stored = {
      id: "redemption-race",
      promotionId: promotion.id,
      customerId: "customer-1",
      idempotencyKey: "coupon-race",
      requestFingerprint: JSON.stringify({
        customerId: "customer-1",
        code: "WELCOME10",
        context,
      }),
      result: {
        promotionId: promotion.id,
        discount: createMoney(5000),
        deliveryFee: createMoney(5000),
        reason: null,
      },
      createdAt: context.now,
    } as const;
    let lookupCount = 0;
    const repository = {
      findActiveByCode: () => Promise.resolve(promotion),
      findRedemption: () => Promise.resolve(++lookupCount === 1 ? null : stored),
      countCustomerRedemptions: () => Promise.resolve(0),
      saveRedemption: () => Promise.resolve(),
      saveRedemptionAndUpdatePromotion: () => Promise.reject(new Error("unique constraint")),
    };

    await expect(
      new PromotionRedemptionService(repository).apply({
        customerId: "customer-1",
        code: "welcome10",
        idempotencyKey: "coupon-race",
        context,
      }),
    ).resolves.toEqual(stored);
  });
  it("rejects non-stacking promotions", () =>
    expect(() => assertPromotionStacking([promotion, { ...promotion, id: "promo-2" }])).toThrow(
      "cannot be stacked",
    ));
});
