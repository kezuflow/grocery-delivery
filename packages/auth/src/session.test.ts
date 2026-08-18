import { describe, expect, it } from "vitest";

import {
  createAuthCookieOptions,
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
});
