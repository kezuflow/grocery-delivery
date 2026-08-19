import { z } from "zod";
import { responseMetaSchema } from "./system";

export const deliveryWindowSchema = z.object({
  id: z.string().min(1),
  cycleId: z.string().min(1),
  label: z.string().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  capacity: z.number().int().positive(),
  reserved: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
  active: z.boolean(),
});

export const deliveryWindowsResponseSchema = z.object({
  data: z.object({
    cycleId: z.string().min(1),
    windows: z.array(deliveryWindowSchema),
    selectedWindowId: z.string().min(1).nullable(),
  }),
  meta: responseMetaSchema,
});

export const deliveryWindowSelectionRequestSchema = z.object({ windowId: z.string().min(1) });

export type DeliveryWindowsResponse = z.infer<typeof deliveryWindowsResponseSchema>;
export type DeliveryWindowSelectionRequest = z.infer<typeof deliveryWindowSelectionRequestSchema>;
