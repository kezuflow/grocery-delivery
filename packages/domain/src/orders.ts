import { DomainValidationError } from "./errors.js";
import { createMoney, type Money } from "./money.js";
import { createCart, type Cart, type CartTotals } from "./commerce.js";
import type { DeliveryAddress, DeliveryWindow } from "./delivery.js";

export const ORDER_STATUSES = ["locked", "canceled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type AppliedPromotionSnapshot = Readonly<{
  id: string;
  code: string;
  version: number;
  discount: Money;
  deliveryFee: Money;
}>;

export type PaymentState = "unpaid" | "pending" | "paid" | "failed";

export type LockedOrder = Readonly<{
  id: string;
  customerId: string;
  subscriptionId: string;
  planId: string;
  cycleId: string;
  idempotencyKey: string;
  requestFingerprint: string;
  cart: Cart;
  weeklyCredit: Money;
  totals: CartTotals;
  appliedPromotion?: AppliedPromotionSnapshot | null;
  deliveryAddress?: DeliveryAddress | null;
  deliveryWindow?: DeliveryWindow | null;
  paymentState?: PaymentState;
  status: OrderStatus;
  lockedAt: string;
}>;

export function createLockedOrder(input: LockedOrder): LockedOrder {
  assertText(input.id, "order id");
  assertText(input.customerId, "order customer id");
  assertText(input.subscriptionId, "order subscription id");
  assertText(input.planId, "order plan id");
  assertText(input.cycleId, "order cycle id");
  assertText(input.idempotencyKey, "order idempotency key");
  assertText(input.requestFingerprint, "order request fingerprint");
  if (input.status !== "locked" && input.status !== "canceled") {
    throw new DomainValidationError("INVALID_ORDER_STATUS", "order status is invalid");
  }
  if (
    Number.isNaN(Date.parse(input.lockedAt)) ||
    new Date(input.lockedAt).toISOString() !== input.lockedAt
  ) {
    throw new DomainValidationError("INVALID_TIMESTAMP", "order lockedAt must be an ISO timestamp");
  }
  if (input.weeklyCredit.currency !== "PHP" || input.weeklyCredit.centavos < 0) {
    throw new DomainValidationError("INVALID_ORDER_MONEY", "order weekly credit must be PHP");
  }
  if (input.appliedPromotion) {
    assertText(input.appliedPromotion.id, "promotion id");
    assertText(input.appliedPromotion.code, "promotion code");
    if (
      !Number.isSafeInteger(input.appliedPromotion.version) ||
      input.appliedPromotion.version < 1
    ) {
      throw new DomainValidationError(
        "INVALID_PROMOTION_VERSION",
        "promotion version must be positive",
      );
    }
  }
  if (input.paymentState && !["unpaid", "pending", "paid", "failed"].includes(input.paymentState)) {
    throw new DomainValidationError("INVALID_PAYMENT_STATE", "order payment state is invalid");
  }

  return Object.freeze({
    ...input,
    cart: createCart(input.cart.lines),
    weeklyCredit: createMoney(input.weeklyCredit.centavos),
    appliedPromotion: input.appliedPromotion
      ? Object.freeze({
          ...input.appliedPromotion,
          discount: createMoney(input.appliedPromotion.discount.centavos),
          deliveryFee: createMoney(input.appliedPromotion.deliveryFee.centavos),
        })
      : null,
    deliveryAddress: input.deliveryAddress ? Object.freeze({ ...input.deliveryAddress }) : null,
    deliveryWindow: input.deliveryWindow ? Object.freeze({ ...input.deliveryWindow }) : null,
    paymentState: input.paymentState ?? "unpaid",
    totals: Object.freeze({
      ...input.totals,
      subtotal: createMoney(input.totals.subtotal.centavos),
      discount: createMoney(input.totals.discount?.centavos ?? 0),
      weeklyFee: createMoney(input.totals.weeklyFee.centavos),
      includedCredit: createMoney(input.totals.includedCredit.centavos),
      overage: createMoney(input.totals.overage.centavos),
      deliveryFee: createMoney(input.totals.deliveryFee.centavos),
      totalDue: createMoney(input.totals.totalDue.centavos),
    }),
  });
}

function assertText(value: string, field: string): void {
  if (!value.trim()) {
    throw new DomainValidationError("INVALID_ORDER_TEXT", `${field} must not be empty`);
  }
}
