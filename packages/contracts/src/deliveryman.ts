import { z } from "zod";
import { responseMetaSchema } from "./system";

export const deliveryEventTypeSchema = z.enum(["picked_up", "arrived", "delivered", "failed"]);
export const deliveryFailureReasonSchema = z.enum([
  "customer_unavailable",
  "address_inaccessible",
  "damaged_order",
  "other",
]);
export const deliverymanAssignmentSchema = z.object({
  id: z.string().min(1),
  cycleId: z.string().min(1),
  orderId: z.string().min(1),
  windowId: z.string().min(1),
  deliverymanUserId: z.string().min(1),
  status: z.enum(["assigned", "out_for_delivery", "delivered", "failed"]),
  assignedAt: z.string().datetime(),
  lastEventType: deliveryEventTypeSchema.nullable(),
  routeSequence: z.number().int().positive(),
  recipientName: z.string().min(1).nullable(),
  recipientPhone: z.string().min(1).nullable(),
  deliveryAddress: z
    .object({
      line1: z.string().min(1),
      line2: z.string().nullable(),
      barangay: z.string().min(1),
      city: z.string().min(1),
      province: z.string().min(1),
      postalCode: z.string().min(1),
      instructions: z.string().nullable(),
    })
    .nullable(),
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
  failureReason: deliveryFailureReasonSchema.nullable(),
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
  failureReason: deliveryFailureReasonSchema
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
export type DeliveryEvent = z.infer<typeof deliveryEventSchema>;
export type DeliverymanAssignmentsResponse = z.infer<typeof deliverymanAssignmentsResponseSchema>;
