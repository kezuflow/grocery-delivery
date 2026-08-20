import { z } from "zod";
import { responseMetaSchema } from "./system";

export const notificationPreferencesSchema = z.object({
  customerId: z.string().min(1),
  deliveryUpdates: z.boolean(),
  marketing: z.boolean(),
  updatedAt: z.string().datetime(),
});

export const notificationPreferencesRequestSchema = z.object({
  deliveryUpdates: z.boolean(),
  marketing: z.boolean(),
});

export const notificationPreferencesResponseSchema = z.object({
  data: notificationPreferencesSchema,
  meta: responseMetaSchema,
});

export type NotificationPreferencesResponse = z.infer<typeof notificationPreferencesResponseSchema>;
