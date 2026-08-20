import { describe, expect, it } from "vitest";

import { adminRoleAssignmentRequestSchema, currentSessionResponseSchema } from "./identity.js";

describe("identity contracts", () => {
  it("accepts a current session response", () => {
    expect(
      currentSessionResponseSchema.parse({
        data: {
          sessionId: "session-1",
          userId: "user-1",
          role: "customer",
          adminPermissions: [],
          customerId: "customer-1",
          expiresAt: "2026-08-19T00:00:00.000Z",
        },
        meta: { correlationId: "identity-request" },
      }),
    ).toBeDefined();
  });

  it("keeps administrator permissions scoped to administrator roles", () => {
    expect(
      adminRoleAssignmentRequestSchema.safeParse({
        userId: "user-1",
        role: "customer",
        adminPermissions: ["superadmin"],
      }).success,
    ).toBe(false);
    expect(
      adminRoleAssignmentRequestSchema.safeParse({
        userId: "user-1",
        role: "admin",
        adminPermissions: ["staff"],
      }).success,
    ).toBe(true);
  });
});
