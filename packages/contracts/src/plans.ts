import { z } from "zod";

import { responseMetaSchema } from "./system";

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

export const planResponseSchema = z.object({
  data: planSchema,
  meta: responseMetaSchema,
});

export const planAdminUpsertRequestSchema = z.object({
  code: planCodeSchema,
  name: z.string().trim().min(1).max(120),
  weeklyFee: z.object({ centavos: z.number().int().nonnegative(), currency: z.literal("PHP") }),
  weeklyCredit: z.object({
    centavos: z.number().int().nonnegative(),
    currency: z.literal("PHP"),
  }),
  displayOrder: z.number().int().nonnegative(),
  active: z.boolean(),
});

export const planChangeStatusSchema = z.enum(["pending", "approved", "rejected"]);

export const planChangeRequestSchema = z.object({
  id: z.string().min(1),
  plan: planSchema,
  proposedByUserId: z.string().min(1),
  status: planChangeStatusSchema,
  decidedByUserId: z.string().min(1).nullable(),
  decisionReason: z.string().min(1).nullable(),
  createdAt: z.string().datetime(),
  decidedAt: z.string().datetime().nullable(),
});

export const planChangeRequestResponseSchema = z.object({
  data: planChangeRequestSchema,
  meta: responseMetaSchema,
});

export const planApprovalDecisionRequestSchema = z.object({
  approved: z.boolean(),
  reason: z.string().trim().max(500).optional(),
});

export const orderLineRequestSchema = z.object({
  skuId: z.string().min(1).max(128),
  quantity: z.number().int().positive().max(1_000),
});

export const orderCreateRequestSchema = z.object({
  lines: z.array(orderLineRequestSchema).max(100).optional(),
});

export const cartLineRequestSchema = orderLineRequestSchema;

export const cartUpdateRequestSchema = z.object({
  lines: z.array(cartLineRequestSchema).max(100),
});

export const cartLineSchema = z.object({
  skuId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.object({ centavos: z.number().int().nonnegative(), currency: z.literal("PHP") }),
});

export const cartResponseSchema = z.object({
  data: z.object({
    lines: z.array(cartLineSchema),
    subtotal: z.object({ centavos: z.number().int().nonnegative(), currency: z.literal("PHP") }),
    updatedAt: z.string().datetime().nullable(),
  }),
  meta: responseMetaSchema,
});

export const orderLineSchema = z.object({
  skuId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.object({ centavos: z.number().int().nonnegative(), currency: z.literal("PHP") }),
});

export const orderTotalsSchema = z.object({
  subtotal: z.object({ centavos: z.number().int().nonnegative(), currency: z.literal("PHP") }),
  weeklyFee: z.object({ centavos: z.number().int().nonnegative(), currency: z.literal("PHP") }),
  includedCredit: z.object({
    centavos: z.number().int().nonnegative(),
    currency: z.literal("PHP"),
  }),
  overage: z.object({ centavos: z.number().int().nonnegative(), currency: z.literal("PHP") }),
  deliveryFee: z.object({ centavos: z.number().int().nonnegative(), currency: z.literal("PHP") }),
  totalDue: z.object({ centavos: z.number().int().nonnegative(), currency: z.literal("PHP") }),
});

export const orderSchema = z.object({
  id: z.string().min(1),
  subscriptionId: z.string().min(1),
  planId: z.string().min(1),
  lines: z.array(orderLineSchema),
  weeklyCredit: z.object({ centavos: z.number().int().nonnegative(), currency: z.literal("PHP") }),
  totals: orderTotalsSchema,
  status: z.literal("locked"),
  lockedAt: z.string().datetime(),
});

export const orderResponseSchema = z.object({
  data: orderSchema,
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
export type PlanResponse = z.infer<typeof planResponseSchema>;
export type PlanAdminUpsertRequest = z.infer<typeof planAdminUpsertRequestSchema>;
export type PlanChangeRequestResponse = z.infer<typeof planChangeRequestResponseSchema>;
export type OrderResponse = z.infer<typeof orderResponseSchema>;
export type CartResponse = z.infer<typeof cartResponseSchema>;
export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>;
export type CurrentSubscriptionResponse = z.infer<typeof currentSubscriptionResponseSchema>;
