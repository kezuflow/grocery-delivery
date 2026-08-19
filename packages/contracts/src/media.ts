import { z } from "zod";
import { responseMetaSchema } from "./system";

export const deliveryMediaSchema = z.object({
  id: z.string().min(1),
  orderId: z.string().min(1),
  assignmentId: z.string().min(1),
  kind: z.literal("proof_of_delivery"),
  contentType: z.string().min(1).max(128),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
  createdAt: z.string().datetime(),
  downloadUrl: z.string().url(),
  downloadUrlExpiresAt: z.string().datetime(),
});

export const deliveryMediaUploadRequestSchema = z.object({
  clientMediaId: z.string().trim().min(1).max(128),
  assignmentId: z.string().trim().min(1),
  orderId: z.string().trim().min(1),
  kind: z.literal("proof_of_delivery"),
  contentType: z
    .string()
    .trim()
    .regex(/^image\/(jpeg|png|webp)$/),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
});

export const deliveryMediaUploadResponseSchema = z.object({
  data: z.object({
    id: z.string().min(1),
    uploadUrl: z.string().url(),
    uploadUrlExpiresAt: z.string().datetime(),
  }),
  meta: responseMetaSchema,
});

export const deliveryMediaListResponseSchema = z.object({
  data: z.object({ media: z.array(deliveryMediaSchema) }),
  meta: responseMetaSchema,
});

export type DeliveryMediaUploadRequest = z.infer<typeof deliveryMediaUploadRequestSchema>;
export type DeliveryMediaUploadResponse = z.infer<typeof deliveryMediaUploadResponseSchema>;
export type DeliveryMediaListResponse = z.infer<typeof deliveryMediaListResponseSchema>;
