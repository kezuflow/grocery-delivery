import { readFile } from "node:fs/promises";
import { fileURLToPath, URL as NodeURL } from "node:url";

import { apiErrorResponseSchema, currentSessionResponseSchema } from "@carbon/contracts";
import { InMemoryIdentityEmailSender } from "@carbon/notifications";
import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createConfiguredApi } from "./runtime.js";

describe("Better Auth D1 integration", () => {
  let miniflare: Miniflare;
  let database: D1Database;

  beforeAll(async () => {
    miniflare = new Miniflare({
      workers: [
        {
          config: {
            type: "worker",
            name: "better-auth-test",
            compatibilityDate: "2026-08-18",
            compatibilityFlags: ["nodejs_compat"],
            manifest: {
              mainModule: "index.js",
              modules: {
                "index.js": {
                  type: "esm",
                  contents: "export default { fetch() { return new Response('ok'); } }",
                },
              },
            },
            env: { DB: { type: "d1", id: "better-auth-test" } },
          },
        },
      ],
    });
    database = (await miniflare.getD1Database("DB")) as D1Database;
    for (const migration of [
      "0007_identity.sql",
      "0014_better_auth.sql",
      "0022_better_auth_two_factor.sql",
    ]) {
      const sql = await readFile(
        fileURLToPath(new NodeURL(`../../../packages/db/migrations/${migration}`, import.meta.url)),
        "utf8",
      );
      for (const statement of sql
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)) {
        await database.prepare(statement).run();
      }
    }
  });

  afterAll(async () => {
    await miniflare?.dispose();
  });

  it("signs up a customer and resolves server-owned role scope", async () => {
    const emailSender = new InMemoryIdentityEmailSender();
    const bindings = {
      APP_ENV: "test",
      AUTH_MODE: "better-auth",
      BETTER_AUTH_SECRET: "integration-secret-that-is-at-least-32-characters",
      BETTER_AUTH_URL: "https://api.example.test",
      DB: database,
    } as const;
    const app = createConfiguredApi(bindings, {
      createIdentityEmailSender: () => emailSender,
    });
    const signUp = await app.request(
      "/api/auth/sign-up/email",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Customer One",
          email: "customer@example.com",
          password: "correct-horse-battery-staple",
        }),
      },
      bindings,
    );

    expect(signUp.status).toBe(200);
    expect(emailSender.messages).toHaveLength(1);
    expect(emailSender.messages[0]?.type).toBe("email_verification");
    const cookie = signUp.headers.get("set-cookie");
    expect(cookie).toBeTruthy();

    const me = await app.request(
      "/api/v1/me",
      { headers: { cookie: cookie!.split(";")[0]! } },
      bindings,
    );
    const body = currentSessionResponseSchema.parse(await me.json());

    expect(me.status).toBe(200);
    expect(body.data).toMatchObject({
      role: "customer",
      customerId: body.data.userId,
      adminPermissions: [],
    });
    const assignment = await database
      .prepare("SELECT role, customer_id FROM identity_role_assignments WHERE user_id = ? LIMIT 1")
      .bind(body.data.userId)
      .first<{ role: string; customer_id: string | null }>();
    expect(assignment).toEqual({ role: "customer", customer_id: body.data.userId });

    await database
      .prepare(
        `UPDATE identity_role_assignments
         SET role = 'admin', customer_id = NULL, admin_permissions_json = '["catalog"]'
         WHERE user_id = ?`,
      )
      .bind(body.data.userId)
      .run();
    const adminMe = await app.request(
      "/api/v1/me",
      { headers: { cookie: cookie!.split(";")[0]! } },
      bindings,
    );
    const adminBody = currentSessionResponseSchema.parse(await adminMe.json());
    expect(adminBody.data).toMatchObject({
      role: "admin",
      customerId: null,
      adminPermissions: ["catalog"],
    });

    const signOut = await app.request(
      "/api/auth/sign-out",
      {
        method: "POST",
        headers: { cookie: cookie!.split(";")[0]! },
      },
      bindings,
    );
    expect(signOut.status).toBe(200);
    const revokedMe = await app.request(
      "/api/v1/me",
      { headers: { cookie: cookie!.split(";")[0]! } },
      bindings,
    );
    expect(revokedMe.status).toBe(401);
  });

  it("sets secure cookies for production auth", async () => {
    const emailSender = new InMemoryIdentityEmailSender();
    const bindings = {
      APP_ENV: "production",
      AUTH_MODE: "better-auth",
      BETTER_AUTH_SECRET: "production-secret-that-is-at-least-32-characters",
      BETTER_AUTH_URL: "https://api.example.test",
      CORS_ORIGINS: "https://app.example.test",
      PAYMENT_PROVIDER: "paymongo",
      PAYMONGO_SECRET_KEY: "sk_test_123",
      DB: database,
    } as const;
    const app = createConfiguredApi(bindings, {
      createIdentityEmailSender: () => emailSender,
    });
    const response = await app.request(
      "/api/auth/sign-up/email",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://app.example.test",
        },
        body: JSON.stringify({
          name: "Customer Secure",
          email: "secure@example.com",
          password: "correct-horse-battery-staple",
        }),
      },
      bindings,
    );

    expect(response.status).toBe(200);
    expect(emailSender.messages[0]?.type).toBe("email_verification");

    const rejected = await app.request(
      "/api/auth/sign-up/email",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://untrusted.example.test",
        },
        body: JSON.stringify({
          name: "Untrusted Customer",
          email: "untrusted@example.com",
          password: "correct-horse-battery-staple",
        }),
      },
      bindings,
    );
    expect(rejected.status).toBe(403);
  });

  it("bootstraps configured administrators with server-owned scope and MFA requirement", async () => {
    const emailSender = new InMemoryIdentityEmailSender();
    const bindings = {
      APP_ENV: "test",
      AUTH_MODE: "better-auth",
      BETTER_AUTH_SECRET: "bootstrap-secret-that-is-at-least-32-characters",
      BETTER_AUTH_URL: "https://api.example.test",
      ADMIN_BOOTSTRAP_EMAILS: "admin@example.com",
      DB: database,
    } as const;
    const app = createConfiguredApi(bindings, {
      createIdentityEmailSender: () => emailSender,
    });
    const response = await app.request(
      "/api/auth/sign-up/email",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Bootstrap Admin",
          email: "admin@example.com",
          password: "correct-horse-battery-staple",
        }),
      },
      bindings,
    );
    expect(response.status).toBe(200);
    const user = await database
      .prepare("SELECT id FROM better_auth_user WHERE email = ? LIMIT 1")
      .bind("admin@example.com")
      .first<{ id: string }>();
    const assignment = await database
      .prepare(
        "SELECT role, admin_permissions_json, mfa_required FROM identity_role_assignments WHERE user_id = ? LIMIT 1",
      )
      .bind(user?.id)
      .first<{ role: string; admin_permissions_json: string; mfa_required: number }>();
    expect(assignment).toEqual({
      role: "admin",
      admin_permissions_json: '["superadmin"]',
      mfa_required: 1,
    });
    const audit = await database
      .prepare("SELECT action FROM audit_events WHERE target_id = ? LIMIT 1")
      .bind(user?.id)
      .first<{ action: string }>();
    expect(audit?.action).toBe("identity.admin-bootstrapped");

    const cookie = response.headers.get("set-cookie")?.split(";")[0];
    const enrollment = await app.request(
      "/api/auth/two-factor/enable",
      {
        method: "POST",
        headers: { "content-type": "application/json", cookie: cookie! },
        body: JSON.stringify({
          password: "correct-horse-battery-staple",
          method: "totp",
          issuer: "Carbon Food Delivery",
        }),
      },
      bindings,
    );
    const enrollmentBody: unknown = await enrollment.json();
    expect(enrollment.status).toBe(200);
    expect(enrollmentBody).toMatchObject({ method: "totp" });
    if (!isRecord(enrollmentBody)) throw new Error("two-factor enrollment response is invalid");
    expect(enrollmentBody.totpURI).toMatch(/^otpauth:\/\/totp\//);
    expect(enrollmentBody.backupCodes).toBeInstanceOf(Array);
    if (!Array.isArray(enrollmentBody.backupCodes)) {
      throw new Error("two-factor recovery codes are missing");
    }
    expect(enrollmentBody.backupCodes.length).toBeGreaterThan(0);
  });

  it("reconciles an existing allowlisted account to superadmin scope", async () => {
    const emailSender = new InMemoryIdentityEmailSender();
    const bindings = {
      APP_ENV: "test",
      AUTH_MODE: "better-auth",
      BETTER_AUTH_SECRET: "reconcile-secret-that-is-at-least-32-characters",
      BETTER_AUTH_URL: "https://api.example.test",
      ADMIN_BOOTSTRAP_EMAILS: "reconcile-admin@example.com",
      DB: database,
    } as const;
    const app = createConfiguredApi(bindings, {
      createIdentityEmailSender: () => emailSender,
    });
    const signUp = await app.request(
      "/api/auth/sign-up/email",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Existing Admin",
          email: "reconcile-admin@example.com",
          password: "correct-horse-battery-staple",
        }),
      },
      bindings,
    );
    expect(signUp.status).toBe(200);
    await database
      .prepare(
        `UPDATE identity_role_assignments
         SET role = 'customer', customer_id = ?, admin_permissions_json = '[]', mfa_required = 0
         WHERE user_id = (SELECT id FROM better_auth_user WHERE email = ?)`,
      )
      .bind("existing-customer", "reconcile-admin@example.com")
      .run();
    const cookie = signUp.headers.get("set-cookie");
    const session = await app.request(
      "/api/v1/me",
      { headers: { cookie: cookie!.split(";")[0]! } },
      bindings,
    );
    expect(session.status).toBe(200);
    const sessionBody = currentSessionResponseSchema.parse(await session.json());
    expect(sessionBody.data).toMatchObject({
      role: "admin",
      adminPermissions: ["superadmin"],
      customerId: null,
    });
    const assignment = await database
      .prepare(
        "SELECT role, admin_permissions_json, mfa_required FROM identity_role_assignments WHERE user_id = (SELECT id FROM better_auth_user WHERE email = ?) LIMIT 1",
      )
      .bind("reconcile-admin@example.com")
      .first<{ role: string; admin_permissions_json: string; mfa_required: number }>();
    expect(assignment).toEqual({
      role: "admin",
      admin_permissions_json: '["superadmin"]',
      mfa_required: 1,
    });
    const protectedMutation = await app.request(
      "/api/v1/admin/launch-configuration",
      {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          cookie: cookie!.split(";")[0]!,
        },
        body: JSON.stringify({}),
      },
      bindings,
    );
    expect(protectedMutation.status).toBe(403);
    expect(apiErrorResponseSchema.parse(await protectedMutation.json()).error.code).toBe(
      "MFA_REQUIRED",
    );
    const audit = await database
      .prepare(
        "SELECT COUNT(*) AS count FROM audit_events WHERE target_id = (SELECT id FROM better_auth_user WHERE email = ?) AND action = ?",
      )
      .bind("reconcile-admin@example.com", "identity.admin-bootstrap-reconciled")
      .first<{ count: number }>();
    expect(audit?.count).toBe(1);
  });

  it("delivers verification and password reset actions through the identity email boundary", async () => {
    const emailSender = new InMemoryIdentityEmailSender();
    const bindings = {
      APP_ENV: "test",
      AUTH_MODE: "better-auth",
      BETTER_AUTH_SECRET: "delivery-secret-that-is-at-least-32-characters",
      BETTER_AUTH_URL: "https://api.example.test",
      CORS_ORIGINS: "https://app.example.test",
      DB: database,
    } as const;
    const app = createConfiguredApi(bindings, {
      createIdentityEmailSender: () => emailSender,
    });
    const signUp = await app.request(
      "/api/auth/sign-up/email",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Reset Customer",
          email: "reset@example.com",
          password: "correct-horse-battery-staple",
        }),
      },
      bindings,
    );
    expect(signUp.status).toBe(200);
    const verification = emailSender.messages.find(
      (message) =>
        message.type === "email_verification" && message.recipient === "reset@example.com",
    );
    expect(verification).toBeDefined();
    const verify = await app.request(verification!.actionUrl, undefined, bindings);
    expect([200, 302]).toContain(verify.status);
    const resetRequest = await app.request(
      "/api/auth/request-password-reset",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "reset@example.com" }),
      },
      bindings,
    );
    expect(resetRequest.status).toBe(200);
    expect(
      emailSender.messages.some(
        (message) => message.type === "password_reset" && message.recipient === "reset@example.com",
      ),
    ).toBe(true);
    const resetMessage = emailSender.messages.find(
      (message) => message.type === "password_reset" && message.recipient === "reset@example.com",
    );
    expect(resetMessage?.actionUrl).toContain(
      "callbackURL=https%3A%2F%2Fapp.example.test%2Freset-password",
    );
    const token = new URL(resetMessage!.actionUrl).pathname.split("/").at(-1);
    const resetCallback = await app.request(resetMessage!.actionUrl, undefined, bindings);
    expect(resetCallback.status).toBe(302);
    expect(resetCallback.headers.get("location")).toBe(
      `https://app.example.test/reset-password?token=${token}`,
    );
    const reset = await app.request(
      "/api/auth/reset-password",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, newPassword: "new-correct-horse-battery-staple" }),
      },
      bindings,
    );
    expect(reset.status).toBe(200);
    const signIn = await app.request(
      "/api/auth/sign-in/email",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "reset@example.com",
          password: "new-correct-horse-battery-staple",
        }),
      },
      bindings,
    );
    expect(signIn.status).toBe(200);
  });
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}
