import { DomainValidationError } from "./errors.js";

export const DELIVERY_EVENT_TYPES = ["picked_up", "arrived", "delivered", "failed"] as const;
export type DeliveryEventType = (typeof DELIVERY_EVENT_TYPES)[number];
export const DELIVERY_FAILURE_REASONS = [
  "customer_unavailable",
  "address_inaccessible",
  "damaged_order",
  "other",
] as const;
export type DeliveryFailureReason = (typeof DELIVERY_FAILURE_REASONS)[number];

export type DeliveryEvent = Readonly<{
  id: string;
  clientEventId: string;
  assignmentId: string;
  orderId: string;
  deliverymanUserId: string;
  type: DeliveryEventType;
  occurredAt: string;
  receivedAt: string;
  note: string | null;
  failureReason: DeliveryFailureReason | null;
}>;

export function createDeliveryEvent(input: DeliveryEvent): DeliveryEvent {
  for (const [value, field] of [
    [input.id, "delivery event id"],
    [input.clientEventId, "delivery client event id"],
    [input.assignmentId, "delivery assignment id"],
    [input.orderId, "delivery order id"],
    [input.deliverymanUserId, "deliveryman user id"],
  ] as const) {
    if (!value.trim()) {
      throw new DomainValidationError("INVALID_DELIVERY_EVENT_TEXT", `${field} must not be empty`);
    }
  }
  if (!DELIVERY_EVENT_TYPES.includes(input.type)) {
    throw new DomainValidationError("INVALID_DELIVERY_EVENT_TYPE", "invalid delivery event type");
  }
  if (input.type === "failed" && !input.failureReason) {
    throw new DomainValidationError(
      "MISSING_DELIVERY_FAILURE_REASON",
      "failed deliveries require a reason",
    );
  }
  if (input.type !== "failed" && input.failureReason !== null) {
    throw new DomainValidationError(
      "INVALID_DELIVERY_FAILURE_REASON",
      "only failed deliveries may include a reason",
    );
  }
  assertIso(input.occurredAt, "delivery event occurredAt");
  assertIso(input.receivedAt, "delivery event receivedAt");
  if (input.note !== null && input.note.length > 500) {
    throw new DomainValidationError(
      "INVALID_DELIVERY_EVENT_NOTE",
      "delivery event note is too long",
    );
  }
  return Object.freeze({ ...input });
}

function assertIso(value: string, field: string) {
  if (Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new DomainValidationError("INVALID_TIMESTAMP", `${field} must be an ISO timestamp`);
  }
}
