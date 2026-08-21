import { z } from "zod";
import { responseMetaSchema } from "./system";

export const customerOrderSubstitutionSchema = z.object({
  id: z.string().min(1),
  customerId: z.string().min(1),
  orderId: z.string().min(1),
  shortageId: z.string().min(1),
  originalSkuId: z.string().min(1),
  procurementSubstitutionId: z.string().min(1),
  substituteSkuId: z.string().min(1),
  quantity: z.number().int().positive(),
  status: z.enum(["pending", "accepted", "rejected"]),
  decidedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const customerOrderSubstitutionsResponseSchema = z.object({
  data: z.object({ substitutions: z.array(customerOrderSubstitutionSchema) }),
  meta: responseMetaSchema,
});

export const customerOrderSubstitutionResponseSchema = z.object({
  data: customerOrderSubstitutionSchema,
  meta: responseMetaSchema,
});

export const customerOrderSubstitutionDecisionSchema = z.object({
  decision: z.enum(["accept", "reject"]),
});

export type CustomerOrderSubstitutionsResponse = z.infer<
  typeof customerOrderSubstitutionsResponseSchema
>;
export type CustomerOrderSubstitutionResponse = z.infer<
  typeof customerOrderSubstitutionResponseSchema
>;
