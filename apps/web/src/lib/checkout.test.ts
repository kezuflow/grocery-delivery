import { describe, expect, it } from "vitest";

import type { ApiTransport } from "./api/client";
import { resolveCheckoutData } from "./checkout";

const payloads: Record<string, unknown> = {
  "/api/v1/subscription": {
    data: {
      id: "sub-1",
      customerId: "customer-1",
      planId: "plan-1",
      status: "active",
      billingStatus: "current",
      effectiveCycleId: null,
      skippedCycleId: null,
      lastAction: null,
      trialStartedAt: null,
      trialEndsAt: null,
      createdAt: "2026-08-20T00:00:00.000Z",
      updatedAt: "2026-08-20T00:00:00.000Z",
    },
    meta: { correlationId: "checkout-test" },
  },
  "/api/v1/cart": {
    data: { lines: [], subtotal: { centavos: 0, currency: "PHP" }, updatedAt: null },
    meta: { correlationId: "checkout-test" },
  },
  "/api/v1/delivery-address": { data: null, meta: { correlationId: "checkout-test" } },
  "/api/v1/delivery-windows": {
    data: {
      cycleId: "cycle-1",
      cutoffAt: "2026-08-28T00:00:00.000Z",
      windows: [],
      selectedWindowId: null,
    },
    meta: { correlationId: "checkout-test" },
  },
  "/api/v1/payments/methods": {
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
  },
  "/api/v1/checkout/quote": {
    data: {
      originalSubtotal: { centavos: 0, currency: "PHP" },
      discount: { centavos: 0, currency: "PHP" },
      deliveryFee: { centavos: 0, currency: "PHP" },
      weeklyFee: { centavos: 0, currency: "PHP" },
      includedCredit: { centavos: 0, currency: "PHP" },
      overage: { centavos: 0, currency: "PHP" },
      totalDue: { centavos: 0, currency: "PHP" },
      promotionCode: null,
    },
    meta: { correlationId: "checkout-test" },
  },
};

function transportFor(overrides: Record<string, Response | Error> = {}): ApiTransport {
  return {
    fetch: (input, init) => {
      expect(new Headers(init?.headers).get("cookie")).toBe("session=customer");
      const path = new URL(input instanceof Request ? input.url : input.toString()).pathname;
      const override = overrides[path];
      if (override instanceof Error) throw override;
      if (override) return Promise.resolve(override);
      return Promise.resolve(Response.json(payloads[path]));
    },
  };
}

describe("checkout hydration", () => {
  it("loads only checkout resources in parallel", async () => {
    const result = await resolveCheckoutData(transportFor(), "session=customer");
    expect(result.paymentMethods).toHaveLength(1);
    expect(result.quote?.totalDue.centavos).toBe(0);
    expect(result.error).toBeNull();
  });

  it("keeps checkout review available when optional resources fail", async () => {
    const result = await resolveCheckoutData(
      transportFor({
        "/api/v1/payments/methods": new Error("offline"),
        "/api/v1/checkout/quote": new Error("offline"),
      }),
      "session=customer",
    );
    expect(result.paymentMethods).toEqual([]);
    expect(result.quote).toBeNull();
    expect(result.error).toContain("Payment methods");
  });
});
