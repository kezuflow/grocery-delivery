import { describe, expect, it } from "vitest";

import {
  accountDeletionRequestResponseSchema,
  adminRoleAssignmentRequestSchema,
  currentSessionResponseSchema,
  adminCustomersResponseSchema,
} from "./identity.js";

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
          mfaRequired: false,
          mfaVerified: true,
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

  it("describes a server-owned deletion request result", () => {
    expect(
      accountDeletionRequestResponseSchema.parse({
        data: { requested: false, eligible: false, reasons: ["ACTIVE_SUBSCRIPTION"] },
        meta: { correlationId: "correlation-1" },
      }).data.reasons,
    ).toEqual(["ACTIVE_SUBSCRIPTION"]);
  });

  it("accepts a customer directory response without session fields", () => {
    expect(
      adminCustomersResponseSchema.parse({
        data: {
          customers: [
            {
              id: "customer-1",
              email: "customer@example.com",
              name: "Customer One",
              emailVerified: true,
              createdAt: "2026-08-19T00:00:00.000Z",
              updatedAt: "2026-08-19T00:00:00.000Z",
            },
          ],
        },
        meta: { correlationId: "customers-1" },
      }).data.customers,
    ).toHaveLength(1);
  });
});
