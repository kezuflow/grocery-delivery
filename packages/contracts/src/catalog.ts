import { z } from "zod";

import { responseMetaSchema } from "./system";

export const catalogUnitSchema = z.enum([
  "piece",
  "gram",
  "kilogram",
  "milliliter",
  "liter",
  "pack",
]);

export const catalogCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  active: z.boolean(),
});

export const catalogSkuSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string(),
  unit: catalogUnitSchema,
  imageUrl: z.string().url().nullable(),
  price: z.object({
    centavos: z.number().int().nonnegative(),
    currency: z.literal("PHP"),
  }),
  active: z.boolean(),
});

export const catalogListResponseSchema = z.object({
  data: z.object({
    categories: z.array(catalogCategorySchema),
    items: z.array(catalogSkuSchema),
    nextCursor: z.string().min(1).nullable(),
  }),
  meta: responseMetaSchema,
});

export type CatalogCategoryResponse = z.infer<typeof catalogCategorySchema>;
export type CatalogSkuResponse = z.infer<typeof catalogSkuSchema>;
export type CatalogListResponse = z.infer<typeof catalogListResponseSchema>;
