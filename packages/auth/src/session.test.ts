import { describe, expect, it } from "vitest";

import {
  createBetterAuthSessionResolver,
  createAuthCookieOptions,
  createPersistentSessionResolver,
  hashSessionToken,
  isAuthorizedForAdminPermission,
  resolveActiveSession,
} from "./session.js";
import { createSession } from "@carbon/domain";

describe("auth boundaries", () => {
  const session = createSession({
    id: "session-1",
    userId: "user-1",
    role: "admin",
    adminPermissions: ["catalog"],
    customerId: null,
    expiresAt: "2026-08-19T00:00:00.000Z",
    revokedAt: null,
  });

  it("uses secure HTTP-only cookies outside local environments", () => {
    expect(createAuthCookieOptions("development").secure).toBe(false);
    expect(createAuthCookieOptions("production")).toMatchObject({
      secure: true,
      httpOnly: true,
      sameSite: "lax",
    });
  });

  it("resolves only active sessions and scopes admin permissions", async () => {
    const resolver = { resolve: () => Promise.resolve(session) };

    await expect(
      resolveActiveSession(
        resolver,
        new Request("https://example.com"),
        "2026-08-18T00:00:00.000Z",
      ),
    ).resolves.toBe(session);
    expect(isAuthorizedForAdminPermission(session, "catalog")).toBe(true);
    expect(isAuthorizedForAdminPermission(session, "finance")).toBe(false);
  });

  it("resolves hashed Better Auth cookie and bearer tokens from persistent storage", async () => {
    const expectedHash = await hashSessionToken("secret-token");
    const resolver = createPersistentSessionResolver({
      findByTokenHash: (tokenHash) => Promise.resolve(tokenHash === expectedHash ? session : null),
    });

    await expect(
      resolver.resolve(
        new Request("https://example.com", {
          headers: { cookie: "better-auth.session_token=secret-token" },
        }),
      ),
    ).resolves.toBe(session);
    await expect(
      resolver.resolve(
        new Request("https://example.com", {
          headers: { authorization: "Bearer secret-token" },
        }),
      ),
    ).resolves.toBe(session);
  });

  it("maps Better Auth sessions into the domain session contract", async () => {
    const resolver = createBetterAuthSessionResolver({
      getSession: () =>
        Promise.resolve({
          session: { id: "session-customer", expiresAt: new Date("2026-08-20T00:00:00.000Z") },
          user: { id: "customer-1", role: "customer", customerId: "customer-1" },
        }),
    });

    await expect(resolver.resolve(new Request("https://example.com"))).resolves.toMatchObject({
      id: "session-customer",
      customerId: "customer-1",
      role: "customer",
    });
  });
});
