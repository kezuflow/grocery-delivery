import { describe, expect, it } from "vitest";

import type { ApiTransport } from "./api/client";
import { resolveCustomerCatalog } from "./catalog";

const meta = { correlationId: "catalog-test" };

describe("customer catalog hydration", () => {
  it("loads active catalog data and cart state with the customer cookie", async () => {
    const fetch: ApiTransport["fetch"] = (input, init) => {
      const url = new URL(
        input instanceof URL ? input : input instanceof Request ? input.url : input,
      );
      if (url.pathname === "/api/v1/cart") {
        expect(new Headers(init?.headers).get("cookie")).toBe("session=customer");
        return Promise.resolve(
          Response.json({
            data: {
              lines: [
                { skuId: "sku-1", quantity: 2, unitPrice: { centavos: 12500, currency: "PHP" } },
              ],
              subtotal: { centavos: 25000, currency: "PHP" },
              updatedAt: "2026-08-21T00:00:00.000Z",
            },
            meta,
          }),
        );
      }
      return Promise.resolve(
        Response.json({
          data: {
            categories: [{ id: "fresh", name: "Fresh", slug: "fresh", active: true }],
            items: [
              {
                id: "sku-1",
                categoryId: "fresh",
                name: "Tomatoes",
                slug: "tomatoes",
                description: "Fresh tomatoes",
                unit: "kilogram",
                imageUrl: null,
                price: { centavos: 12500, currency: "PHP" },
                active: true,
              },
            ],
            nextCursor: null,
          },
          meta,
        }),
      );
    };

    await expect(resolveCustomerCatalog({ fetch }, "session=customer")).resolves.toMatchObject({
      catalog: { items: [{ id: "sku-1" }] },
      cart: { subtotal: { centavos: 25000 } },
      error: null,
    });
  });

  it("returns a recoverable empty state when the API is unavailable", async () => {
    const fetch: ApiTransport["fetch"] = () => Promise.reject(new Error("offline"));

    await expect(resolveCustomerCatalog({ fetch }, "session=customer")).resolves.toMatchObject({
      catalog: { categories: [], items: [] },
      cart: { lines: [], subtotal: { centavos: 0 } },
      error: "We could not load the catalog right now. Please try again shortly.",
    });
  });

  it("keeps the public catalog available when a guest has no cart session", async () => {
    const fetch: ApiTransport["fetch"] = (input) => {
      const url = new URL(
        input instanceof URL ? input : input instanceof Request ? input.url : input,
      );
      if (url.pathname === "/api/v1/cart") {
        return Promise.resolve(
          Response.json(
            { error: { code: "UNAUTHENTICATED", message: "an active session is required" }, meta },
            { status: 401 },
          ),
        );
      }
      return Promise.resolve(
        Response.json({
          data: {
            categories: [],
            items: [
              {
                id: "sku-guest",
                categoryId: "fresh",
                name: "Guest tomatoes",
                slug: "guest-tomatoes",
                description: "Fresh tomatoes",
                unit: "kilogram",
                imageUrl: null,
                price: { centavos: 12500, currency: "PHP" },
                active: true,
              },
            ],
            nextCursor: null,
          },
          meta,
        }),
      );
    };

    await expect(resolveCustomerCatalog({ fetch }, "")).resolves.toMatchObject({
      catalog: { items: [{ id: "sku-guest" }] },
      cart: { lines: [], subtotal: { centavos: 0 } },
      error: null,
    });
  });
});
