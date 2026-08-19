import { createMoney, type Money } from "@carbon/domain";

import {
  type ChargeInput,
  type ChargeResult,
  type CreateCustomerInput,
  type CreatePaymentMethodInput,
  type PaymentCapabilities,
  type PaymentMethodRevocationResult,
  PaymentProviderError,
  type ProviderCustomer,
  type ProviderPaymentMethod,
  type ReconcileInput,
  type ReconciliationEntry,
  type ReconciliationResult,
  type RefundInput,
  type RefundResult,
  type ProviderRevokePaymentMethodInput,
  type VerifiedWebhook,
  type VerifyWebhookInput,
  type PaymentProvider,
} from "./provider.js";

export type FakePaymentProviderOptions = Readonly<{
  now?: () => Date;
  declinedPaymentAttemptIds?: readonly string[];
  pendingPaymentAttemptIds?: readonly string[];
}>;

type StoredResult = Readonly<{
  fingerprint: string;
  result: unknown;
}>;

const CAPABILITIES: PaymentCapabilities = Object.freeze({
  tokenizedCharges: true,
  paymentMethodRevocation: true,
  mandates: false,
  invoices: false,
  refunds: true,
  webhookVerification: true,
  reconciliation: true,
});

export class FakePaymentProvider implements PaymentProvider {
  readonly name = "fake";

  private readonly now: () => Date;
  private readonly declinedPaymentAttemptIds: ReadonlySet<string>;
  private readonly pendingPaymentAttemptIds: ReadonlySet<string>;
  private readonly idempotentResults = new Map<string, StoredResult>();
  private readonly charges = new Map<string, ChargeResult>();
  private readonly refunds = new Map<string, RefundResult>();
  private readonly paymentMethods = new Set<string>();
  private readonly revokedPaymentMethods = new Set<string>();

  constructor(options: FakePaymentProviderOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.declinedPaymentAttemptIds = new Set(options.declinedPaymentAttemptIds ?? []);
    this.pendingPaymentAttemptIds = new Set(options.pendingPaymentAttemptIds ?? []);
  }

  capabilities(): PaymentCapabilities {
    return CAPABILITIES;
  }

  async createCustomer(input: CreateCustomerInput): Promise<ProviderCustomer> {
    await Promise.resolve();
    const customerId = required(input.customerId, "customerId");
    const idempotencyKey = requiredIdempotencyKey(input.idempotencyKey);
    const result: ProviderCustomer = {
      reference: `fake-customer-${customerId}`,
      customerId,
    };
    return this.idempotent(
      "customer",
      idempotencyKey,
      { customerId, email: input.email ?? null },
      result,
    );
  }

  async createPaymentMethod(input: CreatePaymentMethodInput): Promise<ProviderPaymentMethod> {
    await Promise.resolve();
    const customerReference = required(input.customerReference, "customerReference");
    const token = required(input.token, "token");
    const idempotencyKey = requiredIdempotencyKey(input.idempotencyKey);
    const result: ProviderPaymentMethod = {
      reference: `fake-payment-method-${idempotencyKey}`,
      customerReference,
      type: input.type,
      status: "active",
    };
    this.paymentMethods.add(result.reference);
    return this.idempotent(
      "payment-method",
      idempotencyKey,
      { customerReference, type: input.type, token },
      result,
    );
  }

  async revokePaymentMethod(
    input: ProviderRevokePaymentMethodInput,
  ): Promise<PaymentMethodRevocationResult> {
    await Promise.resolve();
    const customerReference = required(input.customerReference, "customerReference");
    const paymentMethodReference = required(input.paymentMethodReference, "paymentMethodReference");
    const idempotencyKey = requiredIdempotencyKey(input.idempotencyKey);
    const fingerprint = { customerReference, paymentMethodReference };
    const replay = this.replay<PaymentMethodRevocationResult>(
      "payment-method-revocation",
      idempotencyKey,
      fingerprint,
    );
    if (replay) {
      return replay;
    }
    if (!this.paymentMethods.has(paymentMethodReference)) {
      throw new PaymentProviderError("PAYMENT_METHOD_NOT_FOUND", "payment method was not found");
    }
    const result: PaymentMethodRevocationResult = {
      status: this.revokedPaymentMethods.has(paymentMethodReference)
        ? "already_revoked"
        : "revoked",
    };
    this.revokedPaymentMethods.add(paymentMethodReference);
    return this.remember("payment-method-revocation", idempotencyKey, fingerprint, result);
  }

