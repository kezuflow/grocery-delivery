import { describe, expect, it } from "vitest";

import { createConsentRecord, createMfaChallenge, createSession } from "@carbon/domain";

import type { CatalogDatabase, CatalogPreparedStatement } from "./catalog.js";
import { D1IdentityRepository } from "./identity.js";

describe("identity repository", () => {
  it("loads server-owned role scope for Better Auth sessions", async () => {
    const database = new FakeIdentityDatabase([
      [
        {
          role: "admin",
          customer_id: null,
          admin_permissions_json: '["catalog","finance"]',
          mfa_required: 0,
        },
      ],
    ]);

    await expect(new D1IdentityRepository(database).findRoleAssignment("admin-1")).resolves.toEqual(
      {
        role: "admin",
        customerId: null,
        adminPermissions: ["catalog", "finance"],
        mfaRequired: false,
      },
    );
    expect(database.calls[0]?.values).toEqual(["admin-1"]);
  });

  it("restores a persisted role-scoped session by token hash", async () => {
    const database = new FakeIdentityDatabase([
      [
        {
          id: "session-1",
          user_id: "admin-1",
          expires_at: "2026-08-20T00:00:00.000Z",
          revoked_at: null,
          role: "admin",
          customer_id: null,
          admin_permissions_json: '["pricing","finance"]',
        },
      ],
    ]);

    await expect(
      new D1IdentityRepository(database).findByTokenHash("hash-1"),
    ).resolves.toMatchObject({
      id: "session-1",
      role: "admin",
      adminPermissions: ["pricing", "finance"],
    });
  });

  it("lists customer identities without exposing other roles", async () => {
    const database = new FakeIdentityDatabase([
      [
        {
          id: "customer-1",
          email: "customer@example.com",
          name: "Customer One",
          email_verified: 1,
          image_url: null,
          created_at: "2026-08-19T00:00:00.000Z",
          updated_at: "2026-08-20T00:00:00.000Z",
        },
      ],
    ]);

    await expect(new D1IdentityRepository(database).listCustomers(25)).resolves.toEqual([
      {
        id: "customer-1",
        email: "customer@example.com",
        name: "Customer One",
        emailVerified: true,
        imageUrl: null,
        createdAt: "2026-08-19T00:00:00.000Z",
        updatedAt: "2026-08-20T00:00:00.000Z",
      },
    ]);
    expect(database.calls[0]?.sql).toContain("WHERE r.role = 'customer'");
    expect(database.calls[0]?.values).toEqual([25]);
  });

  it("persists role scope and session revocation through D1 batches", async () => {
    const database = new FakeIdentityDatabase([]);
    const repository = new D1IdentityRepository(database);
    await repository.saveUser({
      id: "customer-1",
      email: "customer@example.com",
      name: "Customer One",
      emailVerified: true,
      imageUrl: null,
      createdAt: "2026-08-18T00:00:00.000Z",
      updatedAt: "2026-08-18T00:00:00.000Z",
    });
    await repository.saveSession(
      createSession({
        id: "session-1",
        userId: "customer-1",
        role: "customer",
        adminPermissions: [],
        customerId: "customer-1",
        expiresAt: "2026-08-20T00:00:00.000Z",
        revokedAt: null,
      }),
      "hash-1",
      "2026-08-18T00:00:00.000Z",
    );
    await repository.revokeSession("session-1", "2026-08-18T01:00:00.000Z");

    expect(database.batches[0]).toHaveLength(1);
    expect(database.batches[1]).toHaveLength(2);
    expect(database.calls[0]?.sql).toContain("identity_users");
    expect(database.calls.some((call) => call.sql.includes("identity_sessions"))).toBe(true);
    expect(database.calls.some((call) => call.sql.includes("SET revoked_at"))).toBe(true);
  });

  it("persists consents, audit events, and MFA hooks", async () => {
    const database = new FakeIdentityDatabase([]);
    const repository = new D1IdentityRepository(database);
    await repository.saveConsent(
      createConsentRecord({
        id: "consent-1",
        userId: "user-1",
        purpose: "privacy",
        granted: true,
        policyVersion: "2026-08",
        recordedAt: "2026-08-18T00:00:00.000Z",
      }),
    );
    await repository.saveAuditEvent({
      id: "audit-1",
      actorUserId: "admin-1",
      action: "identity.role-assigned",
      targetType: "user",
      targetId: "user-1",
      occurredAt: "2026-08-18T00:00:00.000Z",
      metadata: { role: "customer" },
    });
    await repository.saveMfaChallenge(
      createMfaChallenge({
        id: "challenge-1",
        userId: "user-1",
        purpose: "session",
        status: "pending",
        expiresAt: "2026-08-18T00:10:00.000Z",
        verifiedAt: null,
        createdAt: "2026-08-18T00:00:00.000Z",
      }),
    );
    await repository.verifyMfaChallenge("challenge-1", "2026-08-18T00:05:00.000Z");

    expect(database.calls.map((call) => call.sql)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("identity_consents"),
        expect.stringContaining("audit_events"),
        expect.stringContaining("identity_mfa_challenges"),
      ]),
    );
  });

  it("lists and revokes both legacy and Better Auth sessions", async () => {
    const database = new FakeIdentityDatabase([
      [
        {
          id: "legacy-session",
          created_at: "2026-08-18T00:00:00.000Z",
          expires_at: "2026-09-18T00:00:00.000Z",
          revoked_at: null,
        },
      ],
      [
        {
          id: "better-auth-session",
          created_at: Date.parse("2026-08-19T00:00:00.000Z"),
          expires_at: Date.parse("2026-09-19T00:00:00.000Z"),
        },
      ],
    ]);
    const repository = new D1IdentityRepository(database);

    await expect(repository.listSessions("user-1")).resolves.toEqual([
      {
        id: "better-auth-session",
        createdAt: "2026-08-19T00:00:00.000Z",
        expiresAt: "2026-09-19T00:00:00.000Z",
        revokedAt: null,
      },
      {
        id: "legacy-session",
        createdAt: "2026-08-18T00:00:00.000Z",
        expiresAt: "2026-09-18T00:00:00.000Z",
        revokedAt: null,
      },
    ]);
    await repository.revokeSession("better-auth-session", "2026-08-20T00:00:00.000Z");
    await repository.revokeAllSessions("user-1", "2026-08-20T00:01:00.000Z");

    expect(
      database.calls.some((call) => call.sql.includes("DELETE FROM better_auth_session WHERE id")),
    ).toBe(true);
    expect(
      database.calls.some((call) =>
        call.sql.includes("DELETE FROM better_auth_session WHERE user_id"),
      ),
    ).toBe(true);
  });

  it("derives account deletion blockers from subscriptions and retained orders", async () => {
    const database = new FakeIdentityDatabase([[{ id: "subscription-1" }], [{ id: "order-1" }]]);

    await expect(
      new D1IdentityRepository(database).findDeletionBlockingReasons("customer-1"),
    ).resolves.toEqual(["ACTIVE_SUBSCRIPTION", "ORDER_RETENTION_REQUIRED"]);
  });
});

class FakeIdentityDatabase implements CatalogDatabase {
  readonly calls: Array<{ sql: string; values: unknown[] }> = [];
  readonly batches: Array<readonly CatalogPreparedStatement[]> = [];

  constructor(private readonly results: readonly (readonly Record<string, unknown>[])[]) {}

  prepare(sql: string): CatalogPreparedStatement {
    const call = { sql, values: [] as unknown[] };
    this.calls.push(call);
    const result = this.results[this.calls.length - 1] ?? [];
    const statement: CatalogPreparedStatement = {
      bind: (...values) => {
        call.values = values;
        return statement;
      },
      all: <T extends Record<string, unknown>>() =>
        Promise.resolve({ results: result as readonly T[] }),
    };
    return statement;
  }

  batch(statements: readonly CatalogPreparedStatement[]): Promise<readonly unknown[]> {
    this.batches.push(statements);
    return Promise.resolve([]);
  }
}
