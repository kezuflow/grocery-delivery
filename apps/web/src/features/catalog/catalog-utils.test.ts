import { describe, expect, it } from "vitest";

import {
  addCartQuantity,
  cartDraftHasChanged,
  cartDraftFromResponse,
  filterCatalogItems,
  parseCatalogFilters,
  parseCatalogQuery,
  setCartQuantity,
  toCartUpdateLines,
} from "./catalog-utils";

const categories = [
  { id: "fresh", name: "Fresh produce", slug: "fresh-produce", active: true },
  { id: "pantry", name: "Pantry", slug: "pantry", active: true },
] as const;

const items = [
  {
    id: "sku-tomato",
    categoryId: "fresh",
    name: "Roma tomatoes",
    slug: "roma-tomatoes",
    description: "Ripe and ready for salads.",
    unit: "kilogram" as const,
    imageUrl: null,
    price: { centavos: 18000, currency: "PHP" as const },
    active: true,
  },
  {
    id: "sku-oats",
    categoryId: "pantry",
    name: "Rolled oats",
    slug: "rolled-oats",
    description: "A practical breakfast staple.",
    unit: "pack" as const,
    imageUrl: null,
    price: { centavos: 25000, currency: "PHP" as const },
    active: true,
  },
] as const;

describe("catalog filters", () => {
  it("normalizes server-owned search, sort, and price query values", () => {
    expect(parseCatalogQuery({ search: " apples ", sort: "price-high", minPrice: "100" })).toEqual({
      search: "apples",
      category: "",
      sort: "price-high",
      minPriceCentavos: 10000,
    });
  });
  it("normalizes URL values and filters by category and search", () => {
    const filters = parseCatalogFilters({ search: "  tomatoes ", category: "FRESH-PRODUCE" });
    expect(filters).toEqual({ search: "tomatoes", category: "fresh-produce" });
    expect(filterCatalogItems(items, categories, filters).map((item) => item.id)).toEqual([
      "sku-tomato",
    ]);
  });

  it("returns all items when filters are empty", () => {
    expect(filterCatalogItems(items, categories, { search: "", category: "" })).toHaveLength(2);
  });
});

describe("cart transformations", () => {
  it("creates an editable draft and removes zero quantities", () => {
    const draft = cartDraftFromResponse({
      lines: [{ skuId: "sku-tomato", quantity: 2, unitPrice: { centavos: 1, currency: "PHP" } }],
      subtotal: { centavos: 2, currency: "PHP" },
      updatedAt: null,
    });
    expect(addCartQuantity(draft, "sku-oats")).toEqual([
      { skuId: "sku-tomato", quantity: 2 },
      { skuId: "sku-oats", quantity: 1 },
    ]);
    expect(setCartQuantity(draft, "sku-tomato", 0)).toEqual([]);
    expect(setCartQuantity(draft, "sku-tomato", 2_000)).toEqual([
      { skuId: "sku-tomato", quantity: 1_000 },
    ]);
  });

  it("keeps the API payload limited to sku ids and quantities", () => {
    expect(toCartUpdateLines([{ skuId: "sku-tomato", quantity: 3 }])).toEqual([
      { skuId: "sku-tomato", quantity: 3 },
    ]);
  });

  it("compares drafts without depending on line order", () => {
    const cart = {
      lines: [
        { skuId: "sku-oats", quantity: 1, unitPrice: { centavos: 1, currency: "PHP" as const } },
        { skuId: "sku-tomato", quantity: 2, unitPrice: { centavos: 1, currency: "PHP" as const } },
      ],
      subtotal: { centavos: 3, currency: "PHP" as const },
      updatedAt: null,
    };
    expect(
      cartDraftHasChanged(
        [
          { skuId: "sku-tomato", quantity: 2 },
          { skuId: "sku-oats", quantity: 1 },
        ],
        cart,
      ),
    ).toBe(false);
    expect(cartDraftHasChanged([{ skuId: "sku-tomato", quantity: 3 }], cart)).toBe(true);
  });
});
