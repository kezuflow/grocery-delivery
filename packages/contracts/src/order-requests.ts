import { z } from "zod";
import { responseMetaSchema } from "./system";

export const customerOrderRequestSchema = z.object({
  id: z.string().min(1),
  customerId: z.string().min(1),
  orderId: z.string().min(1),
  kind: z.enum(["cancellation", "refund"]),
  reason: z.string().min(1),
  status: z.enum(["pending", "approved", "rejected", "completed"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const customerOrderRequestCreateSchema = z.object({
  orderId: z.string().trim().min(1).max(128),
  kind: z.enum(["cancellation", "refund"]),
  reason: z.string().trim().min(3).max(1_000),
});

export const customerOrderRequestsResponseSchema = z.object({
  data: z.object({ requests: z.array(customerOrderRequestSchema) }),
  meta: responseMetaSchema,
});

export const customerOrderRequestResponseSchema = z.object({
  data: customerOrderRequestSchema,
  meta: responseMetaSchema,
});

export type CustomerOrderRequestsResponse = z.infer<typeof customerOrderRequestsResponseSchema>;
export type CustomerOrderRequestResponse = z.infer<typeof customerOrderRequestResponseSchema>;
