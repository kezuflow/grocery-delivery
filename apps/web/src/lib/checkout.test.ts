import { describe, expect, it } from "vitest";

import type { ApiTransport } from "./api/client";
import type { CustomerAccountData } from "./account";
import type { CustomerCatalogData } from "./catalog";
import { resolveCheckoutData } from "./checkout";

const account = {
  subscription: null,
  deliveryAddress: null,
  deliveryAddresses: [],
  deliveryWindows: {
    cycleId: "cycle-1",
    cutoffAt: "2026-08-28T00:00:00.000Z",
    windows: [],
    selectedWindowId: null,
  },
  cart: { lines: [], subtotal: { centavos: 0, currency: "PHP" }, updatedAt: null },
  plans: [],
  paymentHistory: [],
  orderHistory: [],
  orderFulfillment: [],
  supportCases: [],
  orderRequests: [],
  orderSubstitutions: [],
  notificationPreferences: {
    customerId: "customer-1",
    deliveryUpdates: true,
    marketing: false,
    updatedAt: "2026-08-20T00:00:00.000Z",
  },
  privacy: { export: null, deletionEligible: false, deletionReasons: [] },
  error: null,
} satisfies CustomerAccountData;

const catalog = {
  catalog: { categories: [], items: [], nextCursor: null },
  cart: account.cart,
  error: null,
} satisfies CustomerCatalogData;

describe("checkout hydration", () => {
  it("loads saved payment methods and the server checkout quote with the session cookie", async () => {
    const fetch: ApiTransport["fetch"] = (input, init) => {
      expect(new Headers(init?.headers).get("cookie")).toBe("session=customer");
      const path = new URL(input instanceof Request ? input.url : input.toString()).pathname;
      if (path === "/api/v1/payments/methods")
        return Promise.resolve(
          Response.json({
            data: {
              methods: [
                {
                  id: "method-1",
                  providerReference: "provider-1",
                  type: "ewallet",
                  status: "active",
                  createdAt: "2026-08-20T00:00:00.000Z",
                  updatedAt: "2026-08-20T00:00:00.000Z",
                },
              ],
            },
            meta: { correlationId: "checkout-test" },
          }),
        );
      return Promise.resolve(
        Response.json({
          data: {
            originalSubtotal: { centavos: 50000, currency: "PHP" },
            discount: { centavos: 0, currency: "PHP" },
            deliveryFee: { centavos: 5000, currency: "PHP" },
            weeklyFee: { centavos: 10000, currency: "PHP" },
            includedCredit: { centavos: 25000, currency: "PHP" },
            overage: { centavos: 25000, currency: "PHP" },
            totalDue: { centavos: 40000, currency: "PHP" },
            promotionCode: null,
          },
          meta: { correlationId: "checkout-test" },
        }),
      );
    };
    await expect(
      resolveCheckoutData({ fetch }, "session=customer", account, catalog),
    ).resolves.toMatchObject({
      paymentMethods: [{ id: "method-1" }],
      quote: { totalDue: { centavos: 40000 } },
      error: null,
    });
  });

  it("keeps checkout review available when payment methods cannot be listed", async () => {
    const fetch: ApiTransport["fetch"] = (input) => {
      const path = new URL(input instanceof Request ? input.url : input.toString()).pathname;
      if (path === "/api/v1/payments/methods") return Promise.reject(new Error("offline"));
      return Promise.reject(new Error("not eligible"));
    };
    await expect(
      resolveCheckoutData({ fetch }, "session=customer", account, catalog),
    ).resolves.toMatchObject({
      paymentMethods: [],
      quote: null,
      error: "Payment methods are temporarily unavailable. You can still review your order.",
    });
  });
});
