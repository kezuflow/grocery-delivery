import { DomainValidationError } from "./errors.js";
import type { DeliveryEvent, DeliveryEventType } from "./delivery-events.js";

export type DeliveryTrackingStatus =
  "pending" | "assigned" | "out_for_delivery" | "delivered" | "failed";

export type DeliveryTracking = Readonly<{
  orderId: string;
  customerId: string;
  assignmentId: string | null;
  windowId: string | null;
  status: DeliveryTrackingStatus;
  latestEventType: DeliveryEventType | null;
  events: readonly DeliveryEvent[];
}>;

export function createDeliveryTracking(input: DeliveryTracking): DeliveryTracking {
  for (const [value, field] of [
    [input.orderId, "tracking order id"],
    [input.customerId, "tracking customer id"],
  ] as const) {
    if (!value.trim()) {
      throw new DomainValidationError("INVALID_TRACKING_TEXT", `${field} must not be empty`);
    }
  }
  if (input.assignmentId !== null && !input.assignmentId.trim()) {
    throw new DomainValidationError("INVALID_TRACKING_TEXT", "tracking assignment id is invalid");
  }
  if (input.windowId !== null && !input.windowId.trim()) {
    throw new DomainValidationError("INVALID_TRACKING_TEXT", "tracking window id is invalid");
  }
  if (!["pending", "assigned", "out_for_delivery", "delivered", "failed"].includes(input.status)) {
    throw new DomainValidationError("INVALID_TRACKING_STATUS", "invalid tracking status");
  }
  return Object.freeze({ ...input, events: Object.freeze([...input.events]) });
}
