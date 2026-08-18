import { describe, expect, it } from "vitest";

import { paymentAttemptResponseSchema, paymentChargeRequestSchema } from "./payments.js";

describe("payment contracts", () => {
  it("accepts charge requests without a client amount", () => {
    expect(
      paymentChargeRequestSchema.parse({
        orderId: "order-1",
        customerReference: "provider-customer-1",
        paymentMethodReference: "provider-method-1",
      }),
    ).toMatchObject({ orderId: "order-1" });
  });

  it("validates public payment attempt responses", () => {
    expect(
      paymentAttemptResponseSchema.parse({
        data: {
          id: "attempt-1",
          orderId: "order-1",
          amount: { centavos: 69_900, currency: "PHP" },
          status: "succeeded",
          providerReference: "charge-1",
          failureCode: null,
          createdAt: "2026-08-20T10:00:00.000Z",
          updatedAt: "2026-08-20T10:00:01.000Z",
        },
        meta: { correlationId: "corr-1" },
      }),
    ).toMatchObject({ data: { id: "attempt-1" } });
  });
});
