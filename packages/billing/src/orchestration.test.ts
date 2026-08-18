import { describe, expect, it } from "vitest";

import { createMoney } from "@carbon/domain";

import { FakePaymentProvider } from "./fake-provider.js";
import { DefaultPaymentService } from "./orchestration.js";
import { InMemoryPaymentRepository } from "./payments.js";

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
});
