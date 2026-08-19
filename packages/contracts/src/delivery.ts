import { z } from "zod";

import { responseMetaSchema } from "./system";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable()
    .optional()
    .transform((value) => value ?? null);

export const deliveryAddressInputSchema = z.object({
  recipientName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(7).max(24),
  line1: z.string().trim().min(1).max(180),
  line2: optionalText(180),
  barangay: z.string().trim().min(1).max(120),
  city: z.string().trim().min(1).max(120),
  province: z.string().trim().min(1).max(120),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{4}$/),
  instructions: optionalText(500),
});

export const deliveryAddressSchema = deliveryAddressInputSchema.extend({
  serviceable: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const deliveryAddressResponseSchema = z.object({
  data: deliveryAddressSchema.nullable(),
  meta: responseMetaSchema,
});

export type DeliveryAddressInput = z.infer<typeof deliveryAddressInputSchema>;
export type DeliveryAddressResponse = z.infer<typeof deliveryAddressResponseSchema>;
