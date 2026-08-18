import { DomainValidationError } from "./errors.js";

export const PHP_CURRENCY = "PHP" as const;

export type Money = Readonly<{
  centavos: number;
  currency: typeof PHP_CURRENCY;
}>;

export function createMoney(centavos: number): Money {
  assertSafeInteger(centavos, "centavos");

  return Object.freeze({
    centavos,
    currency: PHP_CURRENCY,
  });
}

export function addMoney(left: Money, right: Money): Money {
  return createMoney(assertSafeResult(left.centavos + right.centavos));
}

export function subtractMoney(left: Money, right: Money): Money {
  return createMoney(assertSafeResult(left.centavos - right.centavos));
}

export function multiplyMoney(money: Money, quantity: number): Money {
  assertSafeInteger(quantity, "quantity");

  if (quantity < 0) {
    throw new DomainValidationError("INVALID_QUANTITY", "quantity must not be negative");
  }

  return createMoney(assertSafeResult(money.centavos * quantity));
}

function assertSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new DomainValidationError("INVALID_INTEGER_AMOUNT", `${field} must be a safe integer`);
  }
}

function assertSafeResult(value: number): number {
  if (!Number.isSafeInteger(value)) {
    throw new DomainValidationError(
      "MONEY_OVERFLOW",
      "money operation exceeded the safe integer range",
    );
  }

  return value;
}
