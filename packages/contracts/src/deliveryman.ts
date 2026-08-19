import { z } from "zod";
import { responseMetaSchema } from "./system";

export const deliveryEventTypeSchema = z.enum(["picked_up", "arrived", "delivered", "failed"]);
export const deliverymanAssignmentSchema = z.object({
  id: z.string().min(1),
  cycleId: z.string().min(1),
  orderId: z.string().min(1),
  windowId: z.string().min(1),
  deliverymanUserId: z.string().min(1),
  status: z.enum(["assigned", "out_for_delivery", "delivered", "failed"]),
  assignedAt: z.string().datetime(),
  lastEventType: deliveryEventTypeSchema.nullable(),
});
export const deliveryEventSchema = z.object({
  id: z.string().min(1),
  clientEventId: z.string().min(1),
  assignmentId: z.string().min(1),
  orderId: z.string().min(1),
  deliverymanUserId: z.string().min(1),
  type: deliveryEventTypeSchema,
  occurredAt: z.string().datetime(),
  receivedAt: z.string().datetime(),
  note: z.string().max(500).nullable(),
});
export const deliverymanAssignmentsResponseSchema = z.object({
  data: z.object({ cycleId: z.string().min(1), assignments: z.array(deliverymanAssignmentSchema) }),
  meta: responseMetaSchema,
});
export const deliveryEventRequestSchema = z.object({
  clientEventId: z.string().trim().min(1).max(128),
  assignmentId: z.string().min(1),
  orderId: z.string().min(1),
  type: deliveryEventTypeSchema,
  occurredAt: z.string().datetime(),
  note: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional()
    .transform((value) => value ?? null),
});
export const deliveryEventResponseSchema = z.object({
  data: deliveryEventSchema,
  meta: responseMetaSchema,
});
export const deliverymanEventsResponseSchema = z.object({
  data: z.array(deliveryEventSchema),
  meta: responseMetaSchema,
});

export type DeliveryEventRequest = z.infer<typeof deliveryEventRequestSchema>;
export type DeliverymanAssignmentsResponse = z.infer<typeof deliverymanAssignmentsResponseSchema>;
