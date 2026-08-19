import { DomainValidationError } from "./errors.js";

export const PROCUREMENT_STATUSES = ["open", "purchased", "shortage", "packed"] as const;
export type ProcurementStatus = (typeof PROCUREMENT_STATUSES)[number];
export type ProcurementDemand = Readonly<{
  cycleId: string;
  skuId: string;
  orderedQuantity: number;
  purchasedQuantity: number;
  status: ProcurementStatus;
}>;
export type ProcurementShortage = Readonly<{
  id: string;
  cycleId: string;
  skuId: string;
  requestedQuantity: number;
  availableQuantity: number;
  status: "open" | "resolved";
  createdAt: string;
}>;
export type ProcurementSubstitution = Readonly<{
  id: string;
  shortageId: string;
  originalSkuId: string;
  substituteSkuId: string;
  quantity: number;
  status: "proposed" | "approved" | "rejected";
  approvedAt: string | null;
}>;
export type PackingManifest = Readonly<{
  id: string;
  cycleId: string;
  orderId: string;
  status: "pending" | "packed" | "exception";
  createdAt: string;
}>;

export function createProcurementDemand(input: ProcurementDemand): ProcurementDemand {
  text(input.cycleId, "procurement cycle id");
  text(input.skuId, "procurement sku id");
  quantity(input.orderedQuantity, "ordered quantity");
  nonNegative(input.purchasedQuantity, "purchased quantity");
  if (!PROCUREMENT_STATUSES.includes(input.status))
    throw new DomainValidationError("INVALID_PROCUREMENT_STATUS", "invalid procurement status");
  return Object.freeze({ ...input });
}
export function createProcurementShortage(input: ProcurementShortage): ProcurementShortage {
  text(input.id, "shortage id");
  text(input.cycleId, "shortage cycle id");
  text(input.skuId, "shortage sku id");
  quantity(input.requestedQuantity, "requested quantity");
  nonNegative(input.availableQuantity, "available quantity");
  if (input.availableQuantity >= input.requestedQuantity)
    throw new DomainValidationError(
      "INVALID_SHORTAGE",
      "available quantity must be below requested quantity",
    );
  if (input.status !== "open" && input.status !== "resolved")
    throw new DomainValidationError("INVALID_SHORTAGE_STATUS", "invalid shortage status");
  iso(input.createdAt, "shortage createdAt");
  return Object.freeze({ ...input });
}
export function createProcurementSubstitution(
  input: ProcurementSubstitution,
): ProcurementSubstitution {
  text(input.id, "substitution id");
  text(input.shortageId, "substitution shortage id");
  text(input.originalSkuId, "original sku id");
  text(input.substituteSkuId, "substitute sku id");
  quantity(input.quantity, "substitution quantity");
  if (!["proposed", "approved", "rejected"].includes(input.status))
    throw new DomainValidationError("INVALID_SUBSTITUTION_STATUS", "invalid substitution status");
  if (input.approvedAt !== null) iso(input.approvedAt, "substitution approvedAt");
  return Object.freeze({ ...input });
}
export function createPackingManifest(input: PackingManifest): PackingManifest {
  text(input.id, "manifest id");
  text(input.cycleId, "manifest cycle id");
  text(input.orderId, "manifest order id");
  iso(input.createdAt, "manifest createdAt");
  if (!["pending", "packed", "exception"].includes(input.status))
    throw new DomainValidationError("INVALID_PACKING_STATUS", "invalid packing status");
  return Object.freeze({ ...input });
}
function text(value: string, field: string) {
  if (!value.trim())
    throw new DomainValidationError("INVALID_PROCUREMENT_TEXT", `${field} must not be empty`);
}
function quantity(value: number, field: string) {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new DomainValidationError("INVALID_PROCUREMENT_QUANTITY", `${field} must be positive`);
}
function nonNegative(value: number, field: string) {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new DomainValidationError(
      "INVALID_PROCUREMENT_QUANTITY",
      `${field} must be non-negative`,
    );
}
function iso(value: string, field: string) {
  if (Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value)
    throw new DomainValidationError("INVALID_TIMESTAMP", `${field} must be an ISO timestamp`);
}
