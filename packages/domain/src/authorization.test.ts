import { describe, expect, it } from "vitest";

import { hasAdminPermission, isAdminPermission, isRole } from "./authorization.js";

describe("authorization vocabulary", () => {
  it("recognizes supported roles and permissions", () => {
    expect(isRole("deliveryman")).toBe(true);
    expect(isRole("operator")).toBe(false);
    expect(isAdminPermission("procurement")).toBe(true);
    expect(isAdminPermission("orders")).toBe(false);
  });

  it("requires the admin role and an explicit permission", () => {
    expect(hasAdminPermission("admin", ["catalog"], "catalog")).toBe(true);
    expect(hasAdminPermission("admin", ["catalog"], "finance")).toBe(false);
    expect(hasAdminPermission("customer", ["catalog"], "catalog")).toBe(false);
  });

  it("allows superadmin to satisfy every admin permission", () => {
    expect(hasAdminPermission("admin", ["superadmin"], "staff")).toBe(true);
  });
});
