import { z } from "zod";
import { deliveryEventSchema } from "./deliveryman";
import { responseMetaSchema } from "./system";

export const deliveryTrackingSchema = z.object({
  orderId: z.string().min(1),
  assignmentId: z.string().min(1).nullable(),
  windowId: z.string().min(1).nullable(),
  status: z.enum(["pending", "assigned", "out_for_delivery", "delivered", "failed"]),
  latestEventType: deliveryEventSchema.shape.type.nullable(),
  events: z.array(deliveryEventSchema),
});

export const deliveryTrackingResponseSchema = z.object({
  data: deliveryTrackingSchema,
  meta: responseMetaSchema,
});

export type DeliveryTrackingResponse = z.infer<typeof deliveryTrackingResponseSchema>;
