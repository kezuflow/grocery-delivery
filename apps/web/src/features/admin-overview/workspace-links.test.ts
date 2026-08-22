import { describe, expect, it } from "vitest";
import { visibleAdminWorkspaceLinks } from "./workspace-links";

describe("admin workspace links", () => {
  it("shows only workspaces allowed by effective permissions", () => {
    expect(visibleAdminWorkspaceLinks(["packing", "reporting"]).map((item) => item.href)).toEqual([
      "/admin/packing",
      "/admin/reporting",
    ]);

    expect(visibleAdminWorkspaceLinks(["catalog", "dispatch"]).map((item) => item.href)).toEqual([
      "/admin/catalog",
      "/admin/orders",
      "/admin/dispatch",
    ]);
  });
});
