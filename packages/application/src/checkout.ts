import {
  calculateCartTotals,
  createMoney,
  normalizePromotionCode,
  type Cart,
  type AppliedPromotionSnapshot,
  type Money,
  type Plan,
} from "@carbon/domain";

import { PromotionRedemptionService, type PromotionRepository } from "./promotions.js";

export type CheckoutQuote = Readonly<{
  originalSubtotal: Money;
  discount: Money;
  promotionCode: string | null;
  promotion: AppliedPromotionSnapshot | null;
  totals: ReturnType<typeof calculateCartTotals>;
}>;

export class CheckoutPricingService {
  constructor(private readonly promotions?: PromotionRepository) {}

  async quote(
    input: Readonly<{
      customerId: string;
      code?: string;
      cart: Cart;
      plan: Pick<Plan, "id" | "weeklyFee" | "weeklyCredit">;
      deliveryFee: Money;
      now: string;
      isFirstOrder?: boolean;
      isFirstWeek?: boolean;
      categoryIds?: ReadonlyMap<string, string>;
    }>,
  ): Promise<CheckoutQuote> {
    const original = calculateCartTotals({
      cart: input.cart,
      plan: input.plan,
      deliveryFee: input.deliveryFee,
    });
    let promotion: AppliedPromotionSnapshot | null = null;
    let promotionCode: string | null = null;
    if (input.code?.trim()) {
      if (!this.promotions) throw new Error("promotion service is unavailable");
      promotionCode = normalizePromotionCode(input.code);
      const service = new PromotionRedemptionService(this.promotions);
      const preview = await service.preview({
        customerId: input.customerId,
        code: promotionCode,
        context: {
          now: input.now,
          subtotal: original.subtotal,
          deliveryFee: input.deliveryFee,
          planId: input.plan.id,
          lines: input.cart.lines.map((line) => ({
            skuId: line.skuId,
            categoryId: input.categoryIds?.get(line.skuId) ?? null,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
          })),
          isFirstOrder: input.isFirstOrder ?? false,
          isFirstWeek: input.isFirstWeek ?? false,
        },
      });
      promotion = {
        id: preview.promotion.id,
        code: promotionCode,
        version: preview.promotion.version,
        discount: preview.result.discount,
        deliveryFee: preview.result.deliveryFee,
      };
    }
    const totals = calculateCartTotals({
      cart: input.cart,
      plan: input.plan,
      deliveryFee: promotion?.deliveryFee ?? input.deliveryFee,
      discount: promotion?.discount ?? createMoney(0),
    });
    return {
      originalSubtotal: original.subtotal,
      discount: promotion?.discount ?? createMoney(0),
      promotionCode,
      promotion,
      totals,
    };
  }
}
