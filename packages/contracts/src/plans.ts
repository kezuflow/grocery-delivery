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
  promotionCode: z.string().trim().min(2).max(32).optional(),
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
  discount: z
    .object({ centavos: z.number().int().nonnegative(), currency: z.literal("PHP") })
    .default({ centavos: 0, currency: "PHP" }),
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
  cycleId: z.string().min(1),
  lines: z.array(orderLineSchema),
  weeklyCredit: z.object({ centavos: z.number().int().nonnegative(), currency: z.literal("PHP") }),
  totals: orderTotalsSchema,
  appliedPromotion: z
    .object({
      id: z.string().min(1),
      code: z.string().min(2),
      version: z.number().int().positive(),
      discount: z.object({ centavos: z.number().int().nonnegative(), currency: z.literal("PHP") }),
      deliveryFee: z.object({
        centavos: z.number().int().nonnegative(),
        currency: z.literal("PHP"),
      }),
    })
    .nullable()
    .default(null),
  deliveryAddress: z
    .object({
      recipientName: z.string().min(1),
      phone: z.string().min(1),
      line1: z.string().min(1),
      line2: z.string().nullable(),
      barangay: z.string().min(1),
      city: z.string().min(1),
      province: z.string().min(1),
      postalCode: z.string().min(1),
      instructions: z.string().nullable(),
    })
    .nullable()
    .default(null),
  deliveryWindow: z
    .object({
      id: z.string().min(1),
      cycleId: z.string().min(1),
      label: z.string().min(1),
      startsAt: z.string().datetime(),
      endsAt: z.string().datetime(),
    })
    .nullable()
    .default(null),
  paymentState: z.enum(["unpaid", "pending", "paid", "failed"]).default("unpaid"),
  status: z.enum(["locked", "canceled"]),
  lockedAt: z.string().datetime(),
});

export const orderResponseSchema = z.object({
  data: orderSchema,
  meta: responseMetaSchema,
});

export const orderListResponseSchema = z.object({
  data: z.object({ orders: z.array(orderSchema) }),
  meta: responseMetaSchema,
});

export const subscriptionStatusSchema = z.enum(["active", "paused", "canceled"]);
export const subscriptionActionSchema = z.enum([
  "pause",
  "resume",
  "skip",
  "cancel",
  "change-plan",
]);
export const subscriptionBillingStatusSchema = z.enum(["current", "past_due"]);

export const subscriptionSchema = z.object({
  id: z.string().min(1),
  customerId: z.string().min(1),
  planId: z.string().min(1),
  status: subscriptionStatusSchema,
  billingStatus: subscriptionBillingStatusSchema.default("current"),
  effectiveCycleId: z.string().min(1).nullable().default(null),
  skippedCycleId: z.string().min(1).nullable(),
  lastAction: subscriptionActionSchema.nullable(),
  trialStartedAt: z.string().datetime().nullable().default(null),
  trialEndsAt: z.string().datetime().nullable().default(null),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const subscriptionResponseSchema = z.object({
  data: subscriptionSchema,
  meta: responseMetaSchema,
});

export const currentSubscriptionResponseSchema = subscriptionResponseSchema;

export const subscriptionActionRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["pause", "resume", "skip", "cancel"]) }),
  z.object({
    action: z.literal("change-plan"),
    planId: z.string().trim().min(1).max(128),
  }),
]);

export const subscriptionCreateRequestSchema = z.object({
  planId: z.string().trim().min(1).max(128),
});

export const subscriptionTrialRequestSchema = subscriptionCreateRequestSchema;

export type PlansListResponse = z.infer<typeof plansListResponseSchema>;
export type PlanResponse = z.infer<typeof planResponseSchema>;
export type PlanAdminUpsertRequest = z.infer<typeof planAdminUpsertRequestSchema>;
export type PlanChangeRequestResponse = z.infer<typeof planChangeRequestResponseSchema>;
export type OrderCreateRequest = z.infer<typeof orderCreateRequestSchema>;
export type OrderResponse = z.infer<typeof orderResponseSchema>;
export type OrderListResponse = z.infer<typeof orderListResponseSchema>;
export type CartResponse = z.infer<typeof cartResponseSchema>;
export type CartUpdateRequest = z.infer<typeof cartUpdateRequestSchema>;
export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>;
export type CurrentSubscriptionResponse = z.infer<typeof currentSubscriptionResponseSchema>;
export type SubscriptionActionRequest = z.infer<typeof subscriptionActionRequestSchema>;
export type SubscriptionCreateRequest = z.infer<typeof subscriptionCreateRequestSchema>;
export type SubscriptionTrialRequest = z.infer<typeof subscriptionTrialRequestSchema>;
