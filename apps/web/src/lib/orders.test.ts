import { describe, expect, it } from "vitest";

import type { ApiTransport } from "./api/client";
import { resolveCustomerOrderDetail } from "./orders";

const meta = { correlationId: "orders-test" };
const order = {
  id: "order-1",
  subscriptionId: "subscription-1",
  planId: "plan-1",
  cycleId: "cycle-2026-08-29",
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
  lockedAt: "2026-08-22T00:00:00.000Z",
};

describe("customer order detail hydration", () => {
  it("loads tracking and media only after finding the customer-owned order", async () => {
    const paths: string[] = [];
    const fetch: ApiTransport["fetch"] = (input, init) => {
      expect(new Headers(init?.headers).get("cookie")).toBe("session=customer");
      const path = new URL(input instanceof Request ? input.url : input.toString()).pathname;
      paths.push(path);
      if (path === "/api/v1/orders")
        return Promise.resolve(Response.json({ data: { orders: [order] }, meta }));
      if (path.endsWith("/tracking"))
        return Promise.resolve(
          Response.json({
            data: {
              orderId: "order-1",
              assignmentId: null,
              windowId: null,
              status: "pending",
              latestEventType: null,
              events: [],
            },
            meta,
          }),
        );
      return Promise.resolve(Response.json({ data: { media: [] }, meta }));
    };
    await expect(
      resolveCustomerOrderDetail({ fetch }, "session=customer", "order-1"),
    ).resolves.toMatchObject({ order: { id: "order-1" }, tracking: { status: "pending" } });
    expect(paths).toContain("/api/v1/orders/order-1/tracking");
  });

  it("returns not found without requesting tracking for another order id", async () => {
    const paths: string[] = [];
    const fetch: ApiTransport["fetch"] = (input) => {
      const path = new URL(input instanceof Request ? input.url : input.toString()).pathname;
      paths.push(path);
      return Promise.resolve(Response.json({ data: { orders: [order] }, meta }));
    };
    await expect(
      resolveCustomerOrderDetail({ fetch }, "session=customer", "other-order"),
    ).resolves.toBeNull();
    expect(paths).toEqual(["/api/v1/orders"]);
  });
});
