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
  imageUrl: z
    .string()
    .refine(
      (value) => value.startsWith("/marketplace/") || z.string().url().safeParse(value).success,
      "imageUrl must be an absolute URL or a marketplace asset path",
    )
    .nullable(),
  price: z.object({
    centavos: z.number().int().nonnegative(),
    currency: z.literal("PHP"),
  }),
  active: z.boolean(),
});

export const catalogSortSchema = z.enum(["popular", "name", "price-low", "price-high"]);

export const catalogQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  category: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  sort: catalogSortSchema.default("popular"),
  minPriceCentavos: z.number().int().nonnegative().optional(),
  maxPriceCentavos: z.number().int().nonnegative().optional(),
  includeInactive: z.boolean().optional(),
  cursor: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{1,128}$/)
    .optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export const catalogListResponseSchema = z.object({
  data: z.object({
    categories: z.array(catalogCategorySchema),
    items: z.array(catalogSkuSchema),
    nextCursor: z.string().min(1).nullable(),
  }),
  meta: responseMetaSchema,
});

export const catalogItemResponseSchema = z.object({
  data: catalogSkuSchema,
  meta: responseMetaSchema,
});

export const catalogAdminStatusRequestSchema = z.object({
  status: z.enum(["active", "paused", "archived"]),
});

export const catalogAdminStatusResponseSchema = z.object({
  data: z.object({
    id: z.string().min(1),
    status: z.enum(["active", "paused", "archived"]),
    updatedAt: z.string().datetime(),
  }),
  meta: responseMetaSchema,
});

export const catalogAdminLifecycleSchema = z.enum(["active", "paused", "archived"]);

export const catalogAdminItemSchema = catalogSkuSchema.extend({
  procurementCostCentavos: z.number().int().nonnegative(),
  markupBasisPoints: z.number().int().min(0).max(1_000_000),
  status: catalogAdminLifecycleSchema,
});

export const catalogAdminListResponseSchema = z.object({
  data: z.object({
    categories: z.array(catalogCategorySchema),
    items: z.array(catalogAdminItemSchema),
  }),
  meta: responseMetaSchema,
});

const catalogImageUrlSchema = z
  .string()
  .trim()
  .max(2_048)
  .refine(
    (value) => value.startsWith("/marketplace/") || z.string().url().safeParse(value).success,
    "imageUrl must be an absolute URL or a marketplace asset path",
  )
  .nullable();

export const catalogAdminCategoryUpsertRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    active: z.boolean().default(true),
  })
  .strict();

export const catalogAdminSkuUpsertRequestSchema = z
  .object({
    categoryId: z.string().trim().min(1).max(128),
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(1_000),
    unit: catalogUnitSchema,
    imageUrl: catalogImageUrlSchema,
    procurementCostCentavos: z.number().int().nonnegative(),
    markupBasisPoints: z.number().int().min(0).max(1_000_000),
    status: catalogAdminLifecycleSchema,
  })
  .strict();

export const catalogAdminCategoryResponseSchema = z.object({
  data: z.object({
    category: catalogCategorySchema,
    replayed: z.boolean(),
  }),
  meta: responseMetaSchema,
});

export const catalogAdminSkuResponseSchema = z.object({
  data: z.object({
    item: catalogAdminItemSchema,
    replayed: z.boolean(),
  }),
  meta: responseMetaSchema,
});

export type CatalogCategoryResponse = z.infer<typeof catalogCategorySchema>;
export type CatalogUnit = z.infer<typeof catalogUnitSchema>;
export type CatalogSkuResponse = z.infer<typeof catalogSkuSchema>;
export type CatalogSort = z.infer<typeof catalogSortSchema>;
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
export type CatalogListResponse = z.infer<typeof catalogListResponseSchema>;
export type CatalogItemResponse = z.infer<typeof catalogItemResponseSchema>;
export type CatalogAdminStatusRequest = z.infer<typeof catalogAdminStatusRequestSchema>;
export type CatalogAdminStatusResponse = z.infer<typeof catalogAdminStatusResponseSchema>;
export type CatalogAdminLifecycle = z.infer<typeof catalogAdminLifecycleSchema>;
export type CatalogAdminItem = z.infer<typeof catalogAdminItemSchema>;
export type CatalogAdminListResponse = z.infer<typeof catalogAdminListResponseSchema>;
export type CatalogAdminCategoryUpsertRequest = z.infer<
  typeof catalogAdminCategoryUpsertRequestSchema
>;
export type CatalogAdminSkuUpsertRequest = z.infer<typeof catalogAdminSkuUpsertRequestSchema>;
export type CatalogAdminCategoryResponse = z.infer<typeof catalogAdminCategoryResponseSchema>;
export type CatalogAdminSkuResponse = z.infer<typeof catalogAdminSkuResponseSchema>;
