import { readFile } from "node:fs/promises";
import { fileURLToPath, URL as NodeURL } from "node:url";

import { currentSessionResponseSchema } from "@carbon/contracts";
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
    database = await miniflare.getD1Database("DB");
    for (const migration of ["0007_identity.sql", "0014_better_auth.sql"]) {
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
    const bindings = {
      APP_ENV: "test",
      AUTH_MODE: "better-auth",
      BETTER_AUTH_SECRET: "integration-secret-that-is-at-least-32-characters",
      BETTER_AUTH_URL: "https://api.example.test",
      DB: database,
    } as const;
    const app = createConfiguredApi(bindings);
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
    const cookie = signUp.headers.get("set-cookie");
    expect(cookie).toContain("better-auth.session_token=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");

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
    const bindings = {
      APP_ENV: "production",
      AUTH_MODE: "better-auth",
      BETTER_AUTH_SECRET: "production-secret-that-is-at-least-32-characters",
      BETTER_AUTH_URL: "https://api.example.test",
      CORS_ORIGINS: "https://app.example.test",
      DB: database,
    } as const;
    const app = createConfiguredApi(bindings);
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
    expect(response.headers.get("set-cookie")).toContain("Secure");

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
});