  async charge(input: ChargeInput): Promise<ChargeResult> {
    await Promise.resolve();
    const paymentAttemptId = required(input.paymentAttemptId, "paymentAttemptId");
    const customerReference = required(input.customerReference, "customerReference");
    const paymentMethodReference = required(input.paymentMethodReference, "paymentMethodReference");
    const idempotencyKey = requiredIdempotencyKey(input.idempotencyKey);
    assertChargeAmount(input.amount);
    if (this.revokedPaymentMethods.has(paymentMethodReference)) {
      throw new PaymentProviderError("PAYMENT_METHOD_REVOKED", "payment method is revoked");
    }
    const processedAt = this.timestamp();
    const status = this.declinedPaymentAttemptIds.has(paymentAttemptId)
      ? "failed"
      : this.pendingPaymentAttemptIds.has(paymentAttemptId)
        ? "pending"
        : "succeeded";
    const result: ChargeResult = Object.freeze({
      reference: `fake-charge-${paymentAttemptId}`,
      status,
      amount: copyMoney(input.amount),
      failureCode: status === "failed" ? "declined" : null,
      processedAt,
    });
    const resolved = this.idempotent(
      "charge",
      idempotencyKey,
      {
        paymentAttemptId,
        customerReference,
        paymentMethodReference,
        amount: input.amount,
      },
      result,
    );
    this.charges.set(resolved.reference, resolved);
    return resolved;
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    await Promise.resolve();
    const refundId = required(input.refundId, "refundId");
    const chargeReference = required(input.chargeReference, "chargeReference");
    const reason = required(input.reason, "reason");
    const idempotencyKey = requiredIdempotencyKey(input.idempotencyKey);
    assertChargeAmount(input.amount);
    const fingerprint = { refundId, chargeReference, amount: input.amount, reason };
    const replay = this.replay<RefundResult>("refund", idempotencyKey, fingerprint);
    if (replay) {
      return replay;
    }
    const charge = this.charges.get(chargeReference);
    if (!charge || charge.status !== "succeeded") {
      throw new PaymentProviderError("CHARGE_NOT_REFUNDABLE", "charge is not refundable");
    }
    const refundedCentavos = [...this.refunds.values()]
      .filter(
        (refund) => refund.chargeReference === chargeReference && refund.status === "succeeded",
      )
      .reduce((total, refund) => total + refund.amount.centavos, 0);
    if (refundedCentavos + input.amount.centavos > charge.amount.centavos) {
      throw new PaymentProviderError("REFUND_EXCEEDS_CHARGE", "refund exceeds the charge amount");
    }
    const result: RefundResult = Object.freeze({
      reference: `fake-refund-${refundId}`,
      chargeReference,
      status: "succeeded",
      amount: copyMoney(input.amount),
      processedAt: this.timestamp(),
    });
    const resolved = this.remember("refund", idempotencyKey, fingerprint, result);
    this.refunds.set(resolved.reference, resolved);
    return resolved;
  }

  async verifyWebhook(input: VerifyWebhookInput): Promise<VerifiedWebhook> {
    await Promise.resolve();
    if (input.signature.trim().length === 0) {
      throw new PaymentProviderError("INVALID_WEBHOOK_SIGNATURE", "webhook signature is required");
    }
    let event: unknown;
    try {
      event = JSON.parse(input.rawBody) as unknown;
    } catch {
      throw new PaymentProviderError("INVALID_WEBHOOK", "webhook payload is invalid JSON");
    }
    if (!isWebhook(event)) {
      throw new PaymentProviderError("INVALID_WEBHOOK", "webhook payload is invalid");
    }
    if (input.signature !== `fake:${event.id}`) {
      throw new PaymentProviderError("INVALID_WEBHOOK_SIGNATURE", "webhook signature is invalid");
    }
    if (Number.isNaN(Date.parse(event.occurredAt))) {
      throw new PaymentProviderError("INVALID_WEBHOOK", "webhook timestamp is invalid");
    }
    return Object.freeze({ ...event, data: Object.freeze({ ...event.data }) });
  }

