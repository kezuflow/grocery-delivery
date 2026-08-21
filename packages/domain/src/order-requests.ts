import { DomainValidationError } from "./errors.js";

export const CUSTOMER_ORDER_REQUEST_KINDS = ["cancellation", "refund"] as const;
export type CustomerOrderRequestKind = (typeof CUSTOMER_ORDER_REQUEST_KINDS)[number];
export const CUSTOMER_ORDER_REQUEST_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "completed",
] as const;
export type CustomerOrderRequestStatus = (typeof CUSTOMER_ORDER_REQUEST_STATUSES)[number];

export type CustomerOrderRequest = Readonly<{
  id: string;
  customerId: string;
  orderId: string;
  kind: CustomerOrderRequestKind;
  reason: string;
  status: CustomerOrderRequestStatus;
  idempotencyKey: string;
  requestFingerprint: string;
  createdAt: string;
  updatedAt: string;
}>;

export function createCustomerOrderRequest(input: CustomerOrderRequest): CustomerOrderRequest {
  text(input.id, "request id");
  text(input.customerId, "request customer id");
  text(input.orderId, "request order id");
  text(input.reason, "request reason");
  text(input.idempotencyKey, "request idempotency key");
  text(input.requestFingerprint, "request fingerprint");
  if (!CUSTOMER_ORDER_REQUEST_KINDS.includes(input.kind)) {
    throw new DomainValidationError("INVALID_ORDER_REQUEST_KIND", "invalid order request kind");
  }
  if (!CUSTOMER_ORDER_REQUEST_STATUSES.includes(input.status)) {
    throw new DomainValidationError("INVALID_ORDER_REQUEST_STATUS", "invalid order request status");
  }
  iso(input.createdAt, "request createdAt");
  iso(input.updatedAt, "request updatedAt");
  return Object.freeze({ ...input });
}

function text(value: string, field: string) {
  if (!value.trim())
    throw new DomainValidationError("INVALID_ORDER_REQUEST_TEXT", `${field} must not be empty`);
}

function iso(value: string, field: string) {
  if (Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new DomainValidationError("INVALID_TIMESTAMP", `${field} must be an ISO timestamp`);
  }
}
