import { describe, expect, it } from "vitest";

import {
  can,
  getEffectiveAdminPermissions,
  getRoleHome,
  hasRole,
  type SessionSummary,
} from "./access";

function createSession(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    sessionId: "session-1",
    userId: "user-1",
    role: "customer",
    adminPermissions: [],
    customerId: "customer-1",
    expiresAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("frontend access predicates", () => {
  it("matches the server-provided role exactly", () => {
    expect(hasRole(createSession(), "customer")).toBe(true);
    expect(hasRole(createSession(), "admin")).toBe(false);
  });

  it("requires an explicit administrator permission", () => {
    const admin = createSession({
      role: "admin",
      customerId: null,
      adminPermissions: ["procurement"],
    });

    expect(can(admin, "procurement")).toBe(true);
    expect(can(admin, "finance")).toBe(false);
    expect(can(createSession(), "procurement")).toBe(false);
  });

  it("lets superadmins inherit administrator capabilities", () => {
    const superadmin = createSession({
      role: "admin",
      customerId: null,
      adminPermissions: ["superadmin"],
    });

    expect(can(superadmin, "catalog")).toBe(true);
    expect(can(superadmin, "finance")).toBe(true);
    expect(can(superadmin, "staff")).toBe(true);
  });

  it("returns the permissions used by server-backed admin reads", () => {
    expect(
      getEffectiveAdminPermissions(
        createSession({ role: "admin", customerId: null, adminPermissions: ["superadmin"] }),
      ),
    ).toContain("reporting");
    expect(
      getEffectiveAdminPermissions(
        createSession({ role: "admin", customerId: null, adminPermissions: ["packing"] }),
      ),
    ).toEqual(["packing"]);
  });

  it("maps every role to its protected home", () => {
    expect(getRoleHome("customer")).toBe("/shop");
    expect(getRoleHome("admin")).toBe("/admin");
    expect(getRoleHome("deliveryman")).toBe("/deliveryman");
  });
});
