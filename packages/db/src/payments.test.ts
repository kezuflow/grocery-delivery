import { describe, expect, it } from "vitest";

import { createMoney } from "@carbon/domain";
import type { PaymentAttempt, PaymentMethod } from "@carbon/billing";
import type { CatalogDatabase, CatalogPreparedStatement } from "./catalog.js";
import { D1PaymentRepository } from "./payments.js";

type FakePaymentStatement = {
  bind(...values: unknown[]): FakePaymentStatement;
  all<T extends Record<string, unknown>>(): Promise<{ results: readonly T[] }>;
  run(): Promise<{ meta: { changes: number } }>;
};

describe("payment repository", () => {
  it("restores and persists tokenized payment method metadata without raw tokens", async () => {
    const database = new FakePaymentDatabase([
      [
        {
          id: "method-1",
          customer_id: "customer-1",
          provider_name: "fake",
          provider_reference: "provider-method-1",
          method_type: "card",
          status: "active",
          idempotency_key: "method-1",
          request_fingerprint: "fingerprint-method-1",
          created_at: "2026-08-20T10:00:00.000Z",
          updated_at: "2026-08-20T10:00:00.000Z",
        },
      ],
    ]);
    const repository = new D1PaymentRepository(database);

    await expect(
      repository.findPaymentMethodByIdempotencyKey("customer-1", "method-1"),
    ).resolves.toMatchObject({
      id: "method-1",
      providerReference: "provider-method-1",
      type: "card",
    });
    const method: PaymentMethod = {
      id: "method-2",
      customerId: "customer-1",
      providerName: "fake",
      providerReference: "provider-method-2",
      type: "ewallet",
      status: "active",
      idempotencyKey: "method-2",
      requestFingerprint: "fingerprint-method-2",
      createdAt: "2026-08-20T10:01:00.000Z",
      updatedAt: "2026-08-20T10:01:00.000Z",
    };
    await repository.savePaymentMethod(method);

    expect(database.batches).toHaveLength(1);
    expect(database.batches[0]?.[0]).toBeDefined();
    expect(database.calls[1]?.sql).toContain("INSERT INTO payment_methods");
    expect(database.calls[1]?.values).not.toContain("tok_private_123");
  });

  it("stores payment method revocations atomically and restores replay snapshots", async () => {
    const database = new FakePaymentDatabase([
      [
        {
          id: "method-1",
          customer_id: "customer-1",
          provider_name: "fake",
          provider_reference: "provider-method-1",
          method_type: "card",
          status: "active",
          idempotency_key: "method-1",
          request_fingerprint: "fingerprint-method-1",
          created_at: "2026-08-20T10:00:00.000Z",
          updated_at: "2026-08-20T10:00:00.000Z",
        },
      ],
      [
        {
          id: "revocation-1",
          customer_id: "customer-1",
          payment_method_id: "method-1",
          idempotency_key: "revoke-1",
          request_fingerprint: "fingerprint-revoke-1",
          created_at: "2026-08-20T10:01:00.000Z",
          updated_at: "2026-08-20T10:01:00.000Z",
        },
      ],
    ]);
    const repository = new D1PaymentRepository(database);
    const method = await repository.findPaymentMethodById("customer-1", "method-1");

    await expect(
      repository.findPaymentMethodRevocationByIdempotencyKey("customer-1", "revoke-1"),
    ).resolves.toMatchObject({ paymentMethodId: "method-1" });
    await repository.saveRevokedPaymentMethod(
      { ...method!, status: "revoked", updatedAt: "2026-08-20T10:01:00.000Z" },
      {
        id: "revocation-1",
        customerId: "customer-1",
        paymentMethodId: "method-1",
        idempotencyKey: "revoke-1",
        requestFingerprint: "fingerprint-revoke-1",
        createdAt: "2026-08-20T10:01:00.000Z",
        updatedAt: "2026-08-20T10:01:00.000Z",
      },
    );

    expect(database.batches).toHaveLength(1);
    expect(database.batches[0]).toHaveLength(2);
    expect(database.calls.map((call) => call.sql)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("UPDATE payment_methods"),
        expect.stringContaining("INSERT INTO payment_method_revocations"),
      ]),
    );
  });

  it("restores payment attempts and refunds from D1 rows", async () => {
    const database = new FakePaymentDatabase([
      [
        {
          id: "attempt-1",
          customer_id: "customer-1",
          order_id: "order-1",
          provider_name: "fake",
          amount_centavos: 69_900,
          status: "succeeded",
          provider_reference: "charge-1",
          failure_code: null,
          idempotency_key: "charge-1",
          request_fingerprint: "fingerprint-charge-1",
          created_at: "2026-08-20T10:00:00.000Z",
          updated_at: "2026-08-20T10:00:01.000Z",
        },
      ],
      [
        {
          id: "refund-1",
          customer_id: "customer-1",
          payment_attempt_id: "attempt-1",
          provider_name: "fake",
          provider_reference: "refund-ref-1",
          amount_centavos: 10_000,
          status: "succeeded",
          reason: "customer request",
          idempotency_key: "refund-1",
          request_fingerprint: "fingerprint-refund-1",
          created_at: "2026-08-20T10:01:00.000Z",
          updated_at: "2026-08-20T10:01:01.000Z",
        },
      ],
    ]);
    const repository = new D1PaymentRepository(database);

    await expect(repository.findPaymentAttemptById("attempt-1")).resolves.toMatchObject({
      id: "attempt-1",
      amount: createMoney(69_900),
    });
    await expect(
      repository.findRefundByIdempotencyKey("customer-1", "refund-1"),
    ).resolves.toMatchObject({ id: "refund-1", amount: createMoney(10_000) });
  });

  it("atomically stores attempts, refunds, ledger entries, and deduplicates webhooks", async () => {
    const database = new FakePaymentDatabase([]);
    const repository = new D1PaymentRepository(database);
    const attempt: PaymentAttempt = {
      id: "attempt-1",
      customerId: "customer-1",
      orderId: "order-1",
      providerName: "fake",
      amount: createMoney(69_900),
      status: "succeeded",
      providerReference: "charge-1",
      failureCode: null,
      idempotencyKey: "charge-1",
      requestFingerprint: "fingerprint-charge-1",
      createdAt: "2026-08-20T10:00:00.000Z",
      updatedAt: "2026-08-20T10:00:01.000Z",
    };
    const entry = {
      id: "ledger-1",
      customerId: "customer-1",
      paymentAttemptId: "attempt-1",
      refundId: null,
      type: "charge" as const,
      direction: "debit" as const,
      amount: createMoney(69_900),
      occurredAt: attempt.updatedAt,
      metadata: {},
    };

    await repository.savePaymentAttemptAndLedger(attempt, entry);
    await repository.saveRefundAndLedger(
      {
        id: "refund-1",
        customerId: "customer-1",
        paymentAttemptId: "attempt-1",
        providerName: "fake",
        providerReference: null,
        amount: createMoney(10_000),
        status: "succeeded",
        reason: "customer request",
        idempotencyKey: "refund-1",
        requestFingerprint: "fingerprint-refund-1",
        createdAt: attempt.updatedAt,
        updatedAt: attempt.updatedAt,
      },
      { ...entry, id: "ledger-refund-1", type: "refund", direction: "credit" },
    );
    await expect(
      repository.recordWebhook({
        id: "event-1",
        providerName: "fake",
        type: "charge.succeeded",
        occurredAt: attempt.updatedAt,
        data: {},
        receivedAt: attempt.updatedAt,
      }),
    ).resolves.toBe(true);

    expect(database.batches).toHaveLength(2);
    expect(database.batches[0]).toHaveLength(2);
    expect(database.batches[1]).toHaveLength(2);
    expect(database.calls.map((call) => call.sql)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("INSERT INTO payment_attempts"),
        expect.stringContaining("INSERT INTO payment_refunds"),
        expect.stringContaining("payment_ledger_entries"),
      ]),
    );
    expect(database.runCalls[0]?.sql).toContain("payment_webhook_events");
  });
});

class FakePaymentDatabase implements CatalogDatabase {
  readonly calls: Array<{ sql: string; values: unknown[] }> = [];
  readonly runCalls: Array<{ sql: string; values: unknown[] }> = [];
  readonly batches: Array<readonly CatalogPreparedStatement[]> = [];

  constructor(private readonly results: readonly (readonly Record<string, unknown>[])[]) {}

  prepare(sql: string): CatalogPreparedStatement {
    const call = { sql, values: [] as unknown[] };
    this.calls.push(call);
    const result = this.results[this.calls.length - 1] ?? [];
    const statement = {} as FakePaymentStatement;
    statement.bind = (...values: unknown[]) => {
      call.values = values;
      return statement;
    };
    statement.all = <T extends Record<string, unknown>>() =>
      Promise.resolve({ results: result as readonly T[] });
    statement.run = () => {
      this.runCalls.push(call);
      return Promise.resolve({ meta: { changes: 1 } });
    };
    return statement;
  }

  batch(statements: readonly CatalogPreparedStatement[]): Promise<readonly unknown[]> {
    this.batches.push(statements);
    return Promise.resolve([]);
  }
}
