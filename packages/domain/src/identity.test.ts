import { describe, expect, it } from "vitest";

import {
  createAuditEvent,
  createRoleAssignment,
  createSession,
  isSessionActive,
} from "./identity.js";
import { DomainValidationError } from "./errors.js";

describe("identity records", () => {
  const session = createSession({
    id: "session-1",
    userId: "user-1",
    role: "customer",
    adminPermissions: [],
    customerId: "customer-1",
    expiresAt: "2026-08-19T00:00:00.000Z",
    revokedAt: null,
  });

  it("requires customer scope for customer sessions and checks expiry/revocation", () => {
    expect(isSessionActive(session, "2026-08-18T12:00:00.000Z")).toBe(true);
    expect(
      isSessionActive(
        { ...session, revokedAt: "2026-08-18T13:00:00.000Z" },
        "2026-08-18T14:00:00.000Z",
      ),
    ).toBe(false);
    expect(() => createSession({ ...session, customerId: null })).toThrow(DomainValidationError);
  });

  it("freezes audit metadata", () => {
    const event = createAuditEvent({
      id: "audit-1",
      actorUserId: "user-1",
      action: "session.revoked",
      targetType: "session",
      targetId: "session-1",
      occurredAt: "2026-08-18T00:00:00.000Z",
      metadata: { reason: "support_request" },
    });

    expect(Object.isFrozen(event)).toBe(true);
    expect(Object.isFrozen(event.metadata)).toBe(true);
  });

  it("allows customer role assignment without session ownership scope", () => {
    expect(
      createRoleAssignment({
        userId: "user-2",
        role: "customer",
        adminPermissions: [],
        assignedAt: "2026-08-18T00:00:00.000Z",
      }).role,
    ).toBe("customer");
  });
});
