import { DomainValidationError } from "./errors.js";

export type DeliveryAddress = Readonly<{
  customerId: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  barangay: string;
  city: string;
  province: string;
  postalCode: string;
  instructions: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export function createDeliveryAddress(input: DeliveryAddress): DeliveryAddress {
  assertText(input.customerId, "address customer id");
  assertText(input.recipientName, "recipient name");
  assertLength(input.recipientName, 120, "recipient name");
  assertPhone(input.phone);
  assertText(input.line1, "address line1");
  assertLength(input.line1, 180, "address line1");
  if (input.line2 !== null) assertLength(input.line2, 180, "address line2");
  assertText(input.barangay, "barangay");
  assertLength(input.barangay, 120, "barangay");
  assertText(input.city, "city");
  assertLength(input.city, 120, "city");
  assertText(input.province, "province");
  assertLength(input.province, 120, "province");
  if (!/^\d{4}$/.test(input.postalCode)) {
    throw new DomainValidationError("INVALID_POSTAL_CODE", "postal code must contain four digits");
  }
  if (input.instructions !== null) assertLength(input.instructions, 500, "delivery instructions");
  assertIsoTimestamp(input.createdAt, "address createdAt");
  assertIsoTimestamp(input.updatedAt, "address updatedAt");
  return Object.freeze({ ...input });
}

function assertText(value: string, field: string) {
  if (!value.trim())
    throw new DomainValidationError("INVALID_ADDRESS", `${field} must not be empty`);
}

function assertLength(value: string, max: number, field: string) {
  if (value.length > max) {
    throw new DomainValidationError("INVALID_ADDRESS", `${field} is too long`);
  }
}

function assertPhone(value: string) {
  if (!/^\+?[0-9 ()-]{7,24}$/.test(value) || !/\d{7,}/.test(value)) {
    throw new DomainValidationError("INVALID_PHONE", "phone number is invalid");
  }
}

function assertIsoTimestamp(value: string, field: string) {
  if (Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new DomainValidationError("INVALID_TIMESTAMP", `${field} must be an ISO timestamp`);
  }
}
