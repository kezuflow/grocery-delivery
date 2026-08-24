import { z } from "zod";

import { responseMetaSchema } from "./system";

export const roleSchema = z.enum(["customer", "deliveryman", "admin"]);
export const adminPermissionSchema = z.enum([
  "catalog",
  "pricing",
  "marketing",
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
  mfaRequired: z.boolean(),
  mfaVerified: z.boolean(),
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

export const adminAuditResponseSchema = z.object({
  data: z.object({ events: z.array(auditEventSchema) }),
  meta: responseMetaSchema,
});

export type AdminAuditResponse = z.infer<typeof adminAuditResponseSchema>;

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

export const accountConsentResponseSchema = z.object({
  data: accountConsentRequestSchema,
  meta: responseMetaSchema,
});

export const accountDeletionEligibilityResponseSchema = z.object({
  data: z.object({
    eligible: z.boolean(),
    reasons: z.array(z.string().min(1)),
  }),
  meta: responseMetaSchema,
});

export const accountDeletionRequestResponseSchema = z.object({
  data: z.object({
    requested: z.boolean(),
    eligible: z.boolean(),
    reasons: z.array(z.string().min(1)),
  }),
  meta: responseMetaSchema,
});

export const sessionRevokeRequestSchema = z.object({
  sessionId: z.string().trim().min(1).max(128),
});

export const adminRoleAssignmentRequestSchema = z
  .object({
    userId: z.string().trim().min(1).max(128),
    role: roleSchema,
    adminPermissions: z.array(adminPermissionSchema).max(10).default([]),
  })
  .superRefine((value, context) => {
    if (value.role !== "admin" && value.adminPermissions.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["adminPermissions"],
        message: "only administrators may receive administrator permissions",
      });
    }
  });

export const adminRoleAssignmentResponseSchema = z.object({
  data: z.object({
    userId: z.string().min(1),
    role: roleSchema,
    adminPermissions: z.array(adminPermissionSchema),
    mfaRequired: z.boolean(),
  }),
  meta: responseMetaSchema,
});

export type CurrentSessionResponse = z.infer<typeof currentSessionResponseSchema>;
export type AccountExportResponse = z.infer<typeof accountExportResponseSchema>;
export type AccountProfileUpdateRequest = z.infer<typeof accountProfileUpdateRequestSchema>;
export type AccountConsentRequest = z.infer<typeof accountConsentRequestSchema>;
export type AdminRoleAssignmentRequest = z.infer<typeof adminRoleAssignmentRequestSchema>;
export type AdminRoleAssignmentResponse = z.infer<typeof adminRoleAssignmentResponseSchema>;
export type AccountDeletionRequestResponse = z.infer<typeof accountDeletionRequestResponseSchema>;
