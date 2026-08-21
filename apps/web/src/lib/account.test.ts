import { describe, expect, it } from "vitest";

import type { ApiTransport } from "./api/client";
import { resolveCustomerAccount } from "./account";

const meta = { correlationId: "account-test" };

describe("customer account hydration", () => {
  it("loads subscription and cart state with the server-side session cookie", async () => {
    const fetch: ApiTransport["fetch"] = (input, init) => {
      const url = new URL(
        input instanceof URL ? input : input instanceof Request ? input.url : input,
      );
      if (url.pathname === "/api/v1/subscription") {
        expect(new Headers(init?.headers).get("cookie")).toBe("better-auth.session_token=secret");
        return Promise.resolve(
          Response.json({
            data: {
              id: "subscription-1",
              customerId: "customer-1",
              planId: "plan-small",
              status: "active",
              skippedCycleId: null,
              lastAction: null,
              createdAt: "2026-08-01T00:00:00.000Z",
              updatedAt: "2026-08-01T00:00:00.000Z",
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
              updatedAt: "2026-08-19T00:00:00.000Z",
            },
            meta,
          }),
        );
      }
      if (url.pathname === "/api/v1/delivery-address") {
        return Promise.resolve(Response.json({ data: null, meta }));
      }
      if (url.pathname === "/api/v1/delivery-windows") {
        return Promise.resolve(
          Response.json({
            data: { cycleId: "cycle-1", windows: [], selectedWindowId: null },
            meta,
          }),
        );
      }
      if (url.pathname === "/api/v1/orders") {
        return Promise.resolve(Response.json({ data: { orders: [] }, meta }));
      }
      if (url.pathname === "/api/v1/plans") {
        return Promise.resolve(Response.json({ data: { plans: [] }, meta }));
      }
      return Promise.resolve(
        Response.json({ data: { categories: [], items: [], nextCursor: null }, meta }),
      );
    };

    await expect(
      resolveCustomerAccount({ fetch }, "better-auth.session_token=secret"),
    ).resolves.toMatchObject({
      subscription: { id: "subscription-1", customerId: "customer-1" },
      cart: { subtotal: { centavos: 25000 } },
      error: null,
    });
  });

  it("treats a missing subscription and an empty cart as valid account state", async () => {
    const fetch: ApiTransport["fetch"] = (input) => {
      const url = new URL(
        input instanceof URL ? input : input instanceof Request ? input.url : input,
      );
      if (url.pathname === "/api/v1/subscription") {
        return Promise.resolve(
          Response.json(
            { error: { code: "SUBSCRIPTION_NOT_FOUND", message: "not found" }, meta },
            { status: 404 },
          ),
        );
      }
      if (url.pathname === "/api/v1/cart") {
        return Promise.resolve(
          Response.json({
            data: {
              lines: [],
              subtotal: { centavos: 0, currency: "PHP" },
              updatedAt: null,
            },
            meta,
          }),
        );
      }
      if (url.pathname === "/api/v1/delivery-address") {
        return Promise.resolve(Response.json({ data: null, meta }));
      }
      if (url.pathname === "/api/v1/delivery-windows") {
        return Promise.resolve(
          Response.json({
            data: { cycleId: "cycle-1", windows: [], selectedWindowId: null },
            meta,
          }),
        );
      }
      if (url.pathname === "/api/v1/orders") {
        return Promise.resolve(Response.json({ data: { orders: [] }, meta }));
      }
      if (url.pathname === "/api/v1/plans") {
        return Promise.resolve(Response.json({ data: { plans: [] }, meta }));
      }
      return Promise.resolve(
        Response.json({ data: { categories: [], items: [], nextCursor: null }, meta }),
      );
    };

    await expect(resolveCustomerAccount({ fetch }, "session=secret")).resolves.toMatchObject({
      subscription: null,
      cart: { lines: [], subtotal: { centavos: 0 } },
      error: null,
    });
  });

  it("hydrates tracking and proof media without trusting client-owned order data", async () => {
    const order = {
      id: "order-1",
      subscriptionId: "subscription-1",
      planId: "plan-small",
      cycleId: "cycle-2026-08-22",
      lines: [],
      weeklyCredit: { centavos: 10000, currency: "PHP" },
      totals: {
        subtotal: { centavos: 10000, currency: "PHP" },
        discount: { centavos: 0, currency: "PHP" },
        weeklyFee: { centavos: 0, currency: "PHP" },
        includedCredit: { centavos: 10000, currency: "PHP" },
        overage: { centavos: 0, currency: "PHP" },
        deliveryFee: { centavos: 0, currency: "PHP" },
        totalDue: { centavos: 0, currency: "PHP" },
      },
      appliedPromotion: null,
      deliveryAddress: null,
      deliveryWindow: null,
      paymentState: "paid",
      status: "locked",
      lockedAt: "2026-08-20T00:00:00.000Z",
    } as const;
    const fetch: ApiTransport["fetch"] = (input) => {
      const url = new URL(
        input instanceof URL ? input : input instanceof Request ? input.url : input,
      );
      if (url.pathname === "/api/v1/subscription") {
        return Promise.resolve(
          Response.json(
            { error: { code: "SUBSCRIPTION_NOT_FOUND", message: "not found" }, meta },
            { status: 404 },
          ),
        );
      }
      if (url.pathname === "/api/v1/cart")
        return Promise.resolve(
          Response.json({
            data: { lines: [], subtotal: { centavos: 0, currency: "PHP" }, updatedAt: null },
            meta,
          }),
        );
      if (url.pathname === "/api/v1/delivery-address")
        return Promise.resolve(Response.json({ data: null, meta }));
      if (url.pathname === "/api/v1/delivery-windows")
        return Promise.resolve(
          Response.json({
            data: { cycleId: "cycle-1", windows: [], selectedWindowId: null },
            meta,
          }),
        );
      if (url.pathname === "/api/v1/plans")
        return Promise.resolve(Response.json({ data: { plans: [] }, meta }));
      if (url.pathname === "/api/v1/catalog")
        return Promise.resolve(
          Response.json({ data: { categories: [], items: [], nextCursor: null }, meta }),
        );
      if (url.pathname === "/api/v1/payments/history")
        return Promise.resolve(Response.json({ data: { entries: [] }, meta }));
      if (url.pathname === "/api/v1/orders")
        return Promise.resolve(Response.json({ data: { orders: [order] }, meta }));
      if (url.pathname === "/api/v1/orders/order-1/tracking") {
        return Promise.resolve(
          Response.json({
            data: {
              orderId: "order-1",
              assignmentId: "assignment-1",
              windowId: null,
              status: "delivered",
              latestEventType: "delivered",
              events: [],
            },
            meta,
          }),
        );
      }
      if (url.pathname === "/api/v1/orders/order-1/media") {
        return Promise.resolve(
          Response.json({
            data: {
              media: [
                {
                  id: "media-1",
                  orderId: "order-1",
                  assignmentId: "assignment-1",
                  kind: "proof_of_delivery",
                  contentType: "image/jpeg",
                  sizeBytes: 100,
                  createdAt: "2026-08-20T00:00:00.000Z",
                  downloadUrl: "https://media.example.test/proof.jpg",
                  downloadUrlExpiresAt: "2026-08-20T01:00:00.000Z",
                },
              ],
            },
            meta,
          }),
        );
      }
      if (url.pathname === "/api/v1/support/cases")
        return Promise.resolve(Response.json({ data: { cases: [] }, meta }));
      return Promise.resolve(
        Response.json({
          data: {
            customerId: "",
            deliveryUpdates: true,
            marketing: false,
            updatedAt: new Date(0).toISOString(),
          },
          meta,
        }),
      );
    };

    await expect(resolveCustomerAccount({ fetch }, "session=secret")).resolves.toMatchObject({
      orderHistory: [{ id: "order-1", paymentState: "paid" }],
      orderFulfillment: [
        { orderId: "order-1", tracking: { status: "delivered" }, media: [{ id: "media-1" }] },
      ],
    });
  });
});
