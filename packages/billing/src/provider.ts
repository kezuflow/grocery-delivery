import type { Money } from "@carbon/domain";

export type PaymentCapabilities = Readonly<{
  tokenizedCharges: boolean;
  mandates: boolean;
  invoices: boolean;
  refunds: boolean;
  webhookVerification: boolean;
  reconciliation: boolean;
}>;

export type CreateCustomerInput = Readonly<{
  customerId: string;
  email?: string;
  idempotencyKey: string;
}>;

export type ProviderCustomer = Readonly<{
  reference: string;
  customerId: string;
}>;

export type CreatePaymentMethodInput = Readonly<{
  customerReference: string;
  type: "card" | "bank_account" | "ewallet";
  token: string;
  idempotencyKey: string;
}>;

export type ProviderPaymentMethod = Readonly<{
  reference: string;
  customerReference: string;
  type: CreatePaymentMethodInput["type"];
  status: "active";
}>;

export type ChargeInput = Readonly<{
  paymentAttemptId: string;
  customerReference: string;
  paymentMethodReference: string;
  amount: Money;
  idempotencyKey: string;
}>;

export type ChargeResult = Readonly<{
  reference: string;
  status: "succeeded" | "pending" | "failed";
  amount: Money;
  failureCode: string | null;
  processedAt: string;
}>;

export type RefundInput = Readonly<{
  refundId: string;
  chargeReference: string;
  amount: Money;
  reason: string;
  idempotencyKey: string;
}>;

export type RefundResult = Readonly<{
  reference: string;
  chargeReference: string;
  status: "succeeded" | "failed";
  amount: Money;
  processedAt: string;
}>;

export type PaymentWebhookType =
  "charge.succeeded" | "charge.failed" | "refund.succeeded" | "refund.failed";

export type VerifyWebhookInput = Readonly<{
  rawBody: string;
  signature: string;
}>;

export type VerifiedWebhook = Readonly<{
  id: string;
  type: PaymentWebhookType;
  occurredAt: string;
  data: Readonly<Record<string, unknown>>;
}>;

export type ReconcileInput = Readonly<{
  from: string;
  to: string;
}>;

export type ReconciliationEntry = Readonly<{
  reference: string;
  type: "charge" | "refund";
  status: "succeeded" | "pending" | "failed";
  amount: Money;
  occurredAt: string;
}>;

export type ReconciliationResult = Readonly<{
  entries: readonly ReconciliationEntry[];
}>;

export interface PaymentProvider {
  readonly name: string;
  capabilities(): PaymentCapabilities;
  createCustomer(input: CreateCustomerInput): Promise<ProviderCustomer>;
  createPaymentMethod(input: CreatePaymentMethodInput): Promise<ProviderPaymentMethod>;
  charge(input: ChargeInput): Promise<ChargeResult>;
  refund(input: RefundInput): Promise<RefundResult>;
  verifyWebhook(input: VerifyWebhookInput): Promise<VerifiedWebhook>;
  reconcile(input: ReconcileInput): Promise<ReconciliationResult>;
}

export class PaymentProviderError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PaymentProviderError";
  }
}
