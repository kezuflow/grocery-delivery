import { describe, expect, it } from "vitest";

import { createMoney } from "@carbon/domain";

import { FakePaymentProvider } from "./fake-provider.js";
import { InMemoryPaymentRepository, createPaymentAttempt } from "./payments.js";
import { PaymentReconciliationService } from "./reconciliation.js";

describe("payment reconciliation", () => {
  const now = "2026-08-20T10:00:00.000Z";
  const range = {
    from: "2026-08-20T00:00:00.000Z",
    to: "2026-08-20T23:59:59.000Z",
    now,
  } as const;

  it("reports no discrepancy when persisted payment data matches the provider", async () => {
    const repository = new InMemoryPaymentRepository();
    const provider = new FakePaymentProvider({ now: () => new Date(now) });
    const result = await provider.charge({
      paymentAttemptId: "attempt-1",
      customerReference: "customer-1",
      paymentMethodReference: "method-1",
      amount: createMoney(69_900),
      idempotencyKey: "charge-1",
    });
    await repository.savePaymentAttempt(
      createPaymentAttempt({
        id: "attempt-1",
        customerId: "customer-1",
        orderId: "order-1",
        providerName: "fake",
        amount: result.amount,
        status: result.status,
        providerReference: result.reference,
        failureCode: result.failureCode,
        idempotencyKey: "charge-1",
        requestFingerprint: "charge-1",
        createdAt: now,
        updatedAt: result.processedAt,
      }),
    );

    await expect(
      new PaymentReconciliationService(repository, provider).run(range),
    ).resolves.toMatchObject({
      providerEntryCount: 1,
      discrepancyCount: 0,
    });
  });

  it("persists deterministic status, amount, and unexpected-entry discrepancies", async () => {
    const repository = new InMemoryPaymentRepository();
    const provider = new FakePaymentProvider({ now: () => new Date(now) });
    const result = await provider.charge({
      paymentAttemptId: "attempt-mismatch",
      customerReference: "customer-1",
      paymentMethodReference: "method-1",
      amount: createMoney(10_000),
      idempotencyKey: "charge-mismatch",
    });
    await provider.charge({
      paymentAttemptId: "attempt-unexpected",
      customerReference: "customer-1",
      paymentMethodReference: "method-1",
      amount: createMoney(5_000),
      idempotencyKey: "charge-unexpected",
    });
    await repository.savePaymentAttempt(
      createPaymentAttempt({
        id: "attempt-mismatch",
        customerId: "customer-1",
        orderId: "order-1",
        providerName: "fake",
        amount: createMoney(9_000),
        status: "failed",
        providerReference: result.reference,
        failureCode: "declined",
        idempotencyKey: "charge-mismatch",
        requestFingerprint: "charge-mismatch",
        createdAt: now,
        updatedAt: now,
      }),
    );

    const report = await new PaymentReconciliationService(repository, provider).run(range);

    expect(report.discrepancies.map((entry) => entry.kind)).toEqual([
      "amount_mismatch",
      "status_mismatch",
      "unexpected_provider_entry",
    ]);
    expect(repository.reconciliationDiscrepancies).toHaveLength(3);
  });
});
