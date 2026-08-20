import {
  createPaymentAttempt,
  createPaymentLedgerEntry,
  createPaymentMethod,
  createReconciliationDiscrepancy,
  createRefund,
  type PaymentAttempt,
  type PaymentLedgerEntry,
  type PaymentMethod,
  type PaymentHistoryEntry,
  type PaymentMethodRevocation,
  type PaymentRepository,
  type PaymentWebhookEvent,
  type ReconciliationDiscrepancy,
  type Refund,
} from "@carbon/billing";

import type { CatalogDatabase, CatalogPreparedStatement } from "./catalog.js";

export type PaymentDatabase = CatalogDatabase;

export class D1PaymentRepository implements PaymentRepository {
  constructor(private readonly database: PaymentDatabase) {}

  async findPaymentMethodByIdempotencyKey(
    customerId: string,
    idempotencyKey: string,
  ): Promise<PaymentMethod | null> {
    const rows = await this.database
      .prepare(
        `SELECT id, customer_id, provider_name, provider_reference, method_type,
                status, idempotency_key, request_fingerprint, created_at, updated_at
         FROM payment_methods
         WHERE customer_id = ? AND idempotency_key = ?
         LIMIT 1`,
      )
      .bind(customerId, idempotencyKey)
      .all<PaymentMethodRow>();
    const row = rows.results[0];
    return row ? mapPaymentMethod(row) : null;
  }

  async findPaymentMethodById(customerId: string, methodId: string): Promise<PaymentMethod | null> {
    const rows = await this.database
      .prepare(
        `SELECT id, customer_id, provider_name, provider_reference, method_type,
                status, idempotency_key, request_fingerprint, created_at, updated_at
         FROM payment_methods
         WHERE customer_id = ? AND id = ?
         LIMIT 1`,
      )
      .bind(customerId, methodId)
      .all<PaymentMethodRow>();
    const row = rows.results[0];
    return row ? mapPaymentMethod(row) : null;
  }

  async findPaymentMethodByProviderReference(
    customerId: string,
    providerReference: string,
  ): Promise<PaymentMethod | null> {
    const rows = await this.database
      .prepare(
        `SELECT id, customer_id, provider_name, provider_reference, method_type,
                status, idempotency_key, request_fingerprint, created_at, updated_at
         FROM payment_methods
         WHERE customer_id = ? AND provider_reference = ?
         LIMIT 1`,
      )
      .bind(customerId, providerReference)
      .all<PaymentMethodRow>();
    const row = rows.results[0];
    return row ? mapPaymentMethod(row) : null;
  }

  async findPaymentMethodRevocationByIdempotencyKey(
    customerId: string,
    idempotencyKey: string,
  ): Promise<PaymentMethodRevocation | null> {
    const rows = await this.database
      .prepare(
        `SELECT id, customer_id, payment_method_id, idempotency_key,
                request_fingerprint, created_at, updated_at
         FROM payment_method_revocations
         WHERE customer_id = ? AND idempotency_key = ?
         LIMIT 1`,
      )
      .bind(customerId, idempotencyKey)
      .all<PaymentMethodRevocationRow>();
    const row = rows.results[0];
    return row
      ? {
          id: row.id,
          customerId: row.customer_id,
          paymentMethodId: row.payment_method_id,
          idempotencyKey: row.idempotency_key,
          requestFingerprint: row.request_fingerprint,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      : null;
  }

  async listPaymentMethods(customerId: string): Promise<readonly PaymentMethod[]> {
    const rows = await this.database
      .prepare(
        `SELECT id, customer_id, provider_name, provider_reference, method_type,
                status, idempotency_key, request_fingerprint, created_at, updated_at
         FROM payment_methods
         WHERE customer_id = ? AND status = 'active'
         ORDER BY created_at ASC, id ASC`,
      )
      .bind(customerId)
      .all<PaymentMethodRow>();
    return rows.results.map(mapPaymentMethod);
  }

  async listPaymentHistory(customerId: string): Promise<readonly PaymentHistoryEntry[]> {
    const rows = await this.database
      .prepare(
        `SELECT a.id, a.customer_id, 'charge' AS kind, a.order_id, a.id AS payment_attempt_id,
              a.amount_centavos, a.status, a.updated_at AS occurred_at
       FROM payment_attempts a WHERE a.customer_id = ?
       UNION ALL
       SELECT r.id, r.customer_id, 'refund' AS kind, NULL AS order_id, r.payment_attempt_id,
              r.amount_centavos, r.status, r.updated_at AS occurred_at
       FROM payment_refunds r WHERE r.customer_id = ?
       ORDER BY occurred_at DESC, id DESC`,
      )
      .bind(customerId, customerId)
      .all<PaymentHistoryRow>();
    return rows.results.map((row) => ({
      id: row.id,
      customerId: row.customer_id,
      kind: row.kind,
      orderId: row.order_id,
      paymentAttemptId: row.payment_attempt_id,
      amount: { centavos: row.amount_centavos, currency: "PHP" },
      status: row.status,
      occurredAt: row.occurred_at,
    }));
  }

  async savePaymentMethod(method: PaymentMethod): Promise<void> {
    const value = createPaymentMethod(method);
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO payment_methods (
             id, customer_id, provider_name, provider_reference, method_type,
             status, idempotency_key, request_fingerprint, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             status = excluded.status,
             updated_at = excluded.updated_at`,
        )
        .bind(
          value.id,
          value.customerId,
          value.providerName,
          value.providerReference,
          value.type,
          value.status,
          value.idempotencyKey,
          value.requestFingerprint,
          value.createdAt,
          value.updatedAt,
        ),
    ]);
  }

  async saveRevokedPaymentMethod(
    method: PaymentMethod,
    revocation: PaymentMethodRevocation,
  ): Promise<void> {
    const value = createPaymentMethod(method);
    await this.database.batch([
      this.database
        .prepare(
          `UPDATE payment_methods SET status = ?, updated_at = ?
           WHERE id = ? AND customer_id = ? AND status = 'active'`,
        )
        .bind(value.status, value.updatedAt, value.id, value.customerId),
      this.database
        .prepare(
          `INSERT INTO payment_method_revocations (
             id, customer_id, payment_method_id, idempotency_key,
             request_fingerprint, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          revocation.id,
          revocation.customerId,
          revocation.paymentMethodId,
          revocation.idempotencyKey,
          revocation.requestFingerprint,
          revocation.createdAt,
          revocation.updatedAt,
        ),
    ]);
  }

