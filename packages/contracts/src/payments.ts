import { z } from "zod";

import { responseMetaSchema } from "./system.js";

export const paymentAttemptStatusSchema = z.enum(["pending", "succeeded", "failed"]);

export const paymentAttemptSchema = z.object({
  id: z.string().min(1),
  orderId: z.string().min(1),
  amount: z.object({ centavos: z.number().int().positive(), currency: z.literal("PHP") }),
  status: paymentAttemptStatusSchema,
  providerReference: z.string().min(1).nullable(),
  failureCode: z.string().min(1).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const paymentChargeRequestSchema = z.object({
  orderId: z.string().trim().min(1).max(128),
  customerReference: z.string().trim().min(1).max(256),
  paymentMethodReference: z.string().trim().min(1).max(256),
});

export const paymentAttemptResponseSchema = z.object({
  data: paymentAttemptSchema,
  meta: responseMetaSchema,
});

export const paymentWebhookResponseSchema = z.object({
  data: z.object({ duplicate: z.boolean(), applied: z.boolean() }),
  meta: responseMetaSchema,
});

export type PaymentAttemptResponse = z.infer<typeof paymentAttemptResponseSchema>;
export type PaymentWebhookResponse = z.infer<typeof paymentWebhookResponseSchema>;
