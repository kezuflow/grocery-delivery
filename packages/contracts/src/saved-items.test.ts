import { describe, expect, it } from "vitest";
import { savedItemsResponseSchema } from "./saved-items";

describe("saved item contracts", () => {
  it("accepts only server-resolved PHP catalog details", () => {
    const result = savedItemsResponseSchema.parse({
      data: {
        items: [
          {
            skuId: "sku-a",
            name: "Apples",
            slug: "apples",
            description: "Crisp apples.",
            unit: "kilogram",
            imageUrl: null,
            price: { centavos: 18_125, currency: "PHP" },
            savedAt: "2026-08-23T10:00:00.000Z",
          },
        ],
      },
      meta: { correlationId: "saved-items-test" },
    });
    expect(result.data.items[0]?.price.centavos).toBe(18_125);
  });
});