  async findPaymentAttemptById(id: string): Promise<PaymentAttempt | null> {
    const rows = await this.database
      .prepare(
        `SELECT id, customer_id, order_id, provider_name, amount_centavos,
                status, provider_reference, failure_code, idempotency_key,
                request_fingerprint, created_at, updated_at
         FROM payment_attempts
         WHERE id = ?
         LIMIT 1`,
      )
      .bind(id)
      .all<PaymentAttemptRow>();
    const row = rows.results[0];
    return row ? mapPaymentAttempt(row) : null;
  }

  async findPaymentAttemptByIdempotencyKey(
    customerId: string,
    idempotencyKey: string,
  ): Promise<PaymentAttempt | null> {
    const rows = await this.database
      .prepare(
        `SELECT id, customer_id, order_id, provider_name, amount_centavos,
                status, provider_reference, failure_code, idempotency_key,
                request_fingerprint, created_at, updated_at
         FROM payment_attempts
         WHERE customer_id = ? AND idempotency_key = ?
         LIMIT 1`,
      )
      .bind(customerId, idempotencyKey)
      .all<PaymentAttemptRow>();
    const row = rows.results[0];
    return row ? mapPaymentAttempt(row) : null;
  }

  async findPaymentAttemptByProviderReference(
    providerName: string,
    providerReference: string,
  ): Promise<PaymentAttempt | null> {
    const rows = await this.database
      .prepare(
        `SELECT id, customer_id, order_id, provider_name, amount_centavos,
                status, provider_reference, failure_code, idempotency_key,
                request_fingerprint, created_at, updated_at
         FROM payment_attempts
         WHERE provider_name = ? AND provider_reference = ?
         LIMIT 1`,
      )
      .bind(providerName, providerReference)
      .all<PaymentAttemptRow>();
    const row = rows.results[0];
    return row ? mapPaymentAttempt(row) : null;
  }

  async savePaymentAttempt(attempt: PaymentAttempt): Promise<void> {
    await this.database.batch([paymentAttemptStatement(this.database, attempt)]);
  }

  async savePaymentAttemptAndLedger(
    attempt: PaymentAttempt,
    entry: PaymentLedgerEntry,
  ): Promise<void> {
    await this.database.batch([
      paymentAttemptStatement(this.database, attempt),
      ledgerStatement(this.database, entry),
    ]);
  }

  async findRefundByIdempotencyKey(
    customerId: string,
    idempotencyKey: string,
  ): Promise<Refund | null> {
    const rows = await this.database
      .prepare(
        `SELECT id, customer_id, payment_attempt_id, provider_name,
                provider_reference, amount_centavos, status, reason,
                idempotency_key, request_fingerprint, created_at, updated_at
         FROM payment_refunds
         WHERE customer_id = ? AND idempotency_key = ?
         LIMIT 1`,
      )
      .bind(customerId, idempotencyKey)
      .all<RefundRow>();
    const row = rows.results[0];
    return row ? mapRefund(row) : null;
  }

