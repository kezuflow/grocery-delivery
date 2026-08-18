import { describe, expect, it } from "vitest";

import { DomainValidationError } from "./errors.js";
import { createCatalogSku } from "./catalog.js";
import { createMoney } from "./money.js";

describe("catalog entities", () => {
  const validSku = {
    id: "sku-tomatoes",
    categoryId: "fresh-produce",
    name: "Roma tomatoes",
    slug: "roma-tomatoes",
    description: "Firm tomatoes for the week ahead.",
    unit: "kilogram" as const,
    imageUrl: "https://cdn.example.com/tomatoes.jpg",
    price: createMoney(18_500),
    active: true,
  };

  it("accepts a valid SKU and freezes its value", () => {
    const sku = createCatalogSku(validSku);

    expect(sku).toEqual(validSku);
    expect(Object.isFrozen(sku)).toBe(true);
    expect(Object.isFrozen(sku.price)).toBe(true);
  });

  it("rejects invalid slugs, units, and image URLs", () => {
    expect(() => createCatalogSku({ ...validSku, slug: "Roma Tomatoes" })).toThrow(
      DomainValidationError,
    );
    expect(() => createCatalogSku({ ...validSku, unit: "bundle" as never })).toThrow(
      DomainValidationError,
    );
    expect(() => createCatalogSku({ ...validSku, imageUrl: "tomatoes.jpg" })).toThrow(
      DomainValidationError,
    );
  });
});
