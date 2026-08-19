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

export type DeliveryWindow = Readonly<{
  id: string;
  cycleId: string;
  label: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}>;

export type DeliveryWindowSelection = Readonly<{
  customerId: string;
  cycleId: string;
  windowId: string;
  selectedAt: string;
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

export function createDeliveryWindow(input: DeliveryWindow): DeliveryWindow {
  assertText(input.id, "delivery window id");
  assertText(input.cycleId, "delivery window cycle id");
  assertText(input.label, "delivery window label");
  assertLength(input.label, 120, "delivery window label");
  assertIsoTimestamp(input.startsAt, "delivery window startsAt");
  assertIsoTimestamp(input.endsAt, "delivery window endsAt");
  if (input.startsAt >= input.endsAt) {
    throw new DomainValidationError(
      "INVALID_DELIVERY_WINDOW",
      "delivery window must end after it starts",
    );
  }
  if (!Number.isSafeInteger(input.capacity) || input.capacity < 1 || input.capacity > 100_000) {
    throw new DomainValidationError(
      "INVALID_DELIVERY_CAPACITY",
      "delivery window capacity is invalid",
    );
  }
  assertIsoTimestamp(input.createdAt, "delivery window createdAt");
  assertIsoTimestamp(input.updatedAt, "delivery window updatedAt");
  return Object.freeze({ ...input });
}

export function createDeliveryWindowSelection(
  input: DeliveryWindowSelection,
): DeliveryWindowSelection {
  assertText(input.customerId, "delivery selection customer id");
  assertText(input.cycleId, "delivery selection cycle id");
  assertText(input.windowId, "delivery selection window id");
  assertIsoTimestamp(input.selectedAt, "delivery selection selectedAt");
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
