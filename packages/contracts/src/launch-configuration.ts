import { z } from "zod";

import { catalogUnitSchema } from "./catalog";
import { responseMetaSchema } from "./system";

const identifierSchema = z.string().trim().min(1).max(128);
const isoTimestampSchema = z.string().datetime({ offset: true });

export const launchConfigurationApplyRequestSchema = z
  .object({
    reason: z.string().trim().min(1).max(500),
    categories: z
      .array(
        z
          .object({
            id: identifierSchema,
            name: z.string().trim().min(1).max(160),
            slug: z
              .string()
              .max(160)
              .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
            active: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    skus: z
      .array(
        z
          .object({
            id: identifierSchema,
            categoryId: identifierSchema,
            name: z.string().trim().min(1).max(160),
            slug: z
              .string()
              .max(160)
              .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
            description: z.string().trim().min(1).max(1_000),
            unit: catalogUnitSchema,
            imageUrl: z.string().max(2_048).url().nullable(),
            procurementCostCentavos: z.number().int().nonnegative(),
            markupBasisPoints: z.number().int().min(0).max(1_000_000),
            priceEffectiveAt: isoTimestampSchema,
            active: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      // Each SKU expands to three D1 statements. Keep the manifest below D1's
      // atomic batch limit when combined with categories, windows, and audit rows.
      .max(200),
    deliveryWindows: z
      .array(
        z
          .object({
            id: identifierSchema,
            cycleId: identifierSchema,
            label: z.string().trim().min(1).max(120),
            startsAt: isoTimestampSchema,
            endsAt: isoTimestampSchema,
            capacity: z.number().int().min(1).max(100_000),
            active: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();

export const launchConfigurationResponseSchema = z.object({
  data: z.object({
    idempotencyKey: identifierSchema,
    categoryCount: z.number().int().nonnegative(),
    skuCount: z.number().int().nonnegative(),
    deliveryWindowCount: z.number().int().nonnegative(),
    appliedAt: isoTimestampSchema,
    replayed: z.boolean(),
  }),
  meta: responseMetaSchema,
});

export type LaunchConfigurationApplyRequest = z.infer<typeof launchConfigurationApplyRequestSchema>;
export type LaunchConfigurationResponse = z.infer<typeof launchConfigurationResponseSchema>;
