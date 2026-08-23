import { z } from "zod";
import { responseMetaSchema } from "./system";

export const savedItemSkuSchema = z.object({
  skuId: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string(),
  unit: z.string().min(1),
  imageUrl: z.string().url().nullable(),
  price: z.object({ centavos: z.number().int().nonnegative(), currency: z.literal("PHP") }),
  savedAt: z.string().datetime(),
});

export const savedItemsResponseSchema = z.object({
  data: z.object({ items: z.array(savedItemSkuSchema) }),
  meta: responseMetaSchema,
});

export const savedItemRequestSchema = z.object({ skuId: z.string().min(1).max(128) });

export type SavedItem = z.infer<typeof savedItemSkuSchema>;
export type SavedItemsResponse = z.infer<typeof savedItemsResponseSchema>;
export type SavedItemRequest = z.infer<typeof savedItemRequestSchema>;
