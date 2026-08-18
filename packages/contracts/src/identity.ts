import { z } from "zod";

import { responseMetaSchema } from "./system.js";

export const roleSchema = z.enum(["customer", "deliveryman", "admin"]);
export const adminPermissionSchema = z.enum([
  "catalog",
  "pricing",
  "finance",
  "procurement",
  "packing",
  "dispatch",
  "support",
  "reporting",
  "staff",
  "superadmin",
]);

export const sessionSummarySchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  role: roleSchema,
  adminPermissions: z.array(adminPermissionSchema),
  customerId: z.string().min(1).nullable(),
  expiresAt: z.string().datetime(),
});

export const currentSessionResponseSchema = z.object({
  data: sessionSummarySchema,
  meta: responseMetaSchema,
});

export const consentRecordSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  purpose: z.enum(["privacy", "marketing"]),
  granted: z.boolean(),
  recordedAt: z.string().datetime(),
  policyVersion: z.string().min(1),
});

export const auditEventSchema = z.object({
  id: z.string().min(1),
  actorUserId: z.string().min(1).nullable(),
  action: z.string().min(1),
  targetType: z.string().min(1),
  targetId: z.string().min(1).nullable(),
  occurredAt: z.string().datetime(),
  metadata: z.record(z.string(), z.string()),
});

export type CurrentSessionResponse = z.infer<typeof currentSessionResponseSchema>;
