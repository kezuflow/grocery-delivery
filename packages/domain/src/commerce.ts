import { DomainValidationError } from "./errors.js";
import { addMoney, createMoney, multiplyMoney, type Money } from "./money.js";
import type { Plan } from "./plans.js";

export type CartLine = Readonly<{
  skuId: string;
  quantity: number;
  /** The catalog price copied into the cart at add time. */
  unitPrice: Money;
}>;

export type Cart = Readonly<{
  lines: readonly CartLine[];
}>;

export type CartTotals = Readonly<{
  subtotal: Money;
  discount?: Money;
  weeklyFee: Money;
  includedCredit: Money;
  overage: Money;
  deliveryFee: Money;
  totalDue: Money;
}>;

export function createCartLine(input: CartLine): CartLine {
  if (!input.skuId.trim()) {
    throw new DomainValidationError("INVALID_CART_SKU", "cart SKU id must not be empty");
  }
  if (!Number.isSafeInteger(input.quantity) || input.quantity < 1) {
    throw new DomainValidationError(
      "INVALID_QUANTITY",
      "cart quantity must be a positive safe integer",
    );
  }
  assertMoney(input.unitPrice, "cart unit price");

  return Object.freeze({
    skuId: input.skuId,
    quantity: input.quantity,
    unitPrice: Object.freeze({ ...input.unitPrice }),
  });
}

export function createCart(lines: readonly CartLine[]): Cart {
  const normalized = lines.map(createCartLine);
  const skuIds = new Set<string>();
  for (const line of normalized) {
    if (skuIds.has(line.skuId)) {
      throw new DomainValidationError("DUPLICATE_CART_SKU", "cart cannot contain duplicate SKUs");
    }
    skuIds.add(line.skuId);
  }
  return Object.freeze({ lines: Object.freeze(normalized) });
}

export function calculateCartTotals(input: {
  cart: Cart;
  plan: Pick<Plan, "weeklyFee" | "weeklyCredit">;
  deliveryFee: Money;
  discount?: Money;
}): CartTotals {
  assertMoney(input.deliveryFee, "delivery fee");
  assertMoney(input.plan.weeklyFee, "weekly fee");
  assertMoney(input.plan.weeklyCredit, "weekly credit");

  let subtotal = createMoney(0);
  for (const line of input.cart.lines) {
    subtotal = addMoney(subtotal, multiplyMoney(line.unitPrice, line.quantity));
  }

  const discount = input.discount ?? createMoney(0);
  assertMoney(discount, "discount");
  if (discount.centavos > subtotal.centavos) {
    throw new DomainValidationError("INVALID_COMMERCE_DISCOUNT", "discount cannot exceed subtotal");
  }
  const discountedSubtotal = createMoney(subtotal.centavos - discount.centavos);
  const includedCredit = createMoney(
    Math.min(discountedSubtotal.centavos, input.plan.weeklyCredit.centavos),
  );
  const overage = createMoney(discountedSubtotal.centavos - includedCredit.centavos);
  const totalDue = addMoney(addMoney(input.plan.weeklyFee, overage), input.deliveryFee);

  return Object.freeze({
    subtotal,
    discount,
    weeklyFee: Object.freeze({ ...input.plan.weeklyFee }),
    includedCredit,
    overage,
    deliveryFee: Object.freeze({ ...input.deliveryFee }),
    totalDue,
  });
}

function assertMoney(value: Money, field: string): void {
  if (value.currency !== "PHP" || !Number.isSafeInteger(value.centavos) || value.centavos < 0) {
    throw new DomainValidationError(
      "INVALID_COMMERCE_MONEY",
      `${field} must be a non-negative PHP amount`,
    );
  }
}
