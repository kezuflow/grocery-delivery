import type { DeliveryEventRequest, DeliverymanAssignmentsResponse } from "@carbon/contracts";

export const deliveryEventTypes = ["picked_up", "arrived", "delivered", "failed"] as const;

export const failureReasons = [
  ["customer_unavailable", "Customer unavailable"],
  ["address_inaccessible", "Address inaccessible"],
  ["damaged_order", "Damaged order"],
  ["other", "Other"],
] as const;

export type DeliveryAssignment = DeliverymanAssignmentsResponse["data"]["assignments"][number];

export function getNextDeliveryEvents(
  previous: DeliveryAssignment["lastEventType"],
): readonly (typeof deliveryEventTypes)[number][] {
  if (previous === null) return ["picked_up"];
  if (previous === "picked_up") return ["arrived"];
  if (previous === "arrived") return ["delivered", "failed"];
  return [];
}

export function formatDeliveryEvent(event: string | null) {
  return event ? event.replaceAll("_", " ") : "Not started";
}

export function formatAddress(address: NonNullable<DeliveryAssignment["deliveryAddress"]>) {
  return [
    address.line1,
    address.line2,
    address.barangay,
    address.city,
    address.province,
    address.postalCode,
  ]
    .filter(Boolean)
    .join(", ");
}

export function createMapUrl(address: NonNullable<DeliveryAssignment["deliveryAddress"]>) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatAddress(address))}`;
}

export function createDeliveryEvent(
  assignment: DeliveryAssignment,
  type: DeliveryEventRequest["type"],
  failureReason: DeliveryEventRequest["failureReason"] = null,
): DeliveryEventRequest {
  return {
    clientEventId: crypto.randomUUID(),
    assignmentId: assignment.id,
    orderId: assignment.orderId,
    type,
    occurredAt: new Date().toISOString(),
    note: null,
    failureReason,
  };
}
