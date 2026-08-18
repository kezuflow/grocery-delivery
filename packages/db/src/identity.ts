import {
  createAuditEvent,
  createConsentRecord,
  createMfaChallenge,
  createRoleAssignment,
  createSession,
  type AdminPermission,
  type AuditEvent,
  type ConsentRecord,
  type MfaChallenge,
  type RoleAssignment,
  type Session,
} from "@carbon/domain";

import type { CatalogDatabase } from "./catalog.js";

export type IdentityDatabase = CatalogDatabase;

export type IdentityUser = Readonly<{
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export class D1IdentityRepository {
  constructor(private readonly database: IdentityDatabase) {}

  async saveUser(user: IdentityUser): Promise<void> {
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO identity_users (
             id, email, name, email_verified, image_url, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             email = excluded.email,
             name = excluded.name,
             email_verified = excluded.email_verified,
             image_url = excluded.image_url,
             updated_at = excluded.updated_at`,
        )
        .bind(
          user.id,
          user.email,
          user.name,
          user.emailVerified ? 1 : 0,
          user.imageUrl,
          user.createdAt,
          user.updatedAt,
        ),
    ]);
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const rows = await this.database
      .prepare(
        `SELECT s.id, s.user_id, s.expires_at, s.revoked_at,
                r.role, r.customer_id, r.admin_permissions_json
         FROM identity_sessions s
         INNER JOIN identity_role_assignments r ON r.user_id = s.user_id
         WHERE s.token_hash = ?
         LIMIT 1`,
      )
      .bind(tokenHash)
      .all<SessionRow>();
    const row = rows.results[0];
    if (!row) {
      return null;
    }
    return createSession({
      id: row.id,
      userId: row.user_id,
      role: row.role,
      adminPermissions: parseAdminPermissions(row.admin_permissions_json),
      customerId: row.customer_id,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at,
    });
  }

  async saveSession(session: Session, tokenHash: string, createdAt: string): Promise<void> {
    const assignment = this.database
      .prepare(
        `INSERT INTO identity_role_assignments (
           user_id, role, customer_id, admin_permissions_json, mfa_required, assigned_at
         ) VALUES (?, ?, ?, ?, 0, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           role = excluded.role,
           customer_id = excluded.customer_id,
           admin_permissions_json = excluded.admin_permissions_json,
           assigned_at = excluded.assigned_at`,
      )
      .bind(
        session.userId,
        session.role,
        session.customerId,
        JSON.stringify(session.adminPermissions),
        createdAt,
      );
    const savedSession = this.database
      .prepare(
        `INSERT INTO identity_sessions (
           id, user_id, token_hash, expires_at, revoked_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           token_hash = excluded.token_hash,
           expires_at = excluded.expires_at,
           revoked_at = excluded.revoked_at,
           updated_at = excluded.updated_at`,
      )
      .bind(
        session.id,
        session.userId,
        tokenHash,
        session.expiresAt,
        session.revokedAt,
        createdAt,
        createdAt,
      );
    await this.database.batch([assignment, savedSession]);
  }

  async revokeSession(sessionId: string, revokedAt: string): Promise<void> {
    await this.database.batch([
      this.database
        .prepare(
          `UPDATE identity_sessions
           SET revoked_at = ?, updated_at = ?
           WHERE id = ? AND revoked_at IS NULL`,
        )
        .bind(revokedAt, revokedAt, sessionId),
    ]);
  }

  async saveRoleAssignment(
    assignment: RoleAssignment,
    customerId: string | null,
    mfaRequired: boolean,
  ): Promise<void> {
    const value = createRoleAssignment(assignment);
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO identity_role_assignments (
             user_id, role, customer_id, admin_permissions_json, mfa_required, assigned_at
           ) VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET
             role = excluded.role,
             customer_id = excluded.customer_id,
             admin_permissions_json = excluded.admin_permissions_json,
             mfa_required = excluded.mfa_required,
             assigned_at = excluded.assigned_at`,
        )
        .bind(
          value.userId,
          value.role,
          customerId,
          JSON.stringify(value.adminPermissions),
          mfaRequired ? 1 : 0,
          value.assignedAt,
        ),
    ]);
  }

  async saveConsent(consent: ConsentRecord): Promise<void> {
    const value = createConsentRecord(consent);
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO identity_consents (
             id, user_id, purpose, granted, policy_version, recorded_at
           ) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          value.id,
          value.userId,
          value.purpose,
          value.granted ? 1 : 0,
          value.policyVersion,
          value.recordedAt,
        ),
    ]);
  }

  async saveAuditEvent(event: AuditEvent): Promise<void> {
    const value = createAuditEvent(event);
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO audit_events (
             id, actor_user_id, action, target_type, target_id, occurred_at, metadata_json
           ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          value.id,
          value.actorUserId,
          value.action,
          value.targetType,
          value.targetId,
          value.occurredAt,
          JSON.stringify(value.metadata),
        ),
    ]);
  }

  async saveMfaChallenge(challenge: MfaChallenge): Promise<void> {
    const value = createMfaChallenge(challenge);
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO identity_mfa_challenges (
             id, user_id, purpose, status, expires_at, verified_at, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          value.id,
          value.userId,
          value.purpose,
          value.status,
          value.expiresAt,
          value.verifiedAt,
          value.createdAt,
        ),
    ]);
  }

  async verifyMfaChallenge(challengeId: string, verifiedAt: string): Promise<void> {
    await this.database.batch([
      this.database
        .prepare(
          `UPDATE identity_mfa_challenges
           SET status = 'verified', verified_at = ?
           WHERE id = ? AND status = 'pending' AND expires_at > ?`,
        )
        .bind(verifiedAt, challengeId, verifiedAt),
    ]);
  }

  async listConsents(userId: string): Promise<readonly ConsentRecord[]> {
    const rows = await this.database
      .prepare(
        `SELECT id, user_id, purpose, granted, policy_version, recorded_at
         FROM identity_consents
         WHERE user_id = ?
         ORDER BY recorded_at ASC, id ASC`,
      )
      .bind(userId)
      .all<ConsentRow>();
    return rows.results.map((row) =>
      createConsentRecord({
        id: row.id,
        userId: row.user_id,
        purpose: row.purpose,
        granted: row.granted === 1,
        policyVersion: row.policy_version,
        recordedAt: row.recorded_at,
      }),
    );
  }

  async findMfaChallenge(challengeId: string): Promise<MfaChallenge | null> {
    const rows = await this.database
      .prepare(
        `SELECT id, user_id, purpose, status, expires_at, verified_at, created_at
         FROM identity_mfa_challenges
         WHERE id = ?
         LIMIT 1`,
      )
      .bind(challengeId)
      .all<MfaChallengeRow>();
    const row = rows.results[0];
    return row
      ? createMfaChallenge({
          id: row.id,
          userId: row.user_id,
          purpose: row.purpose,
          status: row.status,
          expiresAt: row.expires_at,
          verifiedAt: row.verified_at,
          createdAt: row.created_at,
        })
      : null;
  }
}

function parseAdminPermissions(value: string): readonly AdminPermission[] {
  const parsed: unknown = JSON.parse(value);
  return Array.isArray(parsed) ? (parsed as AdminPermission[]) : [];
}

type SessionRow = Record<string, unknown> & {
  id: string;
  user_id: string;
  expires_at: string;
  revoked_at: string | null;
  role: "customer" | "deliveryman" | "admin";
  customer_id: string | null;
  admin_permissions_json: string;
};

type ConsentRow = Record<string, unknown> & {
  id: string;
  user_id: string;
  purpose: "privacy" | "marketing";
  granted: number;
  policy_version: string;
  recorded_at: string;
};

type MfaChallengeRow = Record<string, unknown> & {
  id: string;
  user_id: string;
  purpose: "payment" | "admin" | "session";
  status: "pending" | "verified" | "expired";
  expires_at: string;
  verified_at: string | null;
  created_at: string;
};