  async reconcile(input: ReconcileInput): Promise<ReconciliationResult> {
    await Promise.resolve();
    const from = parseTimestamp(input.from, "from");
    const to = parseTimestamp(input.to, "to");
    if (from > to) {
      throw new PaymentProviderError("INVALID_RECONCILIATION_RANGE", "from must be before to");
    }
    const entries: ReconciliationEntry[] = [
      ...[...this.charges.values()].map((charge) => ({
        reference: charge.reference,
        type: "charge" as const,
        status: charge.status,
        amount: charge.amount,
        occurredAt: charge.processedAt,
      })),
      ...[...this.refunds.values()].map((refund) => ({
        reference: refund.reference,
        type: "refund" as const,
        status: refund.status,
        amount: refund.amount,
        occurredAt: refund.processedAt,
      })),
    ]
      .filter((entry) => {
        const occurredAt = Date.parse(entry.occurredAt);
        return occurredAt >= from && occurredAt <= to;
      })
      .sort((left, right) => left.reference.localeCompare(right.reference));
    return Object.freeze({ entries: Object.freeze(entries) });
  }

  private idempotent<T>(operation: string, key: string, input: unknown, result: T): T {
    return this.replay<T>(operation, key, input) ?? this.remember(operation, key, input, result);
  }

  private replay<T>(operation: string, key: string, input: unknown): T | null {
    const mapKey = `${operation}:${key}`;
    const fingerprint = JSON.stringify(input);
    const existing = this.idempotentResults.get(mapKey);
    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        throw new PaymentProviderError("IDEMPOTENCY_KEY_REUSED", "idempotency key was reused");
      }
      return existing.result as T;
    }
    return null;
  }

  private remember<T>(operation: string, key: string, input: unknown, result: T): T {
    const mapKey = `${operation}:${key}`;
    const fingerprint = JSON.stringify(input);
    this.idempotentResults.set(mapKey, { fingerprint, result });
    return result;
  }

  private timestamp(): string {
    return this.now().toISOString();
  }
}

function required(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 256) {
    throw new PaymentProviderError(
      "INVALID_INPUT",
      `${field} must be between 1 and 256 characters`,
    );
  }
  return normalized;
}

function requiredIdempotencyKey(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 128) {
    throw new PaymentProviderError(
      "INVALID_IDEMPOTENCY_KEY",
      "idempotency key must be between 1 and 128 characters",
    );
  }
  return normalized;
}

function assertChargeAmount(amount: Money): void {
  if (amount.currency !== "PHP" || !Number.isSafeInteger(amount.centavos) || amount.centavos <= 0) {
    throw new PaymentProviderError("INVALID_AMOUNT", "amount must be a positive PHP amount");
  }
}

function copyMoney(amount: Money): Money {
  return createMoney(amount.centavos);
}

function parseTimestamp(value: string, field: string): number {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    throw new PaymentProviderError("INVALID_TIMESTAMP", `${field} must be an ISO timestamp`);
  }
  return timestamp;
}

function isWebhook(value: unknown): value is VerifiedWebhook {
  if (!value || typeof value !== "object") {
    return false;
  }
  const event = value as Partial<VerifiedWebhook>;
  const types = new Set(["charge.succeeded", "charge.failed", "refund.succeeded", "refund.failed"]);
  return (
    typeof event.id === "string" &&
    typeof event.type === "string" &&
    types.has(event.type) &&
    typeof event.occurredAt === "string" &&
    event.data !== null &&
    typeof event.data === "object" &&
    !Array.isArray(event.data)
  );
}
