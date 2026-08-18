import { DomainValidationError } from "./errors.js";
import { createMoney, type Money } from "./money.js";

export const CATALOG_UNITS = ["piece", "gram", "kilogram", "milliliter", "liter", "pack"] as const;

export type CatalogUnit = (typeof CATALOG_UNITS)[number];

export type CatalogCategory = Readonly<{
  id: string;
  name: string;
  slug: string;
  active: boolean;
}>;

export type CatalogSku = Readonly<{
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  unit: CatalogUnit;
  imageUrl: string | null;
  price: Money;
  active: boolean;
}>;

export type CatalogMarkupRule = Readonly<{
  id: string;
  skuId: string | null;
  basisPoints: number;
  effectiveAt: string;
}>;

export type CatalogPriceHistoryEntry = Readonly<{
  id: string;
  skuId: string;
  procurementCost: Money;
  markupBasisPoints: number;
  price: Money;
  effectiveAt: string;
}>;

export function createCatalogCategory(input: CatalogCategory): CatalogCategory {
  assertText(input.id, "category id");
  assertText(input.name, "category name");
  assertSlug(input.slug, "category slug");

  return Object.freeze({ ...input });
}

export function createCatalogSku(input: CatalogSku): CatalogSku {
  assertText(input.id, "sku id");
  assertText(input.categoryId, "sku category id");
  assertText(input.name, "sku name");
  assertSlug(input.slug, "sku slug");
  assertText(input.description, "sku description");
  if (input.price.currency !== "PHP" || input.price.centavos < 0) {
    throw new DomainValidationError(
      "INVALID_CATALOG_PRICE",
      "catalog price must be a non-negative PHP amount",
    );
  }
  if (!CATALOG_UNITS.includes(input.unit)) {
    throw new DomainValidationError(
      "INVALID_CATALOG_UNIT",
      `unsupported catalog unit: ${input.unit}`,
    );
  }
  if (input.imageUrl !== null) {
    try {
      new URL(input.imageUrl);
    } catch {
      throw new DomainValidationError("INVALID_CATALOG_IMAGE", "imageUrl must be an absolute URL");
    }
  }

  return Object.freeze({ ...input, price: Object.freeze({ ...input.price }) });
}

export function createCatalogMarkupRule(input: CatalogMarkupRule): CatalogMarkupRule {
  assertText(input.id, "markup rule id");
  if (input.skuId !== null) {
    assertText(input.skuId, "markup rule sku id");
  }
  assertBasisPoints(input.basisPoints);
  assertIsoTimestamp(input.effectiveAt, "markup rule effectiveAt");

  return Object.freeze({ ...input });
}

export function calculateCatalogPrice(
  procurementCost: Money,
  globalMarkup: CatalogMarkupRule,
  skuMarkup?: CatalogMarkupRule,
): Money {
  if (procurementCost.currency !== "PHP" || procurementCost.centavos < 0) {
    throw new DomainValidationError(
      "INVALID_PROCUREMENT_COST",
      "procurement cost must be a non-negative PHP amount",
    );
  }

  const markup = skuMarkup ?? globalMarkup;
  const multiplier = 10_000 + markup.basisPoints;
  const product = procurementCost.centavos * multiplier;
  if (!Number.isSafeInteger(product)) {
    throw new DomainValidationError("MONEY_OVERFLOW", "catalog price exceeded safe integer range");
  }

  return createMoney(Math.floor((product + 5_000) / 10_000));
}

export function selectCatalogMarkupRule(
  rules: readonly CatalogMarkupRule[],
  skuId: string,
  effectiveAt: string,
): CatalogMarkupRule {
  assertText(skuId, "sku id");
  assertIsoTimestamp(effectiveAt, "price effectiveAt");
  const eligible = rules
    .filter((rule) => rule.effectiveAt <= effectiveAt)
    .sort((left, right) => right.effectiveAt.localeCompare(left.effectiveAt));
  const skuRule = eligible.find((rule) => rule.skuId === skuId);
  const globalRule = eligible.find((rule) => rule.skuId === null);
  const selected = skuRule ?? globalRule;
  if (!selected) {
    throw new DomainValidationError(
      "MISSING_CATALOG_MARKUP",
      "no effective catalog markup rule was found",
    );
  }

  return selected;
}

export function createCatalogPriceHistoryEntry(
  input: CatalogPriceHistoryEntry,
  globalMarkup: CatalogMarkupRule,
  skuMarkup?: CatalogMarkupRule,
): CatalogPriceHistoryEntry {
  assertText(input.id, "price history id");
  assertText(input.skuId, "price history sku id");
  assertBasisPoints(input.markupBasisPoints);
  assertIsoTimestamp(input.effectiveAt, "price history effectiveAt");
  if (globalMarkup.skuId !== null || (skuMarkup && skuMarkup.skuId !== input.skuId)) {
    throw new DomainValidationError(
      "INVALID_PRICE_MARKUP_SCOPE",
      "price history markup rules do not apply to the SKU",
    );
  }
  const expectedPrice = calculateCatalogPrice(input.procurementCost, globalMarkup, skuMarkup);
  const expectedMarkupBasisPoints = (skuMarkup ?? globalMarkup).basisPoints;
  if (input.markupBasisPoints !== expectedMarkupBasisPoints) {
    throw new DomainValidationError(
      "INVALID_PRICE_SNAPSHOT",
      "price history entry does not use the effective markup rule",
    );
  }
  if (input.price.centavos !== expectedPrice.centavos || input.price.currency !== "PHP") {
    throw new DomainValidationError(
      "INVALID_PRICE_SNAPSHOT",
      "price history entry does not match its procurement cost and markup",
    );
  }

  return Object.freeze({
    ...input,
    procurementCost: Object.freeze({ ...input.procurementCost }),
    price: Object.freeze({ ...input.price }),
  });
}

function assertText(value: string, field: string): void {
  if (!value.trim()) {
    throw new DomainValidationError("INVALID_CATALOG_TEXT", `${field} must not be empty`);
  }
}

function assertSlug(value: string, field: string): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new DomainValidationError("INVALID_CATALOG_SLUG", `${field} must be kebab-case`);
  }
}

function assertBasisPoints(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000) {
    throw new DomainValidationError(
      "INVALID_MARKUP_BASIS_POINTS",
      "markup basis points must be an integer from 0 to 1000000",
    );
  }
}

function assertIsoTimestamp(value: string, field: string): void {
  if (Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new DomainValidationError("INVALID_TIMESTAMP", `${field} must be an ISO timestamp`);
  }
}
