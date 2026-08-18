import { describe, expect, it } from "vitest";

import {
  calculateCatalogPrice,
  createCatalogMarkupRule,
  createCatalogPriceHistoryEntry,
  selectCatalogMarkupRule,
} from "./catalog.js";
import { DomainValidationError } from "./errors.js";
import { createMoney } from "./money.js";

describe("catalog pricing", () => {
  const globalMarkup = createCatalogMarkupRule({
    id: "markup-global",
    skuId: null,
    basisPoints: 2_500,
    effectiveAt: "2026-08-18T00:00:00.000Z",
  });
  const skuMarkup = createCatalogMarkupRule({
    id: "markup-oats",
    skuId: "sku-oats",
    basisPoints: 1_000,
    effectiveAt: "2026-08-18T00:00:00.000Z",
  });

  it("uses a SKU override instead of the global markup", () => {
    expect(calculateCatalogPrice(createMoney(10_000), globalMarkup).centavos).toBe(12_500);
    expect(calculateCatalogPrice(createMoney(10_000), globalMarkup, skuMarkup).centavos).toBe(
      11_000,
    );
  });

  it("selects the latest effective SKU rule before the global rule", () => {
    const futureSkuMarkup = createCatalogMarkupRule({
      ...skuMarkup,
      id: "markup-oats-future",
      basisPoints: 500,
      effectiveAt: "2026-09-01T00:00:00.000Z",
    });

    expect(
      selectCatalogMarkupRule(
        [globalMarkup, skuMarkup, futureSkuMarkup],
        "sku-oats",
        "2026-08-25T00:00:00.000Z",
      ),
    ).toBe(skuMarkup);
    expect(
      selectCatalogMarkupRule([globalMarkup, skuMarkup], "sku-rice", "2026-08-25T00:00:00.000Z"),
    ).toBe(globalMarkup);
  });

  it("rounds half up to the nearest centavo", () => {
    expect(calculateCatalogPrice(createMoney(2), globalMarkup).centavos).toBe(3);
  });

  it("rejects a price snapshot that is inconsistent with its inputs", () => {
    expect(() =>
      createCatalogPriceHistoryEntry(
        {
          id: "price-1",
          skuId: "sku-oats",
          procurementCost: createMoney(10_000),
          markupBasisPoints: 1_000,
          price: createMoney(12_500),
          effectiveAt: "2026-08-18T00:00:00.000Z",
        },
        globalMarkup,
        skuMarkup,
      ),
    ).toThrow(DomainValidationError);
  });
});
