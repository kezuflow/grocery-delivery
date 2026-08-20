import { z } from "zod";

import { responseMetaSchema } from "./system";

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

export const accountProfileSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  emailVerified: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const accountExportResponseSchema = z.object({
  data: z.object({
    profile: accountProfileSchema,
    consents: z.array(consentRecordSchema),
    sessions: z.array(
      z.object({
        id: z.string().min(1),
        createdAt: z.string().datetime(),
        expiresAt: z.string().datetime(),
        revokedAt: z.string().datetime().nullable(),
        current: z.boolean(),
      }),
    ),
  }),
  meta: responseMetaSchema,
});

export const accountProfileUpdateRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const accountConsentRequestSchema = z.object({
  purpose: z.enum(["privacy", "marketing"]),
  granted: z.boolean(),
  policyVersion: z.string().trim().min(1).max(64),
});

export const accountDeletionEligibilityResponseSchema = z.object({
  data: z.object({
    eligible: z.boolean(),
    reasons: z.array(z.string().min(1)),
  }),
  meta: responseMetaSchema,
});

export const sessionRevokeRequestSchema = z.object({
  sessionId: z.string().trim().min(1).max(128),
});

export type CurrentSessionResponse = z.infer<typeof currentSessionResponseSchema>;
export type AccountExportResponse = z.infer<typeof accountExportResponseSchema>;
export type AccountProfileUpdateRequest = z.infer<typeof accountProfileUpdateRequestSchema>;
export type AccountConsentRequest = z.infer<typeof accountConsentRequestSchema>;
