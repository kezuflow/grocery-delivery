import { DomainValidationError } from "./errors.js";

export const CUSTOMER_SUBSTITUTION_STATUSES = ["pending", "accepted", "rejected"] as const;
export type CustomerSubstitutionStatus = (typeof CUSTOMER_SUBSTITUTION_STATUSES)[number];

export type CustomerOrderSubstitution = Readonly<{
  id: string;
  customerId: string;
  orderId: string;
  shortageId: string;
  originalSkuId: string;
  procurementSubstitutionId: string;
  substituteSkuId: string;
  quantity: number;
  status: CustomerSubstitutionStatus;
  idempotencyKey: string | null;
  requestFingerprint: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export function createCustomerOrderSubstitution(
  input: CustomerOrderSubstitution,
): CustomerOrderSubstitution {
  text(input.id, "customer substitution id");
  text(input.customerId, "customer substitution customer id");
  text(input.orderId, "customer substitution order id");
  text(input.shortageId, "customer substitution shortage id");
  text(input.originalSkuId, "customer substitution original sku id");
  text(input.procurementSubstitutionId, "customer substitution proposal id");
  text(input.substituteSkuId, "customer substitution substitute sku id");
  quantity(input.quantity);
  if (!CUSTOMER_SUBSTITUTION_STATUSES.includes(input.status)) {
    throw new DomainValidationError(
      "INVALID_CUSTOMER_SUBSTITUTION_STATUS",
      "invalid customer substitution status",
    );
  }
  if ((input.status === "pending") !== (input.decidedAt === null)) {
    throw new DomainValidationError(
      "INVALID_CUSTOMER_SUBSTITUTION_DECISION",
      "pending substitutions cannot have a decision timestamp",
    );
  }
  if (input.decidedAt !== null) iso(input.decidedAt, "customer substitution decidedAt");
  if (input.idempotencyKey !== null)
    text(input.idempotencyKey, "customer substitution idempotency key");
  if (input.requestFingerprint !== null)
    text(input.requestFingerprint, "customer substitution request fingerprint");
  iso(input.createdAt, "customer substitution createdAt");
  iso(input.updatedAt, "customer substitution updatedAt");
  return Object.freeze({ ...input });
}

function text(value: string, field: string) {
  if (!value.trim()) {
    throw new DomainValidationError(
      "INVALID_CUSTOMER_SUBSTITUTION_TEXT",
      `${field} must not be empty`,
    );
  }
}
function quantity(value: number) {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new DomainValidationError(
      "INVALID_CUSTOMER_SUBSTITUTION_QUANTITY",
      "quantity must be positive",
    );
}
function iso(value: string, field: string) {
  if (Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value)
    throw new DomainValidationError("INVALID_TIMESTAMP", `${field} must be an ISO timestamp`);
}
