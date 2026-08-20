import { z } from "zod";
import { responseMetaSchema } from "./system";

export const bannerPlacementSchema = z.enum(["home-hero", "storefront-strip", "account-banner"]);
export const bannerStatusSchema = z.enum([
  "draft",
  "scheduled",
  "active",
  "paused",
  "expired",
  "archived",
]);
const bannerFields = {
  placement: bannerPlacementSchema,
  title: z.string().trim().min(1).max(120),
  copy: z.string().trim().min(1).max(500),
  ctaLabel: z.string().trim().min(1).max(40),
  ctaDestination: z
    .string()
    .trim()
    .max(500)
    .refine((value) => {
      if (value.startsWith("/") && !value.startsWith("//")) return true;
      try {
        return new URL(value).protocol === "https:";
      } catch {
        return false;
      }
    }, "CTA destination must be an HTTPS URL or an absolute site path"),
  altText: z.string().trim().min(1).max(180),
  priority: z.number().int().min(0).max(1000),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  desktopObjectKey: z.string().trim().min(1).max(240),
  mobileObjectKey: z.string().trim().min(1).max(240),
};
export const promotionBannerSchema = z.object({
  id: z.string().min(1),
  ...bannerFields,
  status: bannerStatusSchema,
  cacheVersion: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export const promotionBannerUpsertRequestSchema = z
  .object(bannerFields)
  .superRefine((value, context) => {
    if (value.endsAt <= value.startsAt)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsAt"],
        message: "end must be after start",
      });
    for (const key of ["desktopObjectKey", "mobileObjectKey"] as const) {
      if (!value[key].startsWith("promotions/"))
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: "promotion object keys are required",
        });
    }
  });
export const promotionBannerStatusRequestSchema = z.object({ status: bannerStatusSchema });
export const promotionMediaUploadRequestSchema = z.object({
  bannerId: z.string().trim().min(1).max(128),
  variant: z.enum(["desktop", "mobile"]),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().int().positive().max(5_000_000),
  width: z.number().int().min(320).max(3840),
  height: z.number().int().min(160).max(2160),
});
export const promotionMediaUploadResponseSchema = z.object({
  data: z.object({
    objectKey: z.string().min(1),
    uploadUrl: z.string().url(),
    expiresAt: z.string().datetime(),
  }),
  meta: responseMetaSchema,
});
export const promotionBannerAdminListResponseSchema = z.object({
  data: z.object({ banners: z.array(promotionBannerSchema) }),
  meta: responseMetaSchema,
});
export const promotionBannerResponseSchema = z.object({
  data: promotionBannerSchema,
  meta: responseMetaSchema,
});
export const activePromotionBannerSchema = promotionBannerSchema
  .omit({ desktopObjectKey: true, mobileObjectKey: true })
  .extend({ desktopUrl: z.string().url(), mobileUrl: z.string().url() });
export const activePromotionBannersResponseSchema = z.object({
  data: z.object({
    placement: bannerPlacementSchema,
    banners: z.array(activePromotionBannerSchema),
    cacheVersion: z.number().int().positive(),
  }),
  meta: responseMetaSchema,
});
export type PromotionBanner = z.infer<typeof promotionBannerSchema>;
export type PromotionBannerUpsertRequest = z.infer<typeof promotionBannerUpsertRequestSchema>;
export type ActivePromotionBannersResponse = z.infer<typeof activePromotionBannersResponseSchema>;
