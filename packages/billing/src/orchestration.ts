import type { Money } from "@carbon/domain";

import {
  createPaymentAttempt,
  createPaymentLedgerEntry,
  createPaymentWebhookEvent,
  createPaymentMethod,
  createRefund,
  type PaymentAttempt,
  type PaymentLedgerEntry,
  type PaymentMethod,
  type PaymentHistoryEntry,
  type PaymentMethodRevocation,
  type PaymentRepository,
  type Refund,
} from "./payments.js";
import { PaymentProviderError, type PaymentProvider, type VerifiedWebhook } from "./provider.js";

export type ChargePaymentInput = Readonly<{
  customerId: string;
  orderId: string;
  customerReference: string;
  paymentMethodReference: string;
  amount: Money;
  idempotencyKey: string;
  now: string;
}>;

export type AddPaymentMethodInput = Readonly<{
  customerId: string;
  customerReference: string;
  type: "card" | "bank_account" | "ewallet";
  token: string;
  idempotencyKey: string;
  now: string;
}>;

export type RefundPaymentInput = Readonly<{
  customerId: string;
  paymentAttemptId: string;
  amount: Money;
  reason: string;
  idempotencyKey: string;
  now: string;
}>;

export type RevokePaymentMethodInput = Readonly<{
  customerId: string;
  customerReference: string;
  paymentMethodId: string;
  idempotencyKey: string;
  now: string;
}>;

export type PaymentWebhookInput = Readonly<{
  providerName: string;
  event: VerifiedWebhook;
  receivedAt: string;
}>;

export type PaymentWebhookResult = Readonly<{
  duplicate: boolean;
  applied: boolean;
}>;

export interface PaymentService {
  addPaymentMethod(input: AddPaymentMethodInput): Promise<PaymentMethod>;
  listPaymentMethods(customerId: string): Promise<readonly PaymentMethod[]>;
  listPaymentHistory(customerId: string): Promise<readonly PaymentHistoryEntry[]>;
  revokePaymentMethod(input: RevokePaymentMethodInput): Promise<PaymentMethod>;
  charge(input: ChargePaymentInput): Promise<PaymentAttempt>;
  refund(input: RefundPaymentInput): Promise<Refund>;
  handleWebhook(input: PaymentWebhookInput): Promise<PaymentWebhookResult>;
}

export class DefaultPaymentService implements PaymentService {
  private readonly inFlight = new Map<string, Promise<PaymentAttempt>>();

  constructor(
    private readonly repository: PaymentRepository,
    private readonly provider: PaymentProvider,
    private readonly generateId: () => string = () => crypto.randomUUID(),
  ) {}

  async addPaymentMethod(input: AddPaymentMethodInput): Promise<PaymentMethod> {
    const idempotencyKey = normalizeKey(input.idempotencyKey);
    const fingerprint = paymentMethodFingerprint(input);
    const existing = await this.repository.findPaymentMethodByIdempotencyKey(
      input.customerId,
      idempotencyKey,
    );
    if (existing) {
      assertFingerprint(existing.requestFingerprint, fingerprint);
      return existing;
    }
    const result = await this.provider.createPaymentMethod({
      customerReference: input.customerReference,
      type: input.type,
      token: input.token,
      idempotencyKey,
    });
    const method = createPaymentMethod({
      id: result.reference,
      customerId: input.customerId,
      providerName: this.provider.name,
      providerReference: result.reference,
      type: result.type,
      status: result.status,
      idempotencyKey,
      requestFingerprint: fingerprint,
      createdAt: input.now,
      updatedAt: input.now,
    });
    await this.repository.savePaymentMethod(method);
    return method;
  }

  listPaymentMethods(customerId: string): Promise<readonly PaymentMethod[]> {
    return this.repository.listPaymentMethods(customerId);
  }

  listPaymentHistory(customerId: string): Promise<readonly PaymentHistoryEntry[]> {
    return this.repository.listPaymentHistory(customerId);
  }

