import { DomainValidationError } from "./errors.js";
import { createMoney, type Money } from "./money.js";

export type PromotionStatus = "draft" | "scheduled" | "active" | "paused" | "expired" | "archived";
export type PromotionDiscount =
  | Readonly<{ kind: "fixed"; amount: Money }>
  | Readonly<{ kind: "percentage"; basisPoints: number; maximum: Money | null }>
  | Readonly<{ kind: "free_delivery" }>;

export type Promotion = Readonly<{
  id: string;
  code: string | null;
  version: number;
  status: PromotionStatus;
  startsAt: string;
  endsAt: string;
  discount: PromotionDiscount;
  minimumSubtotal: Money | null;
  planIds: readonly string[];
  skuIds: readonly string[];
  categoryIds: readonly string[];
  firstOrderOnly: boolean;
  firstWeekOnly: boolean;
  totalBudget: Money | null;
  totalRedemptions: number | null;
  perCustomerRedemptions: number | null;
  redeemedAmount: Money;
  redemptionCount: number;
  allowsStacking: boolean;
}>;

export type PromotionCartLine = Readonly<{
  skuId: string;
  categoryId: string | null;
  quantity: number;
  unitPrice: Money;
}>;
export type PromotionContext = Readonly<{
  now: string;
  subtotal: Money;
  deliveryFee: Money;
  planId: string;
  lines: readonly PromotionCartLine[];
  isFirstOrder: boolean;
  isFirstWeek: boolean;
  customerRedemptions: number;
}>;
export type PromotionResult = Readonly<{
  promotionId: string;
  discount: Money;
  deliveryFee: Money;
  reason: null | string;
}>;

export function normalizePromotionCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{1,31}$/.test(normalized)) {
    throw new DomainValidationError("INVALID_PROMOTION_CODE", "promotion code is invalid");
  }
  return normalized;
}

export function evaluatePromotion(
  promotion: Promotion,
  context: PromotionContext,
): PromotionResult {
  const inSchedule =
    Date.parse(context.now) >= Date.parse(promotion.startsAt) &&
    Date.parse(context.now) < Date.parse(promotion.endsAt);
  if (promotion.status !== "active" || !inSchedule)
    return rejected(promotion, context.deliveryFee, "promotion is not active");
  if (promotion.minimumSubtotal && context.subtotal.centavos < promotion.minimumSubtotal.centavos)
    return rejected(promotion, context.deliveryFee, "minimum subtotal was not met");
  if (promotion.planIds.length && !promotion.planIds.includes(context.planId))
    return rejected(promotion, context.deliveryFee, "promotion does not apply to this plan");
  if (
    promotion.skuIds.length &&
    !context.lines.some((line) => promotion.skuIds.includes(line.skuId))
  )
    return rejected(promotion, context.deliveryFee, "promotion does not apply to these products");
  if (
    promotion.categoryIds.length &&
    !context.lines.some(
      (line) => line.categoryId && promotion.categoryIds.includes(line.categoryId),
    )
  )
    return rejected(promotion, context.deliveryFee, "promotion does not apply to these categories");
  if (promotion.firstOrderOnly && !context.isFirstOrder)
    return rejected(promotion, context.deliveryFee, "promotion is limited to first orders");
  if (promotion.firstWeekOnly && !context.isFirstWeek)
    return rejected(promotion, context.deliveryFee, "promotion is limited to first weeks");
  if (
    promotion.totalRedemptions !== null &&
    promotion.redemptionCount >= promotion.totalRedemptions
  )
    return rejected(promotion, context.deliveryFee, "promotion redemption limit was reached");
  if (
    promotion.perCustomerRedemptions !== null &&
    context.customerRedemptions >= promotion.perCustomerRedemptions
  )
    return rejected(promotion, context.deliveryFee, "customer redemption limit was reached");
  const discount = calculateDiscount(promotion.discount, context.subtotal, context.deliveryFee);
  if (
    promotion.totalBudget &&
    promotion.redeemedAmount.centavos + discount.centavos > promotion.totalBudget.centavos
  )
    return rejected(promotion, context.deliveryFee, "promotion budget was exhausted");
  return {
    promotionId: promotion.id,
    discount,
    deliveryFee:
      promotion.discount.kind === "free_delivery"
        ? createMoney(0)
        : createMoney(context.deliveryFee.centavos),
    reason: null,
  };
}

function calculateDiscount(
  discount: PromotionDiscount,
  subtotal: Money,
  deliveryFee: Money,
): Money {
  if (discount.kind === "fixed")
    return createMoney(Math.min(subtotal.centavos, discount.amount.centavos));
  if (discount.kind === "free_delivery") return createMoney(deliveryFee.centavos);
  const calculated = Math.floor((subtotal.centavos * discount.basisPoints) / 10_000);
  return createMoney(Math.min(calculated, discount.maximum?.centavos ?? calculated));
}

function rejected(promotion: Promotion, deliveryFee: Money, reason: string): PromotionResult {
  return {
    promotionId: promotion.id,
    discount: createMoney(0),
    deliveryFee: createMoney(deliveryFee.centavos),
    reason,
  };
}
