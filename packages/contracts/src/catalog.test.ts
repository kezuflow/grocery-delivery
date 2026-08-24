import { describe, expect, it } from "vitest";

import {
  catalogAdminCategoryItemsRequestSchema,
  catalogAdminImageUploadRequestSchema,
  catalogAdminSkuUpsertRequestSchema,
  catalogListResponseSchema,
} from "./catalog.js";

describe("catalog contracts", () => {
  const response = {
    data: {
      categories: [{ id: "produce", name: "Produce", slug: "produce", active: true }],
      items: [
        {
          id: "sku-apples",
          categoryId: "produce",
          categoryIds: ["produce"],
          name: "Apples",
          slug: "apples",
          description: "Crisp apples",
          unit: "kilogram",
          imageUrl: null,
          price: { centavos: 15_000, currency: "PHP" },
          active: true,
        },
      ],
      nextCursor: null,
    },
    meta: { correlationId: "catalog-request" },
  } as const;

  it("accepts a public catalog page", () => {
    expect(catalogListResponseSchema.parse(response)).toBeDefined();
  });

  it("rejects negative prices and malformed slugs", () => {
    expect(() =>
      catalogListResponseSchema.parse({
        ...response,
        data: {
          ...response.data,
          items: [
            {
              ...response.data.items[0],
              slug: "Not Valid",
              price: { centavos: -1, currency: "PHP" },
            },
          ],
        },
      }),
    ).toThrow();
  });

  it("accepts multiple product categories and bounded catalog images", () => {
    expect(
      catalogAdminSkuUpsertRequestSchema.parse({
        categoryIds: ["produce", "specials"],
        name: "Apples",
        description: "Crisp apples",
        unit: "kilogram",
        imageUrl: "/api/v1/catalog/images/image-1",
        procurementCostCentavos: 10_000,
        markupBasisPoints: 2_500,
        status: "active",
      }).categoryIds,
    ).toEqual(["produce", "specials"]);
    expect(
      catalogAdminImageUploadRequestSchema.parse({
        fileName: "apples.webp",
        altText: "Red apples",
        contentType: "image/webp",
        sizeBytes: 100_000,
      }),
    ).toBeDefined();
  });

  it("accepts a bounded selection of existing products for a category", () => {
    expect(
      catalogAdminCategoryItemsRequestSchema.parse({ itemIds: ["sku-apples", "sku-oats"] }),
    ).toEqual({ itemIds: ["sku-apples", "sku-oats"] });
    expect(() => catalogAdminCategoryItemsRequestSchema.parse({ itemIds: [] })).toThrow();
  });
});
