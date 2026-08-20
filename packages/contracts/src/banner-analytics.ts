import { z } from "zod";
import { responseMetaSchema } from "./system";

export const promotionBannerAnalyticsRequestSchema = z.object({
  bannerId: z.string().trim().min(1).max(128),
  eventId: z.string().trim().min(1).max(128),
  event: z.enum(["impression", "click"]),
});

export const promotionBannerAnalyticsResponseSchema = z.object({
  data: z.object({ accepted: z.boolean(), duplicate: z.boolean() }),
  meta: responseMetaSchema,
});

export type PromotionBannerAnalyticsRequest = z.infer<typeof promotionBannerAnalyticsRequestSchema>;
