import { z } from "zod";

import { responseMetaSchema } from "./system";

const moneySchema = z.object({
  centavos: z.number().int().nonnegative(),
  currency: z.literal("PHP"),
});
const discountSchema = z.union([
  z.object({ kind: z.literal("fixed"), amount: moneySchema }),
  z.object({
    kind: z.literal("percentage"),
    basisPoints: z.number().int().min(1).max(10_000),
    maximum: moneySchema.nullable(),
  }),
  z.object({ kind: z.literal("free_delivery") }),
]);

export const promotionAdminUpsertRequestSchema = z.object({
  code: z.string().trim().min(2).max(32),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  discount: discountSchema,
  minimumSubtotal: moneySchema.nullable(),
  planIds: z.array(z.string().min(1)).max(100),
  skuIds: z.array(z.string().min(1)).max(100),
  categoryIds: z.array(z.string().min(1)).max(100),
  firstOrderOnly: z.boolean(),
  firstWeekOnly: z.boolean(),
  totalBudget: moneySchema.nullable(),
  totalRedemptions: z.number().int().positive().nullable(),
  perCustomerRedemptions: z.number().int().positive().nullable(),
  allowsStacking: z.boolean(),
});

export const promotionStatusRequestSchema = z.object({
  status: z.enum(["active", "paused", "expired", "archived"]),
});

export const promotionAdminResponseSchema = z.object({
  data: z.unknown(),
  meta: responseMetaSchema,
});
export const promotionAdminSummarySchema = z
  .object({
    id: z.string().min(1),
    code: z.string().nullable(),
    version: z.number().int().positive(),
    status: z.enum(["draft", "scheduled", "active", "paused", "expired", "archived"]),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    redemptionCount: z.number().int().nonnegative(),
    redeemedAmount: moneySchema,
    totalBudget: moneySchema.nullable(),
  })
  .passthrough();
export const promotionAdminListResponseSchema = z.object({
  data: z.object({ promotions: z.array(promotionAdminSummarySchema) }),
  meta: responseMetaSchema,
});

export type PromotionAdminSummary = z.infer<typeof promotionAdminSummarySchema>;
export type PromotionAdminListResponse = z.infer<typeof promotionAdminListResponseSchema>;
