import { describe, expect, it } from "vitest";

import { createCart, createCartLine, createMoney, type Promotion } from "@carbon/domain";

import { CheckoutPricingService } from "./checkout.js";
import { InMemoryPromotionRepository } from "./promotions.js";

const promotion: Promotion = {
  id: "promotion-1",
  code: "WELCOME10",
  version: 3,
  status: "active",
  startsAt: "2026-08-01T00:00:00.000Z",
  endsAt: "2026-09-01T00:00:00.000Z",
  discount: { kind: "fixed", amount: createMoney(5_000) },
  minimumSubtotal: null,
  planIds: [],
  skuIds: [],
  categoryIds: [],
  firstOrderOnly: false,
  firstWeekOnly: false,
  totalBudget: null,
  totalRedemptions: null,
  perCustomerRedemptions: null,
  redeemedAmount: createMoney(0),
  redemptionCount: 0,
  allowsStacking: false,
};

describe("checkout pricing", () => {
  it("previews a promotion without creating a redemption", async () => {
    const repository = new InMemoryPromotionRepository([promotion]);
    const quote = await new CheckoutPricingService(repository).quote({
      customerId: "customer-1",
      code: "welcome10",
      cart: createCart([
        createCartLine({ skuId: "sku-1", quantity: 1, unitPrice: createMoney(30_000) }),
      ]),
      plan: { id: "plan-1", weeklyFee: createMoney(10_000), weeklyCredit: createMoney(20_000) },
      deliveryFee: createMoney(5_000),
      now: "2026-08-20T10:00:00.000Z",
    });

    expect(quote.promotion).toMatchObject({ id: "promotion-1", version: 3 });
    expect(quote.totals.discount?.centavos).toBe(5_000);
    await expect(repository.findRedemption("customer-1", "checkout-1")).resolves.toBeNull();
  });

  it("returns the original server total when no code is supplied", async () => {
    const quote = await new CheckoutPricingService().quote({
      customerId: "customer-1",
      cart: createCart([
        createCartLine({ skuId: "sku-1", quantity: 1, unitPrice: createMoney(30_000) }),
      ]),
      plan: { id: "plan-1", weeklyFee: createMoney(10_000), weeklyCredit: createMoney(20_000) },
      deliveryFee: createMoney(5_000),
      now: "2026-08-20T10:00:00.000Z",
    });

    expect(quote.promotion).toBeNull();
    expect(quote.totals.totalDue.centavos).toBe(25_000);
  });
});
