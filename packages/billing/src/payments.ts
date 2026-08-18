import { createMoney, type Money } from "@carbon/domain";

export type PaymentAttemptStatus = "pending" | "succeeded" | "failed";
export type RefundStatus = "succeeded" | "failed";
export type PaymentLedgerEntryType = "charge" | "refund" | "adjustment";
export type PaymentLedgerDirection = "debit" | "credit";
export type ReconciliationDiscrepancyKind =
  "missing_provider_entry" | "unexpected_provider_entry" | "status_mismatch" | "amount_mismatch";

export type PaymentAttempt = Readonly<{
  id: string;
  customerId: string;
  orderId: string;
  providerName: string;
  amount: Money;
  status: PaymentAttemptStatus;
  providerReference: string | null;
  failureCode: string | null;
  idempotencyKey: string;
  requestFingerprint: string;
  createdAt: string;
  updatedAt: string;
}>;

export type PaymentWebhookEvent = Readonly<{
  id: string;
  providerName: string;
  type: string;
  occurredAt: string;
  data: Readonly<Record<string, unknown>>;
  receivedAt: string;
}>;

export type Refund = Readonly<{
  id: string;
  customerId: string;
  paymentAttemptId: string;
  providerName: string;
  providerReference: string | null;
  amount: Money;
  status: RefundStatus;
  reason: string;
  idempotencyKey: string;
  requestFingerprint: string;
  createdAt: string;
  updatedAt: string;
}>;

export type PaymentLedgerEntry = Readonly<{
  id: string;
  customerId: string;
  paymentAttemptId: string | null;
  refundId: string | null;
  type: PaymentLedgerEntryType;
  direction: PaymentLedgerDirection;
  amount: Money;
  occurredAt: string;
  metadata: Readonly<Record<string, unknown>>;
}>;

export type ReconciliationDiscrepancy = Readonly<{
  id: string;
  providerName: string;
  reference: string;
  entityType: "charge" | "refund";
  kind: ReconciliationDiscrepancyKind;
  expectedStatus: string | null;
  actualStatus: string | null;
  expectedAmount: Money | null;
  actualAmount: Money | null;
  observedAt: string;
  createdAt: string;
}>;

export interface PaymentRepository {
  findPaymentAttemptById(id: string): Promise<PaymentAttempt | null>;
  findPaymentAttemptByIdempotencyKey(
    customerId: string,
    idempotencyKey: string,
  ): Promise<PaymentAttempt | null>;
  findPaymentAttemptByProviderReference(
    providerName: string,
    providerReference: string,
  ): Promise<PaymentAttempt | null>;
  savePaymentAttempt(attempt: PaymentAttempt): Promise<void>;
  savePaymentAttemptAndLedger(attempt: PaymentAttempt, entry: PaymentLedgerEntry): Promise<void>;
  findRefundByIdempotencyKey(customerId: string, idempotencyKey: string): Promise<Refund | null>;
  findRefundByProviderReference(
    providerName: string,
    providerReference: string,
  ): Promise<Refund | null>;
  saveRefund(refund: Refund): Promise<void>;
  saveRefundAndLedger(refund: Refund, entry: PaymentLedgerEntry): Promise<void>;
  appendLedgerEntry(entry: PaymentLedgerEntry): Promise<void>;
  recordWebhook(event: PaymentWebhookEvent): Promise<boolean>;
  listPaymentAttempts(
    providerName: string,
    from: string,
    to: string,
  ): Promise<readonly PaymentAttempt[]>;
  listRefunds(providerName: string, from: string, to: string): Promise<readonly Refund[]>;
  saveReconciliationDiscrepancy(discrepancy: ReconciliationDiscrepancy): Promise<void>;
}

export function createPaymentAttempt(input: PaymentAttempt): PaymentAttempt {
  return Object.freeze({ ...input, amount: createMoney(input.amount.centavos) });
}

export function createPaymentWebhookEvent(input: PaymentWebhookEvent): PaymentWebhookEvent {
  return Object.freeze({ ...input, data: Object.freeze({ ...input.data }) });
}

export function createRefund(input: Refund): Refund {
  return Object.freeze({ ...input, amount: createMoney(input.amount.centavos) });
}

export function createPaymentLedgerEntry(input: PaymentLedgerEntry): PaymentLedgerEntry {
  return Object.freeze({
    ...input,
    amount: createMoney(input.amount.centavos),
    metadata: Object.freeze({ ...input.metadata }),
  });
}

export class InMemoryPaymentRepository implements PaymentRepository {
  private readonly attempts = new Map<string, PaymentAttempt>();
  private readonly refunds = new Map<string, Refund>();
  private readonly ledger = new Map<string, PaymentLedgerEntry>();
  private readonly webhooks = new Set<string>();
  private readonly discrepancies = new Map<string, ReconciliationDiscrepancy>();