  async revokePaymentMethod(input: RevokePaymentMethodInput): Promise<PaymentMethod> {
    const idempotencyKey = normalizeKey(input.idempotencyKey);
    const fingerprint = JSON.stringify({
      customerId: input.customerId,
      paymentMethodId: input.paymentMethodId,
    });
    const existingRevocation = await this.repository.findPaymentMethodRevocationByIdempotencyKey(
      input.customerId,
      idempotencyKey,
    );
    if (existingRevocation) {
      assertFingerprint(existingRevocation.requestFingerprint, fingerprint);
      const replay = await this.repository.findPaymentMethodById(
        input.customerId,
        existingRevocation.paymentMethodId,
      );
      if (!replay) {
        throw new PaymentProviderError("PAYMENT_METHOD_NOT_FOUND", "payment method was not found");
      }
      return replay;
    }

    const method = await this.repository.findPaymentMethodById(
      input.customerId,
      input.paymentMethodId,
    );
    if (!method) {
      throw new PaymentProviderError("PAYMENT_METHOD_NOT_FOUND", "payment method was not found");
    }
    if (method.status !== "active") {
      throw new PaymentProviderError(
        "PAYMENT_METHOD_ALREADY_REVOKED",
        "payment method is already revoked",
      );
    }
    if (this.provider.capabilities().paymentMethodRevocation) {
      await this.provider.revokePaymentMethod({
        customerReference: input.customerReference,
        paymentMethodReference: method.providerReference,
        idempotencyKey,
      });
    }
    const revoked = createPaymentMethod({ ...method, status: "revoked", updatedAt: input.now });
    const revocation: PaymentMethodRevocation = {
      id: `payment-method-revocation:${input.customerId}:${idempotencyKey}`,
      customerId: input.customerId,
      paymentMethodId: method.id,
      idempotencyKey,
      requestFingerprint: fingerprint,
      createdAt: input.now,
      updatedAt: input.now,
    };
    await this.repository.saveRevokedPaymentMethod(revoked, revocation);
    return revoked;
  }

  async charge(input: ChargePaymentInput): Promise<PaymentAttempt> {
    const idempotencyKey = normalizeKey(input.idempotencyKey);
    const operationKey = `${input.customerId}:${idempotencyKey}`;
    const pending = this.inFlight.get(operationKey);
    if (pending) {
      return pending;
    }
    const operation = this.chargeOnce(input, idempotencyKey);
    this.inFlight.set(operationKey, operation);
    try {
      return await operation;
    } finally {
      this.inFlight.delete(operationKey);
    }
  }

  async refund(input: RefundPaymentInput): Promise<Refund> {
    const idempotencyKey = normalizeKey(input.idempotencyKey);
    const fingerprint = refundFingerprint(input, idempotencyKey);
    const existing = await this.repository.findRefundByIdempotencyKey(
      input.customerId,
      idempotencyKey,
    );
    if (existing) {
      assertFingerprint(existing.requestFingerprint, fingerprint);
      return existing;
    }

    const attempt = await this.repository.findPaymentAttemptById(input.paymentAttemptId);
    if (!attempt || attempt.customerId !== input.customerId) {
      throw new PaymentProviderError("PAYMENT_ATTEMPT_NOT_FOUND", "payment attempt was not found");
    }
    if (attempt.status !== "succeeded" || !attempt.providerReference) {
      throw new PaymentProviderError("CHARGE_NOT_REFUNDABLE", "payment attempt is not refundable");
    }

    let result;
    try {
      result = await this.provider.refund({
        refundId: this.generateId(),
        chargeReference: attempt.providerReference,
        amount: input.amount,
        reason: input.reason,
        idempotencyKey,
      });
    } catch (error) {
      const failed = createRefund({
        id: this.generateId(),
        customerId: input.customerId,
        paymentAttemptId: attempt.id,
        providerName: this.provider.name,
        providerReference: null,
        amount: input.amount,
        status: "failed",
        reason: input.reason,
        idempotencyKey,
        requestFingerprint: fingerprint,
        createdAt: input.now,
        updatedAt: input.now,
      });
      await this.repository.saveRefund(failed);
      throw error;
    }

    const refund = createRefund({
      id: result.reference,
      customerId: input.customerId,
      paymentAttemptId: attempt.id,
      providerName: this.provider.name,
      providerReference: result.reference,
      amount: result.amount,
      status: result.status,
      reason: input.reason,
      idempotencyKey,
      requestFingerprint: fingerprint,
      createdAt: input.now,
      updatedAt: result.processedAt,
    });
    if (refund.status === "succeeded") {
      await this.repository.saveRefundAndLedger(
        refund,
        refundLedgerEntry(refund, result.processedAt),
      );
    } else {
      await this.repository.saveRefund(refund);
    }
    return refund;
  }

