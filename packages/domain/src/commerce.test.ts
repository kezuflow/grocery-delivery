import { describe, expect, it } from "vitest";

import { DomainValidationError } from "./errors.js";
import { calculateCartTotals, createCart, createCartLine } from "./commerce.js";
import { createMoney } from "./money.js";
import { createDefaultPlans } from "./plans.js";

describe("weekly commerce totals", () => {
  const plan = createDefaultPlans()[0]!;

  it("applies included credit and delivery fees", () => {
    const cart = createCart([
      createCartLine({ skuId: "sku-a", quantity: 2, unitPrice: createMoney(20_000) }),
    ]);

    expect(calculateCartTotals({ cart, plan, deliveryFee: createMoney(5_000) })).toMatchObject({
      subtotal: { centavos: 40_000 },
      includedCredit: { centavos: 40_000 },
      overage: { centavos: 0 },
      totalDue: { centavos: 74_900 },
    });
  });

  it("charges only the amount above the credit budget as overage", () => {
    const cart = createCart([
      createCartLine({ skuId: "sku-a", quantity: 2, unitPrice: createMoney(50_000) }),
    ]);

    expect(calculateCartTotals({ cart, plan, deliveryFee: createMoney(0) })).toMatchObject({
      subtotal: { centavos: 100_000 },
      includedCredit: { centavos: 69_900 },
      overage: { centavos: 30_100 },
      totalDue: { centavos: 100_000 },
    });
  });

  it("rejects invalid quantities and duplicate SKUs", () => {
    expect(() =>
      createCartLine({ skuId: "sku-a", quantity: 0, unitPrice: createMoney(1) }),
    ).toThrow(DomainValidationError);
    expect(() =>
      createCart([
        createCartLine({ skuId: "sku-a", quantity: 1, unitPrice: createMoney(1) }),
        createCartLine({ skuId: "sku-a", quantity: 1, unitPrice: createMoney(1) }),
      ]),
    ).toThrow("duplicate");
  });

  it("keeps the copied price snapshot immutable", () => {
    const source = { centavos: 1_000, currency: "PHP" as const };
    const line = createCartLine({ skuId: "sku-a", quantity: 1, unitPrice: source });
    source.centavos = 9_999;
    expect(line.unitPrice.centavos).toBe(1_000);
    expect(Object.isFrozen(line.unitPrice)).toBe(true);
  });

  it("surfaces arithmetic overflow", () => {
    const cart = createCart([
      createCartLine({
        skuId: "sku-a",
        quantity: 2,
        unitPrice: createMoney(Number.MAX_SAFE_INTEGER),
      }),
    ]);
    expect(() => calculateCartTotals({ cart, plan, deliveryFee: createMoney(0) })).toThrow(
      "safe integer",
    );
  });
});
