import { z } from "zod";

import { responseMetaSchema } from "./system.js";

export const planCodeSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const planSchema = z.object({
  id: z.string().min(1),
  code: planCodeSchema,
  name: z.string().min(1),
  weeklyFee: z.object({ centavos: z.number().int().nonnegative(), currency: z.literal("PHP") }),
  weeklyCredit: z.object({
    centavos: z.number().int().nonnegative(),
    currency: z.literal("PHP"),
  }),
  displayOrder: z.number().int().nonnegative(),
  active: z.boolean(),
});

export const plansListResponseSchema = z.object({
  data: z.object({ plans: z.array(planSchema) }),
  meta: responseMetaSchema,
});

export const subscriptionStatusSchema = z.enum(["active", "paused", "canceled"]);
export const subscriptionActionSchema = z.enum(["pause", "resume", "skip", "cancel"]);

export const subscriptionSchema = z.object({
  id: z.string().min(1),
  customerId: z.string().min(1),
  planId: z.string().min(1),
  status: subscriptionStatusSchema,
  skippedCycleId: z.string().min(1).nullable(),
  lastAction: subscriptionActionSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const subscriptionResponseSchema = z.object({
  data: subscriptionSchema,
  meta: responseMetaSchema,
});

export const currentSubscriptionResponseSchema = subscriptionResponseSchema;

export const subscriptionActionRequestSchema = z.object({
  action: subscriptionActionSchema,
});

export type PlansListResponse = z.infer<typeof plansListResponseSchema>;
export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>;
export type CurrentSubscriptionResponse = z.infer<typeof currentSubscriptionResponseSchema>;
