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

export type IdentitySessionRecord = Readonly<{
  id: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}>;

export interface AccountIdentityRepository {
  findUser(userId: string): Promise<IdentityUser | null>;
  updateUserName(userId: string, name: string, updatedAt: string): Promise<void>;
  listSessions(userId: string): Promise<readonly IdentitySessionRecord[]>;
  revokeSession(sessionId: string, revokedAt: string): Promise<void>;
  revokeAllSessions(userId: string, revokedAt: string): Promise<void>;
  listConsents(userId: string): Promise<readonly ConsentRecord[]>;
  saveConsent(consent: ConsentRecord): Promise<void>;
  saveAuditEvent(event: AuditEvent): Promise<void>;
  findDeletionBlockingReasons(customerId: string): Promise<readonly string[]>;
  findCommandResult(
    userId: string,
    command: string,
    idempotencyKey: string,
  ): Promise<IdentityCommandResult | null>;
  saveCommandResult(result: IdentityCommandResult): Promise<void>;
}

export type IdentityCommandResult = Readonly<{
  userId: string;
  command: string;
  idempotencyKey: string;
  requestFingerprint: string;
  responseStatus: number;
  result: Readonly<Record<string, unknown>>;
  createdAt: string;
}>;

export type IdentityRoleAssignment = Readonly<{
  role: "customer" | "deliveryman" | "admin";
  customerId: string | null;
  adminPermissions: readonly AdminPermission[];
}>;

export class D1IdentityRepository {
  constructor(private readonly database: IdentityDatabase) {}

  async findRoleAssignment(userId: string): Promise<IdentityRoleAssignment | null> {
    const rows = await this.database
      .prepare(
        `SELECT role, customer_id, admin_permissions_json FROM identity_role_assignments WHERE user_id = ? LIMIT 1`,
      )
      .bind(userId)
      .all<{
        role: IdentityRoleAssignment["role"];
        customer_id: string | null;
        admin_permissions_json: string;
      }>();
    const row = rows.results[0];
    return row
      ? {
          role: row.role,
          customerId: row.customer_id,
          adminPermissions: parseAdminPermissions(row.admin_permissions_json),
        }
      : null;
  }

  async findUser(userId: string): Promise<IdentityUser | null> {
    const rows = await this.database
      .prepare(
        `SELECT id, email, name, email_verified, image_url, created_at, updated_at
         FROM identity_users WHERE id = ? LIMIT 1`,
      )
      .bind(userId)
      .all<IdentityUserRow>();
    const row = rows.results[0];
    return row
      ? {
          id: row.id,
          email: row.email,
          name: row.name,
          emailVerified: row.email_verified === 1,
          imageUrl: row.image_url,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      : null;
  }

  async updateUserName(userId: string, name: string, updatedAt: string): Promise<void> {
    await this.database.batch([
      this.database
        .prepare(`UPDATE identity_users SET name = ?, updated_at = ? WHERE id = ?`)
        .bind(name, updatedAt, userId),
      this.database
        .prepare(`UPDATE better_auth_user SET name = ?, updated_at = ? WHERE id = ?`)
        .bind(name, Date.parse(updatedAt), userId),
    ]);
  }

  async listSessions(userId: string): Promise<readonly IdentitySessionRecord[]> {
    const legacyRows = await this.database
      .prepare(
        `SELECT id, created_at, expires_at, revoked_at
         FROM identity_sessions WHERE user_id = ? ORDER BY created_at DESC, id DESC`,
      )
      .bind(userId)
      .all<IdentitySessionRow>();
    const betterAuthRows = await this.database
      .prepare(
        `SELECT id, created_at, expires_at
         FROM better_auth_session WHERE user_id = ? ORDER BY created_at DESC, id DESC`,
      )
      .bind(userId)
      .all<BetterAuthSessionRow>();
    return [
      ...legacyRows.results.map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        revokedAt: row.revoked_at,
      })),
      ...betterAuthRows.results.map((row) => ({
        id: row.id,
        createdAt: new Date(row.created_at).toISOString(),
        expiresAt: new Date(row.expires_at).toISOString(),
        revokedAt: null,
      })),
    ].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async revokeAllSessions(userId: string, revokedAt: string): Promise<void> {
    await this.database.batch([
      this.database
        .prepare(
          `UPDATE identity_sessions SET revoked_at = ?, updated_at = ?
           WHERE user_id = ? AND revoked_at IS NULL`,
        )
        .bind(revokedAt, revokedAt, userId),
      this.database.prepare(`DELETE FROM better_auth_session WHERE user_id = ?`).bind(userId),
    ]);
  }

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
      this.database.prepare(`DELETE FROM better_auth_session WHERE id = ?`).bind(sessionId),
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
           ) VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO NOTHING`,
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
           ) VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO NOTHING`,
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

  async findDeletionBlockingReasons(customerId: string): Promise<readonly string[]> {
    const subscriptions = await this.database
      .prepare(
        `SELECT id FROM subscriptions
         WHERE customer_id = ? AND status IN ('active', 'paused') LIMIT 1`,
      )
      .bind(customerId)
      .all<{ id: string }>();
    const orders = await this.database
      .prepare(
        `SELECT o.id FROM orders o
         INNER JOIN subscriptions s ON s.id = o.subscription_id
         WHERE s.customer_id = ? LIMIT 1`,
      )
      .bind(customerId)
      .all<{ id: string }>();
    return [
      ...(subscriptions.results.length ? ["ACTIVE_SUBSCRIPTION"] : []),
      ...(orders.results.length ? ["ORDER_RETENTION_REQUIRED"] : []),
    ];
  }

  async findCommandResult(
    userId: string,
    command: string,
    idempotencyKey: string,
  ): Promise<IdentityCommandResult | null> {
    const rows = await this.database
      .prepare(
        `SELECT user_id, command, idempotency_key, request_fingerprint, response_status,
                result_json, created_at
         FROM identity_command_idempotency
         WHERE user_id = ? AND command = ? AND idempotency_key = ? LIMIT 1`,
      )
      .bind(userId, command, idempotencyKey)
      .all<IdentityCommandResultRow>();
    const row = rows.results[0];
    return row
      ? {
          userId: row.user_id,
          command: row.command,
          idempotencyKey: row.idempotency_key,
          requestFingerprint: row.request_fingerprint,
          responseStatus: row.response_status,
          result: parseObject(row.result_json),
          createdAt: row.created_at,
        }
      : null;
  }

  async saveCommandResult(result: IdentityCommandResult): Promise<void> {
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO identity_command_idempotency (
             user_id, command, idempotency_key, request_fingerprint, response_status,
             result_json, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(user_id, command, idempotency_key) DO NOTHING`,
        )
        .bind(
          result.userId,
          result.command,
          result.idempotencyKey,
          result.requestFingerprint,
          result.responseStatus,
          JSON.stringify(result.result),
          result.createdAt,
        ),
    ]);
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

type IdentityUserRow = Record<string, unknown> & {
  id: string;
  email: string;
  name: string;
  email_verified: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

type IdentitySessionRow = Record<string, unknown> & {
  id: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
};

type BetterAuthSessionRow = Record<string, unknown> & {
  id: string;
  created_at: number;
  expires_at: number;
};

type IdentityCommandResultRow = Record<string, unknown> & {
  user_id: string;
  command: string;
  idempotency_key: string;
  request_fingerprint: string;
  response_status: number;
  result_json: string;
  created_at: string;
};

function parseObject(value: string): Readonly<Record<string, unknown>> {
  const parsed: unknown = JSON.parse(value);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Readonly<Record<string, unknown>>)
    : {};
}

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
