import { describe, expect, it } from "vitest";

import type { SessionSummary } from "../../lib/permissions";
import { getNavigation } from "./navigation";

function adminSession(permissions: SessionSummary["adminPermissions"]): SessionSummary {
  return {
    sessionId: "session-1",
    userId: "admin-1",
    role: "admin",
    adminPermissions: permissions,
    customerId: null,
    expiresAt: "2026-09-01T00:00:00.000Z",
  };
}

describe("role navigation", () => {
  it("shows only permitted admin destinations", () => {
    expect(getNavigation(adminSession(["packing"])).map((item) => item.label)).toEqual([
      "Overview",
      "Packing",
    ]);
  });

  it("shows inherited destinations to superadmins", () => {
    expect(getNavigation(adminSession(["superadmin"])).map((item) => item.label)).toEqual([
      "Overview",
      "Procurement",
      "Packing",
      "Dispatch",
      "Support",
      "Promotions",
      "Reporting",
      "Configuration",
    ]);
  });

  it("keeps customer and delivery navigation role-specific", () => {
    const customer = { ...adminSession([]), role: "customer" as const, customerId: "customer-1" };
    const deliveryman = { ...adminSession([]), role: "deliveryman" as const };

    expect(getNavigation(customer).map((item) => item.href)).toEqual([
      "/account",
      "/account/catalog",
      "/account/cart",
      "/account/checkout",
      "/account/orders",
      "/account/support",
    ]);
    expect(getNavigation(deliveryman).map((item) => item.href)).toEqual([
      "/deliveryman",
      "/deliveryman/assignments",
      "/deliveryman/route",
      "/deliveryman/sync",
      "/deliveryman/history",
    ]);
  });
});