  async handleWebhook(input: PaymentWebhookInput): Promise<PaymentWebhookResult> {
    const event = createPaymentWebhookEvent({
      id: input.event.id,
      providerName: input.providerName,
      type: input.event.type,
      occurredAt: input.event.occurredAt,
      data: input.event.data,
      receivedAt: input.receivedAt,
    });
    if (!(await this.repository.recordWebhook(event))) {
      return { duplicate: true, applied: false };
    }

    const reference = stringValue(input.event.data.chargeReference ?? input.event.data.reference);
    if (!reference) {
      return { duplicate: false, applied: false };
    }
    if (input.event.type.startsWith("charge.")) {
      const attempt = await this.repository.findPaymentAttemptByProviderReference(
        input.providerName,
        reference,
      );
      if (!attempt) {
        return { duplicate: false, applied: false };
      }
      const updated = createPaymentAttempt({
        ...attempt,
        status: input.event.type === "charge.succeeded" ? "succeeded" : "failed",
        providerReference: reference,
        failureCode:
          input.event.type === "charge.failed"
            ? (stringValue(input.event.data.failureCode) ?? "provider_declined")
            : null,
        updatedAt: input.event.occurredAt,
      });
      if (updated.status === "succeeded") {
        await this.repository.savePaymentAttemptAndLedger(
          updated,
          chargeLedgerEntry(updated, input.event.occurredAt),
        );
      } else {
        await this.repository.savePaymentAttempt(updated);
      }
      return { duplicate: false, applied: true };
    }

    const refund = await this.repository.findRefundByProviderReference(
      input.providerName,
      reference,
    );
    if (!refund) {
      return { duplicate: false, applied: false };
    }
    const updated = createRefund({
      ...refund,
      status: input.event.type === "refund.succeeded" ? "succeeded" : "failed",
      providerReference: reference,
      updatedAt: input.event.occurredAt,
    });
    if (updated.status === "succeeded") {
      await this.repository.saveRefundAndLedger(
        updated,
        refundLedgerEntry(updated, input.event.occurredAt),
      );
    } else {
      await this.repository.saveRefund(updated);
    }
    return { duplicate: false, applied: true };
  }

