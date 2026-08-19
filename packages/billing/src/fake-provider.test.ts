import { describe, expect, it } from "vitest";

import { createMoney } from "@carbon/domain";

import { FakePaymentProvider } from "./fake-provider.js";

describe("FakePaymentProvider", () => {
  const now = () => new Date("2026-08-20T10:00:00.000Z");

  it("exposes capabilities and idempotently replays customers, methods, and charges", async () => {
    const provider = new FakePaymentProvider({ now });

    expect(provider.capabilities()).toMatchObject({
      tokenizedCharges: true,
      paymentMethodRevocation: true,
      refunds: true,
      webhookVerification: true,
      reconciliation: true,
    });
    const customer = await provider.createCustomer({
      customerId: "customer-1",
      email: "customer@example.com",
      idempotencyKey: "customer-1",
    });
    const method = await provider.createPaymentMethod({
      customerReference: customer.reference,
      type: "card",
      token: "token-1",
      idempotencyKey: "method-1",
    });
    const input = {
      paymentAttemptId: "attempt-1",
      customerReference: customer.reference,
      paymentMethodReference: method.reference,
      amount: createMoney(69_900),
      idempotencyKey: "charge-1",
    } as const;
    const first = await provider.charge(input);
    const replay = await provider.charge(input);

    expect(first).toEqual(replay);
    expect(first).toMatchObject({
      reference: "fake-charge-attempt-1",
      status: "succeeded",
      amount: { centavos: 69_900, currency: "PHP" },
    });
  });

  it("revokes payment methods idempotently", async () => {
    const provider = new FakePaymentProvider({ now });
    const method = await provider.createPaymentMethod({
      customerReference: "customer-1",
      type: "card",
      token: "tok_1",
      idempotencyKey: "method-1",
    });
    const input = {
      customerReference: "customer-1",
      paymentMethodReference: method.reference,
      idempotencyKey: "revoke-1",
    };

    await expect(provider.revokePaymentMethod(input)).resolves.toEqual({ status: "revoked" });
    await expect(provider.revokePaymentMethod(input)).resolves.toEqual({ status: "revoked" });
    await expect(
      provider.charge({
        paymentAttemptId: "attempt-1",
        customerReference: "customer-1",
        paymentMethodReference: method.reference,
        amount: createMoney(1_000),
        idempotencyKey: "charge-1",
      }),
    ).rejects.toThrow("payment method is revoked");
  });

  it("supports deterministic pending and declined outcomes", async () => {
    const provider = new FakePaymentProvider({
      now,
      pendingPaymentAttemptIds: ["attempt-pending"],
      declinedPaymentAttemptIds: ["attempt-declined"],
    });
    const base = {
      customerReference: "fake-customer-1",
      paymentMethodReference: "fake-payment-method-1",
      amount: createMoney(1_000),
    } as const;

    await expect(
      provider.charge({ ...base, paymentAttemptId: "attempt-pending", idempotencyKey: "pending" }),
    ).resolves.toMatchObject({ status: "pending", failureCode: null });
    await expect(
      provider.charge({
        ...base,
        paymentAttemptId: "attempt-declined",
        idempotencyKey: "declined",
      }),
    ).resolves.toMatchObject({ status: "failed", failureCode: "declined" });
  });

  it("limits refunds to the successful charge amount and replays them", async () => {
    const provider = new FakePaymentProvider({ now });
    const charge = await provider.charge({
      paymentAttemptId: "attempt-1",
      customerReference: "customer-1",
      paymentMethodReference: "method-1",
      amount: createMoney(10_000),
      idempotencyKey: "charge-1",
    });
    const refundInput = {
      refundId: "refund-1",
      chargeReference: charge.reference,
      amount: createMoney(10_000),
      reason: "customer request",
      idempotencyKey: "refund-key-1",
    } as const;
    const refund = await provider.refund(refundInput);
    await expect(provider.refund(refundInput)).resolves.toEqual(refund);
    await expect(
      provider.refund({
        ...refundInput,
        refundId: "refund-2",
        idempotencyKey: "refund-key-2",
        amount: createMoney(1_000),
      }),
    ).rejects.toThrow("refund exceeds the charge amount");
  });

  it("verifies signed webhook envelopes and reconciles provider activity", async () => {
    const provider = new FakePaymentProvider({ now });
    const charge = await provider.charge({
      paymentAttemptId: "attempt-1",
      customerReference: "customer-1",
      paymentMethodReference: "method-1",
      amount: createMoney(2_000),
      idempotencyKey: "charge-1",
    });
    const rawBody = JSON.stringify({
      id: "event-1",
      type: "charge.succeeded",
      occurredAt: "2026-08-20T10:00:00.000Z",
      data: { chargeReference: charge.reference },
    });
    await expect(
      provider.verifyWebhook({ rawBody, signature: "fake:event-1" }),
    ).resolves.toMatchObject({
      id: "event-1",
      type: "charge.succeeded",
    });
    await expect(provider.verifyWebhook({ rawBody, signature: "invalid" })).rejects.toThrow(
      "webhook signature is invalid",
    );
    await expect(
      provider.verifyWebhook({
        rawBody: JSON.stringify({ ...JSON.parse(rawBody), type: "unknown.event" }),
        signature: "fake:event-1",
      }),
    ).rejects.toThrow("webhook payload is invalid");
    await expect(
      provider.reconcile({ from: "2026-08-20T00:00:00.000Z", to: "2026-08-20T23:59:59.000Z" }),
    ).resolves.toMatchObject({ entries: [{ reference: charge.reference, type: "charge" }] });
  });
});
