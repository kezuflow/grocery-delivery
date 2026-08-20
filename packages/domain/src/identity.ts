import { DomainValidationError } from "./errors.js";
import { isAdminPermission, isRole, type AdminPermission, type Role } from "./authorization.js";

export type Session = Readonly<{
  id: string;
  userId: string;
  role: Role;
  adminPermissions: readonly AdminPermission[];
  customerId: string | null;
  expiresAt: string;
  revokedAt: string | null;
  mfaRequired?: boolean;
  mfaVerified?: boolean;
}>;

export type RoleAssignment = Readonly<{
  userId: string;
  role: Role;
  adminPermissions: readonly AdminPermission[];
  assignedAt: string;
}>;

export type ConsentRecord = Readonly<{
  id: string;
  userId: string;
  purpose: "privacy" | "marketing";
  granted: boolean;
  recordedAt: string;
  policyVersion: string;
}>;

export type AuditEvent = Readonly<{
  id: string;
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  occurredAt: string;
  metadata: Readonly<Record<string, string>>;
}>;

export type MfaChallenge = Readonly<{
  id: string;
  userId: string;
  purpose: "payment" | "admin" | "session";
  status: "pending" | "verified" | "expired";
  expiresAt: string;
  verifiedAt: string | null;
  createdAt: string;
}>;

export function createSession(input: Session): Session {
  assertText(input.id, "session id");
  assertText(input.userId, "session user id");
  assertRole(input.role);
  assertPermissionScope(input.role, input.adminPermissions);
  assertCustomerScope(input.role, input.customerId);
  assertIsoTimestamp(input.expiresAt, "session expiresAt");
  if (input.revokedAt !== null) {
    assertIsoTimestamp(input.revokedAt, "session revokedAt");
  }

  return Object.freeze({ ...input, adminPermissions: Object.freeze([...input.adminPermissions]) });
}

export function isSessionActive(session: Session, now: string): boolean {
  assertIsoTimestamp(now, "session check time");
  return session.revokedAt === null && session.expiresAt > now;
}

export function canAccessCustomer(session: Session, customerId: string): boolean {
  return session.role === "customer" && session.customerId === customerId;
}

export function createRoleAssignment(input: RoleAssignment): RoleAssignment {
  assertText(input.userId, "role assignment user id");
  assertRole(input.role);
  assertIsoTimestamp(input.assignedAt, "role assignment assignedAt");
  assertPermissionScope(input.role, input.adminPermissions);

  return Object.freeze({ ...input, adminPermissions: Object.freeze([...input.adminPermissions]) });
}

export function createConsentRecord(input: ConsentRecord): ConsentRecord {
  assertText(input.id, "consent id");
  assertText(input.userId, "consent user id");
  if (input.purpose !== "privacy" && input.purpose !== "marketing") {
    throw new DomainValidationError("INVALID_CONSENT_PURPOSE", "unsupported consent purpose");
  }
  assertIsoTimestamp(input.recordedAt, "consent recordedAt");
  assertText(input.policyVersion, "consent policy version");

  return Object.freeze({ ...input });
}

export function createAuditEvent(input: AuditEvent): AuditEvent {
  assertText(input.id, "audit event id");
  if (input.actorUserId !== null) {
    assertText(input.actorUserId, "audit actor user id");
  }
  assertText(input.action, "audit action");
  assertText(input.targetType, "audit target type");
  if (input.targetId !== null) {
    assertText(input.targetId, "audit target id");
  }
  assertIsoTimestamp(input.occurredAt, "audit occurredAt");

  return Object.freeze({ ...input, metadata: Object.freeze({ ...input.metadata }) });
}

export function createMfaChallenge(input: MfaChallenge): MfaChallenge {
  assertText(input.id, "mfa challenge id");
  assertText(input.userId, "mfa challenge user id");
  if (input.purpose !== "payment" && input.purpose !== "admin" && input.purpose !== "session") {
    throw new DomainValidationError("INVALID_MFA_PURPOSE", "unsupported MFA purpose");
  }
  if (input.status !== "pending" && input.status !== "verified" && input.status !== "expired") {
    throw new DomainValidationError("INVALID_MFA_STATUS", "unsupported MFA status");
  }
  assertIsoTimestamp(input.expiresAt, "mfa challenge expiresAt");
  if (input.verifiedAt !== null) {
    assertIsoTimestamp(input.verifiedAt, "mfa challenge verifiedAt");
  }
  assertIsoTimestamp(input.createdAt, "mfa challenge createdAt");

  return Object.freeze({ ...input });
}

export function isMfaChallengeActive(challenge: MfaChallenge, now: string): boolean {
  assertIsoTimestamp(now, "mfa challenge check time");
  return challenge.status === "pending" && challenge.expiresAt > now;
}

function assertRole(role: string): asserts role is Role {
  if (!isRole(role)) {
    throw new DomainValidationError("INVALID_ROLE", `unsupported role: ${role}`);
  }
}

function assertPermissionScope(role: Role, permissions: readonly string[]): void {
  if (permissions.some((permission) => !isAdminPermission(permission))) {
    throw new DomainValidationError("INVALID_PERMISSION", "unsupported admin permission");
  }
  if (role !== "admin" && permissions.length > 0) {
    throw new DomainValidationError("INVALID_ROLE_SCOPE", "only admins may hold admin permissions");
  }
}

function assertCustomerScope(role: Role, customerId: string | null): void {
  if (role === "customer" && !customerId) {
    throw new DomainValidationError(
      "INVALID_CUSTOMER_SCOPE",
      "customer sessions require customerId",
    );
  }
  if (role !== "customer" && customerId !== null) {
    throw new DomainValidationError(
      "INVALID_CUSTOMER_SCOPE",
      "only customer sessions may hold customerId",
    );
  }
}

function assertText(value: string, field: string): void {
  if (!value.trim()) {
    throw new DomainValidationError("INVALID_IDENTITY_TEXT", `${field} must not be empty`);
  }
}

function assertIsoTimestamp(value: string, field: string): void {
  if (Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new DomainValidationError("INVALID_TIMESTAMP", `${field} must be an ISO timestamp`);
  }
}
