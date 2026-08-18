import { describe, expect, it } from "vitest";

import { createMoney } from "@carbon/domain";

import {
  createPaymentAttempt,
  createPaymentLedgerEntry,
  createRefund,
  InMemoryPaymentRepository,
} from "./payments.js";

describe("payment persistence contract", () => {
  it("replays payment attempts by customer idempotency key and preserves ledger append-only semantics", async () => {
    const repository = new InMemoryPaymentRepository();
    const attempt = createPaymentAttempt({
      id: "attempt-1",
      customerId: "customer-1",
      orderId: "order-1",
      providerName: "fake",
      amount: createMoney(69_900),
      status: "succeeded",
      providerReference: "charge-1",
      failureCode: null,
      idempotencyKey: "charge-1",
      createdAt: "2026-08-20T10:00:00.000Z",
      updatedAt: "2026-08-20T10:00:01.000Z",
    });
    const entry = createPaymentLedgerEntry({
      id: "ledger-charge-1",
      customerId: "customer-1",
      paymentAttemptId: attempt.id,
      refundId: null,
      type: "charge",
      direction: "debit",
      amount: createMoney(69_900),
      occurredAt: attempt.updatedAt,
      metadata: { providerReference: attempt.providerReference },
    });

    await repository.savePaymentAttemptAndLedger(attempt, entry);
    await repository.appendLedgerEntry(entry);

    await expect(
      repository.findPaymentAttemptByIdempotencyKey("customer-1", "charge-1"),
    ).resolves.toEqual(attempt);
    expect(repository.ledgerEntries).toHaveLength(1);
  });

  it("deduplicates webhooks and stores refunds with their ledger entry", async () => {
    const repository = new InMemoryPaymentRepository();
    const event = {
      id: "event-1",
      providerName: "fake",
      type: "charge.succeeded",
      occurredAt: "2026-08-20T10:00:00.000Z",
      data: { chargeReference: "charge-1" },
      receivedAt: "2026-08-20T10:00:02.000Z",
    } as const;

    await expect(repository.recordWebhook(event)).resolves.toBe(true);
    await expect(repository.recordWebhook(event)).resolves.toBe(false);

    const refund = createRefund({
      id: "refund-1",
      customerId: "customer-1",
      paymentAttemptId: "attempt-1",
      providerName: "fake",
      providerReference: "refund-1-provider",
      amount: createMoney(10_000),
      status: "succeeded",
      reason: "customer request",
      idempotencyKey: "refund-1",
      createdAt: event.receivedAt,
      updatedAt: event.receivedAt,
    });
    await repository.saveRefundAndLedger(
      refund,
      createPaymentLedgerEntry({
        id: "ledger-refund-1",
        customerId: refund.customerId,
        paymentAttemptId: refund.paymentAttemptId,
        refundId: refund.id,
        type: "refund",
        direction: "credit",
        amount: refund.amount,
        occurredAt: refund.updatedAt,
        metadata: { reason: refund.reason },
      }),
    );

    await expect(repository.findRefundByIdempotencyKey("customer-1", "refund-1")).resolves.toEqual(
      refund,
    );
    expect(repository.ledgerEntries).toHaveLength(1);
  });
});
