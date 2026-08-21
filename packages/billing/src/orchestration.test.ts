import { describe, expect, it } from "vitest";

import { createMoney } from "@carbon/domain";

import { FakePaymentProvider } from "./fake-provider.js";
import { DefaultPaymentService } from "./orchestration.js";
import { InMemoryPaymentRepository } from "./payments.js";
import { PaymentProviderError } from "./provider.js";

describe("payment orchestration", () => {
  const chargeInput = {
    customerId: "customer-1",
    orderId: "order-1",
    customerReference: "provider-customer-1",
    paymentMethodReference: "provider-method-1",
    amount: createMoney(69_900),
    idempotencyKey: "charge-key-1",
    now: "2026-08-20T10:00:00.000Z",
  } as const;

  it("registers a tokenized payment method without persisting the token", async () => {
    const repository = new InMemoryPaymentRepository();
    const service = new DefaultPaymentService(
      repository,
      new FakePaymentProvider({ now: () => new Date(chargeInput.now) }),
    );

    const input = {
      customerId: "customer-1",
      customerReference: "provider-customer-1",
      type: "card" as const,
      token: "tok_private_123",
      idempotencyKey: "method-key-1",
      now: chargeInput.now,
    };
    const method = await service.addPaymentMethod(input);
    const replay = await service.addPaymentMethod(input);

    expect(method).toEqual(replay);
    expect(method).toMatchObject({
      customerId: "customer-1",
      providerReference: "fake-payment-method-method-key-1",
      type: "card",
      status: "active",
    });
    expect(JSON.stringify(method)).not.toContain("tok_private_123");
    await expect(repository.listPaymentMethods("customer-1")).resolves.toHaveLength(1);
  });

  it("revokes an owned payment method idempotently and excludes it from active methods", async () => {
    const repository = new InMemoryPaymentRepository();
    const provider = new FakePaymentProvider({ now: () => new Date(chargeInput.now) });
    const service = new DefaultPaymentService(repository, provider);
    const method = await service.addPaymentMethod({
      customerId: "customer-1",
      customerReference: "provider-customer-1",
      type: "card",
      token: "tok_private_123",
      idempotencyKey: "method-key-1",
      now: chargeInput.now,
    });
    const input = {
      customerId: "customer-1",
      customerReference: "provider-customer-1",
      paymentMethodId: method.id,
      idempotencyKey: "revoke-key-1",
      now: "2026-08-20T10:01:00.000Z",
    };

    const revoked = await service.revokePaymentMethod(input);
    const replay = await service.revokePaymentMethod(input);

    expect(revoked).toEqual(replay);
    expect(revoked.status).toBe("revoked");
    await expect(repository.listPaymentMethods("customer-1")).resolves.toEqual([]);
    await expect(
      service.charge({
        ...chargeInput,
        paymentMethodReference: method.providerReference,
        idempotencyKey: "charge-revoked-1",
      }),
    ).rejects.toMatchObject({ code: "PAYMENT_METHOD_REVOKED" });
  });

  it("rejects revocation ownership violations and idempotency conflicts", async () => {
    const repository = new InMemoryPaymentRepository();
    const service = new DefaultPaymentService(repository, new FakePaymentProvider());
    const first = await service.addPaymentMethod({
      customerId: "customer-1",
      customerReference: "provider-customer-1",
      type: "card",
      token: "tok_1",
      idempotencyKey: "method-1",
      now: chargeInput.now,
    });
    const second = await service.addPaymentMethod({
      customerId: "customer-1",
      customerReference: "provider-customer-1",
      type: "ewallet",
      token: "tok_2",
      idempotencyKey: "method-2",
      now: chargeInput.now,
    });
    await expect(
      service.revokePaymentMethod({
        customerId: "customer-2",
        customerReference: "provider-customer-2",
        paymentMethodId: first.id,
        idempotencyKey: "revoke-owned",
        now: chargeInput.now,
      }),
    ).rejects.toMatchObject({ code: "PAYMENT_METHOD_NOT_FOUND" });
    await service.revokePaymentMethod({
      customerId: "customer-1",
      customerReference: "provider-customer-1",
      paymentMethodId: first.id,
      idempotencyKey: "revoke-shared",
      now: chargeInput.now,
    });
    await expect(
      service.revokePaymentMethod({
        customerId: "customer-1",
        customerReference: "provider-customer-1",
        paymentMethodId: second.id,
        idempotencyKey: "revoke-shared",
        now: chargeInput.now,
      }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });
  });

  it("keeps provider failures active and supports local-only revocation", async () => {
    const failedRepository = new InMemoryPaymentRepository();
    const failingProvider = new FailingRevocationProvider();
    const failedService = new DefaultPaymentService(failedRepository, failingProvider);
    const failedMethod = await failedService.addPaymentMethod({
      customerId: "customer-1",
      customerReference: "provider-customer-1",
      type: "card",
      token: "tok_1",
      idempotencyKey: "method-failure",
      now: chargeInput.now,
    });

    await expect(
      failedService.revokePaymentMethod({
        customerId: "customer-1",
        customerReference: "provider-customer-1",
        paymentMethodId: failedMethod.id,
        idempotencyKey: "revoke-failure",
        now: chargeInput.now,
      }),
    ).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    await expect(failedRepository.listPaymentMethods("customer-1")).resolves.toHaveLength(1);

    const localRepository = new InMemoryPaymentRepository();
    const localProvider = new LocalOnlyRevocationProvider();
    const localService = new DefaultPaymentService(localRepository, localProvider);
    const localMethod = await localService.addPaymentMethod({
      customerId: "customer-1",
      customerReference: "provider-customer-1",
      type: "card",
      token: "tok_2",
      idempotencyKey: "method-local",
      now: chargeInput.now,
    });
    await expect(
      localService.revokePaymentMethod({
        customerId: "customer-1",
        customerReference: "provider-customer-1",
        paymentMethodId: localMethod.id,
        idempotencyKey: "revoke-local",
        now: chargeInput.now,
      }),
    ).resolves.toMatchObject({ status: "revoked" });
    expect(localProvider.revocationCalls).toBe(0);
  });

  it("charges once, replays the attempt, and writes one charge ledger entry", async () => {
    const repository = new InMemoryPaymentRepository();
    const service = new DefaultPaymentService(
      repository,
      new FakePaymentProvider({ now: () => new Date(chargeInput.now) }),
      () => "attempt-1",
    );

    const first = await service.charge(chargeInput);
    const replay = await service.charge(chargeInput);

    expect(first).toEqual(replay);
    expect(first.status).toBe("succeeded");
    expect(repository.ledgerEntries).toHaveLength(1);
    await expect(service.charge({ ...chargeInput, amount: createMoney(70_000) })).rejects.toThrow(
      "idempotency key was reused",
    );
  });

  it("applies a signed charge webhook once for a pending attempt", async () => {
    const repository = new InMemoryPaymentRepository();
    const provider = new FakePaymentProvider({
      now: () => new Date(chargeInput.now),
      pendingPaymentAttemptIds: ["attempt-pending"],
    });
    const service = new DefaultPaymentService(repository, provider, () => "attempt-pending");
    const pending = await service.charge({ ...chargeInput, idempotencyKey: "pending-key" });

    expect(pending.status).toBe("pending");
    const event = {
      id: "event-charge-1",
      type: "charge.succeeded" as const,
      occurredAt: "2026-08-20T10:01:00.000Z",
      data: { chargeReference: pending.providerReference },
    };
    await expect(
      service.handleWebhook({ providerName: "fake", event, receivedAt: event.occurredAt }),
    ).resolves.toEqual({ duplicate: false, applied: true });
    await expect(
      service.handleWebhook({ providerName: "fake", event, receivedAt: event.occurredAt }),
    ).resolves.toEqual({ duplicate: true, applied: false });

    await expect(repository.findPaymentAttemptById(pending.id)).resolves.toMatchObject({
      status: "succeeded",
    });
    expect(repository.ledgerEntries).toHaveLength(1);
  });

  it("refunds a successful charge and records a credit ledger entry", async () => {
    const repository = new InMemoryPaymentRepository();
    const service = new DefaultPaymentService(
      repository,
      new FakePaymentProvider({ now: () => new Date(chargeInput.now) }),
      (() => {
        let sequence = 0;
        return () => `id-${++sequence}`;
      })(),
    );
    const attempt = await service.charge(chargeInput);
    const refundInput = {
      customerId: "customer-1",
      paymentAttemptId: attempt.id,
      amount: createMoney(10_000),
      reason: "customer request",
      idempotencyKey: "refund-key-1",
      now: "2026-08-20T10:02:00.000Z",
    } as const;

    const refund = await service.refund(refundInput);
    const replay = await service.refund(refundInput);

    expect(refund).toEqual(replay);
    expect(refund.status).toBe("succeeded");
    expect(repository.ledgerEntries).toHaveLength(2);
  });

  it("resolves and refunds the remaining successful order charge server-side", async () => {
    const repository = new InMemoryPaymentRepository();
    const service = new DefaultPaymentService(
      repository,
      new FakePaymentProvider({ now: () => new Date(chargeInput.now) }),
      (() => {
        let sequence = 0;
        return () => `order-refund-${++sequence}`;
      })(),
    );
    await service.charge(chargeInput);
    await service.refund({
      customerId: chargeInput.customerId,
      paymentAttemptId: "order-refund-1",
      amount: createMoney(10_000),
      reason: "partial adjustment",
      idempotencyKey: "partial-order-refund",
      now: "2026-08-20T10:01:00.000Z",
    });

    const refund = await service.refundOrder({
      customerId: chargeInput.customerId,
      orderId: chargeInput.orderId,
      reason: "approved customer refund",
      idempotencyKey: "order-request:request-1",
      now: "2026-08-20T10:02:00.000Z",
    });

    expect(refund.amount.centavos).toBe(59_900);
    await expect(
      service.refundOrder({
        customerId: chargeInput.customerId,
        orderId: chargeInput.orderId,
        reason: "approved customer refund",
        idempotencyKey: "order-request:request-1",
        now: "2026-08-20T10:02:00.000Z",
      }),
    ).resolves.toEqual(refund);
  });

  it("rejects cumulative refunds above the successful charge before calling the provider", async () => {
    const repository = new InMemoryPaymentRepository();
    const provider = new CountingRefundProvider({ now: () => new Date(chargeInput.now) });
    const service = new DefaultPaymentService(
      repository,
      provider,
      (() => {
        let sequence = 0;
        return () => `refund-bound-${++sequence}`;
      })(),
    );
    const attempt = await service.charge(chargeInput);

    await service.refund({
      customerId: "customer-1",
      paymentAttemptId: attempt.id,
      amount: createMoney(40_000),
      reason: "partial refund one",
      idempotencyKey: "refund-bound-1",
      now: "2026-08-20T10:02:00.000Z",
    });
    await service.refund({
      customerId: "customer-1",
      paymentAttemptId: attempt.id,
      amount: createMoney(29_900),
      reason: "partial refund two",
      idempotencyKey: "refund-bound-2",
      now: "2026-08-20T10:03:00.000Z",
    });

    await expect(
      service.refund({
        customerId: "customer-1",
        paymentAttemptId: attempt.id,
        amount: createMoney(1),
        reason: "over refund",
        idempotencyKey: "refund-bound-3",
        now: "2026-08-20T10:04:00.000Z",
      }),
    ).rejects.toMatchObject({ code: "REFUND_EXCEEDS_CHARGE" });
    expect(provider.refundCalls).toBe(2);
  });
});

class CountingRefundProvider extends FakePaymentProvider {
  refundCalls = 0;

  override refund(input: Parameters<FakePaymentProvider["refund"]>[0]) {
    this.refundCalls += 1;
    return super.refund(input);
  }
}

class FailingRevocationProvider extends FakePaymentProvider {
  override revokePaymentMethod(): Promise<never> {
    return Promise.reject(new PaymentProviderError("PROVIDER_UNAVAILABLE", "provider unavailable"));
  }
}

class LocalOnlyRevocationProvider extends FakePaymentProvider {
  revocationCalls = 0;

  override capabilities() {
    return { ...super.capabilities(), paymentMethodRevocation: false };
  }

  override revokePaymentMethod(): Promise<never> {
    this.revocationCalls += 1;
    return Promise.reject(new Error("should not be called"));
  }
}
