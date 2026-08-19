import { describe, expect, it } from "vitest";

import {
  paymentAttemptResponseSchema,
  paymentChargeRequestSchema,
  paymentMethodRequestSchema,
  paymentMethodListResponseSchema,
  paymentMethodResponseSchema,
  paymentMethodRevocationRequestSchema,
  paymentRefundRequestSchema,
} from "./payments.js";

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

  it("validates tokenized payment method requests and public responses", () => {
    expect(
      paymentMethodRequestSchema.parse({
        customerReference: "provider-customer-1",
        type: "card",
        token: "tok_private_123",
      }),
    ).toMatchObject({ type: "card" });
    expect(
      paymentMethodResponseSchema.parse({
        data: {
          id: "method-1",
          providerReference: "provider-method-1",
          type: "card",
          status: "active",
          createdAt: "2026-08-20T10:00:00.000Z",
          updatedAt: "2026-08-20T10:00:00.000Z",
        },
        meta: { correlationId: "corr-1" },
      }),
    ).toMatchObject({ data: { id: "method-1" } });
    expect(
      paymentMethodListResponseSchema.parse({
        data: { methods: [] },
        meta: { correlationId: "corr-1" },
      }),
    ).toMatchObject({ data: { methods: [] } });
  });

  it("validates payment method revocation requests", () => {
    expect(
      paymentMethodRevocationRequestSchema.parse({ customerReference: "provider-customer-1" }),
    ).toEqual({ customerReference: "provider-customer-1" });
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

  it("requires a positive PHP amount and reason for finance refunds", () => {
    expect(
      paymentRefundRequestSchema.parse({
        customerId: "customer-1",
        paymentAttemptId: "attempt-1",
        amount: { centavos: 10_000, currency: "PHP" },
        reason: "approved customer refund",
      }),
    ).toMatchObject({ paymentAttemptId: "attempt-1" });
  });
});
