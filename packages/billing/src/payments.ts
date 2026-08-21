import { createMoney, type Money } from "@carbon/domain";

export type PaymentAttemptStatus = "pending" | "succeeded" | "failed";
export type RefundStatus = "succeeded" | "failed";
export type PaymentMethodType = "card" | "bank_account" | "ewallet";
export type PaymentMethodStatus = "active" | "revoked";
export type PaymentMethodRevocation = Readonly<{
  id: string;
  customerId: string;
  paymentMethodId: string;
  idempotencyKey: string;
  requestFingerprint: string;
  createdAt: string;
  updatedAt: string;
}>;
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

export type PaymentMethod = Readonly<{
  id: string;
  customerId: string;
  providerName: string;
  providerReference: string;
  type: PaymentMethodType;
  status: PaymentMethodStatus;
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

export type PaymentHistoryEntry = Readonly<{
  id: string;
  customerId: string;
  kind: "charge" | "refund";
  orderId: string | null;
  paymentAttemptId: string | null;
  amount: Money;
  status: "pending" | "succeeded" | "failed";
  occurredAt: string;
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
  findPaymentMethodByIdempotencyKey(
    customerId: string,
    idempotencyKey: string,
  ): Promise<PaymentMethod | null>;
  findPaymentMethodById(customerId: string, methodId: string): Promise<PaymentMethod | null>;
  findPaymentMethodByProviderReference(
    customerId: string,
    providerReference: string,
  ): Promise<PaymentMethod | null>;
  findPaymentMethodRevocationByIdempotencyKey(
    customerId: string,
    idempotencyKey: string,
  ): Promise<PaymentMethodRevocation | null>;
  listPaymentMethods(customerId: string): Promise<readonly PaymentMethod[]>;
  savePaymentMethod(method: PaymentMethod): Promise<void>;
  saveRevokedPaymentMethod(
    method: PaymentMethod,
    revocation: PaymentMethodRevocation,
  ): Promise<void>;
  findPaymentAttemptById(id: string): Promise<PaymentAttempt | null>;
  findSuccessfulPaymentAttemptByOrder(
    customerId: string,
    orderId: string,
  ): Promise<PaymentAttempt | null>;
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
  listRefundsForPaymentAttempt(paymentAttemptId: string): Promise<readonly Refund[]>;
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
  listPaymentHistory(customerId: string): Promise<readonly PaymentHistoryEntry[]>;
}

export function createPaymentAttempt(input: PaymentAttempt): PaymentAttempt {
  return Object.freeze({ ...input, amount: createMoney(input.amount.centavos) });
}

export function createPaymentMethod(input: PaymentMethod): PaymentMethod {
  return Object.freeze({ ...input });
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
  private readonly paymentMethods = new Map<string, PaymentMethod>();
  private readonly paymentMethodRevocations = new Map<string, PaymentMethodRevocation>();
  private readonly attempts = new Map<string, PaymentAttempt>();
  private readonly refunds = new Map<string, Refund>();
  private readonly ledger = new Map<string, PaymentLedgerEntry>();
  private readonly webhooks = new Set<string>();
  private readonly discrepancies = new Map<string, ReconciliationDiscrepancy>();

  findPaymentMethodByIdempotencyKey(
    customerId: string,
    idempotencyKey: string,
  ): Promise<PaymentMethod | null> {
    return Promise.resolve(
      [...this.paymentMethods.values()].find(
        (method) => method.customerId === customerId && method.idempotencyKey === idempotencyKey,
      ) ?? null,
    );
  }

  listPaymentMethods(customerId: string): Promise<readonly PaymentMethod[]> {
    return Promise.resolve(
      [...this.paymentMethods.values()]
        .filter((method) => method.customerId === customerId && method.status === "active")
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    );
  }

  findPaymentMethodById(customerId: string, methodId: string): Promise<PaymentMethod | null> {
    const method = this.paymentMethods.get(methodId);
    return Promise.resolve(method?.customerId === customerId ? method : null);
  }

  findPaymentMethodByProviderReference(
    customerId: string,
    providerReference: string,
  ): Promise<PaymentMethod | null> {
    return Promise.resolve(
      [...this.paymentMethods.values()].find(
        (method) =>
          method.customerId === customerId && method.providerReference === providerReference,
      ) ?? null,
    );
  }

  findPaymentMethodRevocationByIdempotencyKey(
    customerId: string,
    idempotencyKey: string,
  ): Promise<PaymentMethodRevocation | null> {
    return Promise.resolve(
      [...this.paymentMethodRevocations.values()].find(
        (revocation) =>
          revocation.customerId === customerId && revocation.idempotencyKey === idempotencyKey,
      ) ?? null,
    );
  }

  savePaymentMethod(method: PaymentMethod): Promise<void> {
    this.paymentMethods.set(method.id, createPaymentMethod(method));
    return Promise.resolve();
  }

  saveRevokedPaymentMethod(
    method: PaymentMethod,
    revocation: PaymentMethodRevocation,
  ): Promise<void> {
    this.paymentMethods.set(method.id, createPaymentMethod(method));
    this.paymentMethodRevocations.set(revocation.id, Object.freeze({ ...revocation }));
    return Promise.resolve();
  }

  findPaymentAttemptById(id: string): Promise<PaymentAttempt | null> {
    return Promise.resolve(this.attempts.get(id) ?? null);
  }

  findSuccessfulPaymentAttemptByOrder(
    customerId: string,
    orderId: string,
  ): Promise<PaymentAttempt | null> {
    return Promise.resolve(
      [...this.attempts.values()]
        .filter(
          (attempt) =>
            attempt.customerId === customerId &&
            attempt.orderId === orderId &&
            attempt.status === "succeeded",
        )
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null,
    );
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

  listRefundsForPaymentAttempt(paymentAttemptId: string): Promise<readonly Refund[]> {
    return Promise.resolve(
      [...this.refunds.values()]
        .filter((refund) => refund.paymentAttemptId === paymentAttemptId)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
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

  listPaymentHistory(customerId: string): Promise<readonly PaymentHistoryEntry[]> {
    const charges: PaymentHistoryEntry[] = [...this.attempts.values()]
      .filter((attempt) => attempt.customerId === customerId)
      .map((attempt) => ({
        id: attempt.id,
        customerId,
        kind: "charge",
        orderId: attempt.orderId,
        paymentAttemptId: attempt.id,
        amount: createMoney(attempt.amount.centavos),
        status: attempt.status,
        occurredAt: attempt.updatedAt,
      }));
    const refunds: PaymentHistoryEntry[] = [...this.refunds.values()]
      .filter((refund) => refund.customerId === customerId)
      .map((refund) => {
        const attempt = this.attempts.get(refund.paymentAttemptId);
        return {
          id: refund.id,
          customerId,
          kind: "refund",
          orderId: attempt?.orderId ?? null,
          paymentAttemptId: refund.paymentAttemptId,
          amount: createMoney(refund.amount.centavos),
          status: refund.status,
          occurredAt: refund.updatedAt,
        };
      });
    return Promise.resolve(
      [...charges, ...refunds].sort((left, right) =>
        right.occurredAt.localeCompare(left.occurredAt),
      ),
    );
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