  async findRefundByProviderReference(
    providerName: string,
    providerReference: string,
  ): Promise<Refund | null> {
    const rows = await this.database
      .prepare(
        `SELECT id, customer_id, payment_attempt_id, provider_name,
                provider_reference, amount_centavos, status, reason,
                idempotency_key, request_fingerprint, created_at, updated_at
         FROM payment_refunds
         WHERE provider_name = ? AND provider_reference = ?
         LIMIT 1`,
      )
      .bind(providerName, providerReference)
      .all<RefundRow>();
    const row = rows.results[0];
    return row ? mapRefund(row) : null;
  }

  async saveRefund(refund: Refund): Promise<void> {
    await this.database.batch([refundStatement(this.database, refund)]);
  }

  async saveRefundAndLedger(refund: Refund, entry: PaymentLedgerEntry): Promise<void> {
    await this.database.batch([
      refundStatement(this.database, refund),
      ledgerStatement(this.database, entry),
    ]);
  }

  async appendLedgerEntry(entry: PaymentLedgerEntry): Promise<void> {
    await this.database.batch([ledgerStatement(this.database, entry)]);
  }

  async recordWebhook(event: PaymentWebhookEvent): Promise<boolean> {
    const statement = this.database.prepare(
      `INSERT OR IGNORE INTO payment_webhook_events (
         id, provider_name, event_type, occurred_at, data_json, received_at
       ) VALUES (?, ?, ?, ?, ?, ?)`,
    ) as PaymentPreparedStatement;
    const result = await (
      statement.bind(
        event.id,
        event.providerName,
        event.type,
        event.occurredAt,
        JSON.stringify(event.data),
        event.receivedAt,
      ) as PaymentPreparedStatement
    ).run();
    return result.meta?.changes === 1;
  }

  async listPaymentAttempts(
    providerName: string,
    from: string,
    to: string,
  ): Promise<readonly PaymentAttempt[]> {
    const rows = await this.database
      .prepare(
        `SELECT id, customer_id, order_id, provider_name, amount_centavos,
                status, provider_reference, failure_code, idempotency_key,
                request_fingerprint, created_at, updated_at
         FROM payment_attempts
         WHERE provider_name = ? AND updated_at >= ? AND updated_at <= ?
         ORDER BY updated_at ASC, id ASC`,
      )
      .bind(providerName, from, to)
      .all<PaymentAttemptRow>();
    return rows.results.map(mapPaymentAttempt);
  }

  async listRefunds(providerName: string, from: string, to: string): Promise<readonly Refund[]> {
    const rows = await this.database
      .prepare(
        `SELECT id, customer_id, payment_attempt_id, provider_name,
                provider_reference, amount_centavos, status, reason,
                idempotency_key, request_fingerprint, created_at, updated_at
         FROM payment_refunds
         WHERE provider_name = ? AND updated_at >= ? AND updated_at <= ?
         ORDER BY updated_at ASC, id ASC`,
      )
      .bind(providerName, from, to)
      .all<RefundRow>();
    return rows.results.map(mapRefund);
  }

