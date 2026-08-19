import { DomainValidationError } from "./errors.js";
export type DispatchAssignment = Readonly<{
  id: string;
  cycleId: string;
  orderId: string;
  windowId: string;
  deliverymanUserId: string;
  status: "assigned" | "out_for_delivery" | "delivered" | "failed";
  assignedAt: string;
}>;
export function createDispatchAssignment(input: DispatchAssignment): DispatchAssignment {
  for (const [value, field] of [
    [input.id, "assignment id"],
    [input.cycleId, "assignment cycle id"],
    [input.orderId, "assignment order id"],
    [input.windowId, "assignment window id"],
    [input.deliverymanUserId, "deliveryman user id"],
  ] as const)
    if (!value.trim())
      throw new DomainValidationError("INVALID_DISPATCH_TEXT", `${field} must not be empty`);
  if (!["assigned", "out_for_delivery", "delivered", "failed"].includes(input.status))
    throw new DomainValidationError("INVALID_DISPATCH_STATUS", "invalid dispatch status");
  if (
    Number.isNaN(Date.parse(input.assignedAt)) ||
    new Date(input.assignedAt).toISOString() !== input.assignedAt
  )
    throw new DomainValidationError(
      "INVALID_TIMESTAMP",
      "assignment assignedAt must be an ISO timestamp",
    );
  return Object.freeze({ ...input });
}
