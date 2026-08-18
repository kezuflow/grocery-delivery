import { DomainValidationError } from "./errors.js";
import { createMoney, type Money } from "./money.js";
import { createCart, type Cart, type CartTotals } from "./commerce.js";

export const ORDER_STATUSES = ["locked", "canceled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type LockedOrder = Readonly<{
  id: string;
  customerId: string;
  subscriptionId: string;
  planId: string;
  idempotencyKey: string;
  requestFingerprint: string;
  cart: Cart;
  weeklyCredit: Money;
  totals: CartTotals;
  status: "locked";
  lockedAt: string;
}>;

export function createLockedOrder(input: LockedOrder): LockedOrder {
  assertText(input.id, "order id");
  assertText(input.customerId, "order customer id");
  assertText(input.subscriptionId, "order subscription id");
  assertText(input.planId, "order plan id");
  assertText(input.idempotencyKey, "order idempotency key");
  assertText(input.requestFingerprint, "order request fingerprint");
  if (input.status !== "locked") {
    throw new DomainValidationError("INVALID_ORDER_STATUS", "new orders must be locked");
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

  return Object.freeze({
    ...input,
    cart: createCart(input.cart.lines),
    weeklyCredit: createMoney(input.weeklyCredit.centavos),
    totals: Object.freeze({
      ...input.totals,
      subtotal: createMoney(input.totals.subtotal.centavos),
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