  async saveReconciliationDiscrepancy(discrepancy: ReconciliationDiscrepancy): Promise<void> {
    const value = createReconciliationDiscrepancy(discrepancy);
    await this.database.batch([
      this.database
        .prepare(
          `INSERT OR IGNORE INTO payment_reconciliation_discrepancies (
             id, provider_name, reference, entity_type, discrepancy_kind,
             expected_status, actual_status, expected_amount_centavos,
             actual_amount_centavos, observed_at, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          value.id,
          value.providerName,
          value.reference,
          value.entityType,
          value.kind,
          value.expectedStatus,
          value.actualStatus,
          value.expectedAmount?.centavos ?? null,
          value.actualAmount?.centavos ?? null,
          value.observedAt,
          value.createdAt,
        ),
    ]);
  }
}

function paymentAttemptStatement(
  database: PaymentDatabase,
  attempt: PaymentAttempt,
): CatalogPreparedStatement {
  const value = createPaymentAttempt(attempt);
  return database
    .prepare(
      `INSERT INTO payment_attempts (
         id, customer_id, order_id, provider_name, amount_centavos, status,
         provider_reference, failure_code, idempotency_key, request_fingerprint,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         status = excluded.status,
         provider_reference = excluded.provider_reference,
         failure_code = excluded.failure_code,
         updated_at = excluded.updated_at`,
    )
    .bind(
      value.id,
      value.customerId,
      value.orderId,
      value.providerName,
      value.amount.centavos,
      value.status,
      value.providerReference,
      value.failureCode,
      value.idempotencyKey,
      value.requestFingerprint,
      value.createdAt,
      value.updatedAt,
    );
}

function refundStatement(database: PaymentDatabase, refund: Refund): CatalogPreparedStatement {
  const value = createRefund(refund);
  return database
    .prepare(
      `INSERT INTO payment_refunds (
         id, customer_id, payment_attempt_id, provider_name, provider_reference,
         amount_centavos, status, reason, idempotency_key, request_fingerprint,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         provider_reference = excluded.provider_reference,
         status = excluded.status,
         updated_at = excluded.updated_at`,
    )
    .bind(
      value.id,
      value.customerId,
      value.paymentAttemptId,
      value.providerName,
      value.providerReference,
      value.amount.centavos,
      value.status,
      value.reason,
      value.idempotencyKey,
      value.requestFingerprint,
      value.createdAt,
      value.updatedAt,
    );
}

function ledgerStatement(
  database: PaymentDatabase,
  entry: PaymentLedgerEntry,
): CatalogPreparedStatement {
  const value = createPaymentLedgerEntry(entry);
  return database
    .prepare(
      `INSERT OR IGNORE INTO payment_ledger_entries (
         id, customer_id, payment_attempt_id, refund_id, entry_type,
         direction, amount_centavos, occurred_at, metadata_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      value.id,
      value.customerId,
      value.paymentAttemptId,
      value.refundId,
      value.type,
      value.direction,
      value.amount.centavos,
      value.occurredAt,
      JSON.stringify(value.metadata),
    );
}

function mapPaymentAttempt(row: PaymentAttemptRow): PaymentAttempt {
  return createPaymentAttempt({
    id: row.id,
    customerId: row.customer_id,
    orderId: row.order_id,
    providerName: row.provider_name,
    amount: { centavos: row.amount_centavos, currency: "PHP" },
    status: row.status,
    providerReference: row.provider_reference,
    failureCode: row.failure_code,
    idempotencyKey: row.idempotency_key,
    requestFingerprint: row.request_fingerprint,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapPaymentMethod(row: PaymentMethodRow): PaymentMethod {
  return createPaymentMethod({
    id: row.id,
    customerId: row.customer_id,
    providerName: row.provider_name,
    providerReference: row.provider_reference,
    type: row.method_type,
    status: row.status,
    idempotencyKey: row.idempotency_key,
    requestFingerprint: row.request_fingerprint,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapRefund(row: RefundRow): Refund {
  return createRefund({
    id: row.id,
    customerId: row.customer_id,
    paymentAttemptId: row.payment_attempt_id,
    providerName: row.provider_name,
    providerReference: row.provider_reference,
    amount: { centavos: row.amount_centavos, currency: "PHP" },
    status: row.status,
    reason: row.reason,
    idempotencyKey: row.idempotency_key,
    requestFingerprint: row.request_fingerprint,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

type PaymentPreparedStatement = CatalogPreparedStatement & {
  run(): Promise<{ meta?: { changes?: number } }>;
};

type PaymentAttemptRow = Record<string, unknown> & {
  id: string;
  customer_id: string;
  order_id: string;
  provider_name: string;
  amount_centavos: number;
  status: PaymentAttempt["status"];
  provider_reference: string | null;
  failure_code: string | null;
  idempotency_key: string;
  request_fingerprint: string;
  created_at: string;
  updated_at: string;
};

type PaymentMethodRow = Record<string, unknown> & {
  id: string;
  customer_id: string;
  provider_name: string;
  provider_reference: string;
  method_type: PaymentMethod["type"];
  status: PaymentMethod["status"];
  idempotency_key: string;
  request_fingerprint: string;
  created_at: string;
  updated_at: string;
};

type PaymentMethodRevocationRow = Record<string, unknown> & {
  id: string;
  customer_id: string;
  payment_method_id: string;
  idempotency_key: string;
  request_fingerprint: string;
  created_at: string;
  updated_at: string;
};

type RefundRow = Record<string, unknown> & {
  id: string;
  customer_id: string;
  payment_attempt_id: string;
  provider_name: string;
  provider_reference: string | null;
  amount_centavos: number;
  status: Refund["status"];
  reason: string;
  idempotency_key: string;
  request_fingerprint: string;
  created_at: string;
  updated_at: string;
};

type PaymentHistoryRow = Record<string, unknown> & {
  id: string;
  customer_id: string;
  kind: "charge" | "refund";
  order_id: string | null;
  payment_attempt_id: string | null;
  amount_centavos: number;
  status: "pending" | "succeeded" | "failed";
  occurred_at: string;
};
