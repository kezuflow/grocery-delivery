import { z } from "zod";
import { responseMetaSchema } from "./system";
export const procurementDemandSchema = z.object({
  cycleId: z.string().min(1),
  skuId: z.string().min(1),
  orderedQuantity: z.number().int().positive(),
  purchasedQuantity: z.number().int().nonnegative(),
  status: z.enum(["open", "purchased", "shortage", "packed"]),
});
export const procurementShortageSchema = z.object({
  id: z.string().min(1),
  cycleId: z.string().min(1),
  skuId: z.string().min(1),
  requestedQuantity: z.number().int().positive(),
  availableQuantity: z.number().int().nonnegative(),
  status: z.enum(["open", "resolved"]),
  createdAt: z.string().datetime(),
});
export const procurementSubstitutionSchema = z.object({
  id: z.string().min(1),
  shortageId: z.string().min(1),
  originalSkuId: z.string().min(1),
  substituteSkuId: z.string().min(1),
  quantity: z.number().int().positive(),
  status: z.enum(["proposed", "approved", "rejected"]),
  approvedAt: z.string().datetime().nullable(),
});
export const packingManifestSchema = z.object({
  id: z.string().min(1),
  cycleId: z.string().min(1),
  orderId: z.string().min(1),
  status: z.enum(["pending", "packed", "exception"]),
  createdAt: z.string().datetime(),
});
export const dispatchAssignmentSchema = z.object({
  id: z.string().min(1),
  cycleId: z.string().min(1),
  orderId: z.string().min(1),
  windowId: z.string().min(1),
  deliverymanUserId: z.string().min(1),
  status: z.enum(["assigned", "out_for_delivery", "delivered", "failed"]),
  assignedAt: z.string().datetime(),
});
export const procurementResponseSchema = z.object({
  data: z.object({
    cycleId: z.string(),
    demand: z.array(procurementDemandSchema),
    shortages: z.array(procurementShortageSchema),
    substitutions: z.array(procurementSubstitutionSchema),
    manifests: z.array(packingManifestSchema),
  }),
  meta: responseMetaSchema,
});
export const dispatchResponseSchema = z.object({
  data: z.object({ cycleId: z.string(), assignments: z.array(dispatchAssignmentSchema) }),
  meta: responseMetaSchema,
});
export const procurementShortageRequestSchema = z.object({
  skuId: z.string().min(1),
  requestedQuantity: z.number().int().positive(),
  availableQuantity: z.number().int().nonnegative(),
});
export const procurementPurchaseRequestSchema = z.object({
  skuId: z.string().min(1),
  purchasedQuantity: z.number().int().nonnegative(),
});
export const procurementSubstitutionRequestSchema = z.object({
  shortageId: z.string().min(1),
  substituteSkuId: z.string().min(1),
  quantity: z.number().int().positive(),
  status: z.enum(["proposed", "approved", "rejected"]),
});
export const packingManifestRequestSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(["pending", "packed", "exception"]),
});
export const dispatchAssignmentRequestSchema = z.object({
  orderId: z.string().min(1),
  windowId: z.string().min(1),
  deliverymanUserId: z.string().min(1),
});
export type ProcurementResponse = z.infer<typeof procurementResponseSchema>;
export type DispatchResponse = z.infer<typeof dispatchResponseSchema>;
