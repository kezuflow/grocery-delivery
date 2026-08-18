import { describe, expect, it } from "vitest";

import { catalogListResponseSchema } from "./catalog.js";

describe("catalog contracts", () => {
  const response = {
    data: {
      categories: [{ id: "produce", name: "Produce", slug: "produce", active: true }],
      items: [
        {
          id: "sku-apples",
          categoryId: "produce",
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
});
