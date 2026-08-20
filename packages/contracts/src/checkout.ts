import { z } from "zod";

import { responseMetaSchema } from "./system";

const moneySchema = z.object({
  centavos: z.number().int().nonnegative(),
  currency: z.literal("PHP"),
});

export const couponRequestSchema = z.object({
  code: z.string().trim().min(2).max(32),
});

export const checkoutQuoteSchema = z.object({
  originalSubtotal: moneySchema,
  discount: moneySchema,
  deliveryFee: moneySchema,
  weeklyFee: moneySchema,
  includedCredit: moneySchema,
  overage: moneySchema,
  totalDue: moneySchema,
  promotionCode: z.string().min(2).nullable(),
});

export const checkoutQuoteResponseSchema = z.object({
  data: checkoutQuoteSchema,
  meta: responseMetaSchema,
});

export type CouponRequest = z.infer<typeof couponRequestSchema>;
export type CheckoutQuote = z.infer<typeof checkoutQuoteSchema>;
export type CheckoutQuoteResponse = z.infer<typeof checkoutQuoteResponseSchema>;