  findPaymentAttemptById(id: string): Promise<PaymentAttempt | null> {
    return Promise.resolve(this.attempts.get(id) ?? null);
  }

  findPaymentAttemptByIdempotencyKey(
    customerId: string,
    idempotencyKey: string,
  ): Promise<PaymentAttempt | null> {
    return Promise.resolve(
      [...this.attempts.values()].find(
        (attempt) => attempt.customerId === customerId && attempt.idempotencyKey === idempotencyKey,
      ) ?? null,
    );
  }

  findPaymentAttemptByProviderReference(
    providerName: string,
    providerReference: string,
  ): Promise<PaymentAttempt | null> {
    return Promise.resolve(
      [...this.attempts.values()].find(
        (attempt) =>
          attempt.providerName === providerName && attempt.providerReference === providerReference,
      ) ?? null,
    );
  }

  savePaymentAttempt(attempt: PaymentAttempt): Promise<void> {
    this.attempts.set(attempt.id, createPaymentAttempt(attempt));
    return Promise.resolve();
  }

  async savePaymentAttemptAndLedger(
    attempt: PaymentAttempt,
    entry: PaymentLedgerEntry,
  ): Promise<void> {
    await this.savePaymentAttempt(attempt);
    await this.appendLedgerEntry(entry);
  }

  findRefundByIdempotencyKey(customerId: string, idempotencyKey: string): Promise<Refund | null> {
    return Promise.resolve(
      [...this.refunds.values()].find(
        (refund) => refund.customerId === customerId && refund.idempotencyKey === idempotencyKey,
      ) ?? null,
    );
  }

  findRefundByProviderReference(
    providerName: string,
    providerReference: string,
  ): Promise<Refund | null> {
    return Promise.resolve(
      [...this.refunds.values()].find(
        (refund) =>
          refund.providerName === providerName && refund.providerReference === providerReference,
      ) ?? null,
    );
  }

  saveRefund(refund: Refund): Promise<void> {
    this.refunds.set(refund.id, createRefund(refund));
    return Promise.resolve();
  }

  async saveRefundAndLedger(refund: Refund, entry: PaymentLedgerEntry): Promise<void> {
    await this.saveRefund(refund);
    await this.appendLedgerEntry(entry);
  }

  appendLedgerEntry(entry: PaymentLedgerEntry): Promise<void> {
    this.ledger.set(entry.id, createPaymentLedgerEntry(entry));
    return Promise.resolve();
  }

  recordWebhook(event: PaymentWebhookEvent): Promise<boolean> {
    const value = createPaymentWebhookEvent(event);
    const key = `${value.providerName}:${value.id}`;
    if (this.webhooks.has(key)) {
      return Promise.resolve(false);
    }
    this.webhooks.add(key);
    return Promise.resolve(true);
  }

  listPaymentAttempts(
    providerName: string,
    from: string,
    to: string,
  ): Promise<readonly PaymentAttempt[]> {
    const fromTime = Date.parse(from);
    const toTime = Date.parse(to);
    return Promise.resolve(
      [...this.attempts.values()].filter(
        (attempt) =>
          attempt.providerName === providerName &&
          Date.parse(attempt.updatedAt) >= fromTime &&
          Date.parse(attempt.updatedAt) <= toTime,
      ),
    );
  }

  listRefunds(providerName: string, from: string, to: string): Promise<readonly Refund[]> {
    const fromTime = Date.parse(from);
    const toTime = Date.parse(to);
    return Promise.resolve(
      [...this.refunds.values()].filter(
        (refund) =>
          refund.providerName === providerName &&
          Date.parse(refund.updatedAt) >= fromTime &&
          Date.parse(refund.updatedAt) <= toTime,
      ),
    );
  }

  saveReconciliationDiscrepancy(discrepancy: ReconciliationDiscrepancy): Promise<void> {
    this.discrepancies.set(discrepancy.id, createReconciliationDiscrepancy(discrepancy));
    return Promise.resolve();
  }

  get ledgerEntries(): readonly PaymentLedgerEntry[] {
    return [...this.ledger.values()];
  }

  get reconciliationDiscrepancies(): readonly ReconciliationDiscrepancy[] {
    return [...this.discrepancies.values()];
  }
}

export function createReconciliationDiscrepancy(
  input: ReconciliationDiscrepancy,
): ReconciliationDiscrepancy {
  return Object.freeze({
    ...input,
    expectedAmount: input.expectedAmount ? createMoney(input.expectedAmount.centavos) : null,
    actualAmount: input.actualAmount ? createMoney(input.actualAmount.centavos) : null,
  });
}