  private async chargeOnce(
    input: ChargePaymentInput,
    idempotencyKey: string,
  ): Promise<PaymentAttempt> {
    const fingerprint = chargeFingerprint(input, idempotencyKey);
    const existing = await this.repository.findPaymentAttemptByIdempotencyKey(
      input.customerId,
      idempotencyKey,
    );
    if (existing) {
      assertFingerprint(existing.requestFingerprint, fingerprint);
      return existing;
    }

    const method = await this.repository.findPaymentMethodByProviderReference(
      input.customerId,
      input.paymentMethodReference,
    );
    if (method?.status === "revoked") {
      throw new PaymentProviderError("PAYMENT_METHOD_REVOKED", "payment method is revoked");
    }

    const attempt = createPaymentAttempt({
      id: this.generateId(),
      customerId: input.customerId,
      orderId: input.orderId,
      providerName: this.provider.name,
      amount: input.amount,
      status: "pending",
      providerReference: null,
      failureCode: null,
      idempotencyKey,
      requestFingerprint: fingerprint,
      createdAt: input.now,
      updatedAt: input.now,
    });
    try {
      await this.repository.savePaymentAttempt(attempt);
    } catch (error) {
      const raced = await this.repository.findPaymentAttemptByIdempotencyKey(
        input.customerId,
        idempotencyKey,
      );
      if (raced) {
        assertFingerprint(raced.requestFingerprint, fingerprint);
        return raced;
      }
      throw error;
    }

    let result;
    try {
      result = await this.provider.charge({
        paymentAttemptId: attempt.id,
        customerReference: input.customerReference,
        paymentMethodReference: input.paymentMethodReference,
        amount: input.amount,
        idempotencyKey,
      });
    } catch (error) {
      const failed = createPaymentAttempt({
        ...attempt,
        status: "failed",
        failureCode: error instanceof PaymentProviderError ? error.code : "provider_error",
        updatedAt: input.now,
      });
      await this.repository.savePaymentAttempt(failed);
      throw error;
    }

    const updated = createPaymentAttempt({
      ...attempt,
      status: result.status,
      providerReference: result.reference,
      failureCode: result.failureCode,
      updatedAt: result.processedAt,
    });
    if (updated.status === "succeeded") {
      await this.repository.savePaymentAttemptAndLedger(
        updated,
        chargeLedgerEntry(updated, result.processedAt),
      );
    } else {
      await this.repository.savePaymentAttempt(updated);
    }
    return updated;
  }
}

function chargeFingerprint(input: ChargePaymentInput, idempotencyKey: string): string {
  return JSON.stringify({
    customerId: input.customerId,
    orderId: input.orderId,
    customerReference: input.customerReference,
    paymentMethodReference: input.paymentMethodReference,
    amount: input.amount,
    idempotencyKey,
  });
}

function refundFingerprint(input: RefundPaymentInput, idempotencyKey: string): string {
  return JSON.stringify({
    customerId: input.customerId,
    paymentAttemptId: input.paymentAttemptId,
    amount: input.amount,
    reason: input.reason,
    idempotencyKey,
  });
}

function paymentMethodFingerprint(input: AddPaymentMethodInput): string {
  return JSON.stringify({
    customerId: input.customerId,
    customerReference: input.customerReference,
    type: input.type,
  });
}

function assertFingerprint(existing: string, expected: string): void {
  if (existing !== expected) {
    throw new PaymentProviderError("IDEMPOTENCY_KEY_REUSED", "idempotency key was reused");
  }
}

function normalizeKey(value: string): string {
  const key = value.trim();
  if (!key || key.length > 128) {
    throw new PaymentProviderError(
      "INVALID_IDEMPOTENCY_KEY",
      "idempotency key must be between 1 and 128 characters",
    );
  }
  return key;
}

function chargeLedgerEntry(attempt: PaymentAttempt, occurredAt: string): PaymentLedgerEntry {
  return createPaymentLedgerEntry({
    id: `payment-ledger:charge:${attempt.id}`,
    customerId: attempt.customerId,
    paymentAttemptId: attempt.id,
    refundId: null,
    type: "charge",
    direction: "debit",
    amount: attempt.amount,
    occurredAt,
    metadata: { providerName: attempt.providerName, providerReference: attempt.providerReference },
  });
}

function refundLedgerEntry(refund: Refund, occurredAt: string): PaymentLedgerEntry {
  return createPaymentLedgerEntry({
    id: `payment-ledger:refund:${refund.id}`,
    customerId: refund.customerId,
    paymentAttemptId: refund.paymentAttemptId,
    refundId: refund.id,
    type: "refund",
    direction: "credit",
    amount: refund.amount,
    occurredAt,
    metadata: { providerName: refund.providerName, providerReference: refund.providerReference },
  });
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
