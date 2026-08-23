import { describe, expect, it } from "vitest";

import type { ApiTransport } from "./api/client";
import { resolveMarketplace } from "./marketplace";

const meta = { correlationId: "marketplace-test" };
const timestamp = "2026-08-23T00:00:00.000Z";

describe("marketplace chrome data", () => {
  it("keeps the storefront usable when the optional address read fails", async () => {
    const fetch: ApiTransport["fetch"] = (input) => {
      const url = new URL(
        input instanceof URL ? input : input instanceof Request ? input.url : input,
      );

      if (url.pathname === "/api/v1/delivery-address") {
        return Promise.resolve(
          Response.json(
            {
              error: { code: "ADDRESS_UNAVAILABLE", message: "address unavailable" },
              meta,
            },
            { status: 503 },
          ),
        );
      }
      if (url.pathname === "/api/v1/catalog") {
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
      }
      if (url.pathname === "/api/v1/cart") {
        return Promise.resolve(
          Response.json({
            data: {
              lines: [
                {
                  skuId: "sku-1",
                  quantity: 2,
                  unitPrice: { centavos: 12500, currency: "PHP" },
                },
              ],
              subtotal: { centavos: 25000, currency: "PHP" },
              updatedAt: timestamp,
            },
            meta,
          }),
        );
      }
      if (url.pathname === "/api/v1/subscription") {
        return Promise.resolve(
          Response.json({
            data: {
              id: "subscription-1",
              customerId: "customer-1",
              planId: "plan-1",
              status: "active",
              billingStatus: "current",
              effectiveCycleId: "cycle-1",
              skippedCycleId: null,
              lastAction: null,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
            meta,
          }),
        );
      }
      if (url.pathname === "/api/v1/plans") {
        return Promise.resolve(
          Response.json({
            data: {
              plans: [
                {
                  id: "plan-1",
                  code: "weekly",
                  name: "Weekly",
                  weeklyFee: { centavos: 19900, currency: "PHP" },
                  weeklyCredit: { centavos: 150000, currency: "PHP" },
                  displayOrder: 1,
                  active: true,
                },
              ],
            },
            meta,
          }),
        );
      }
      if (url.pathname === "/api/v1/promotions/banners") {
        return Promise.resolve(
          Response.json({
            data: { placement: "storefront-strip", banners: [], cacheVersion: 1 },
            meta,
          }),
        );
      }
      throw new Error("Unexpected request: " + url.pathname);
    };

    await expect(resolveMarketplace({ fetch }, "session=customer")).resolves.toMatchObject({
      catalog: { items: [{ id: "sku-1" }] },
      cart: { subtotal: { centavos: 25000 } },
      deliveryAddress: null,
      error: null,
    });
  });
});
