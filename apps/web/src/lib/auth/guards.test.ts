import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionSummary } from "../permissions";
import { loadCurrentSession } from "../session";
import { requireCustomerSession, requirePermission, requireRole, requireSession } from "./guards";

vi.mock("next/navigation", () => ({
  redirect: (destination: string) => {
    throw new Error(`REDIRECT:${destination}`);
  },
}));

vi.mock("../session", () => ({
  loadCurrentSession: vi.fn(),
}));

const mockedLoadCurrentSession = vi.mocked(loadCurrentSession);

function session(overrides: Partial<SessionSummary> = {}): SessionSummary {
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

describe("protected route guards", () => {
  beforeEach(() => {
    mockedLoadCurrentSession.mockReset();
  });

  it("redirects when the session is missing", async () => {
    mockedLoadCurrentSession.mockResolvedValue({ session: null, error: null });
    await expect(requireSession()).rejects.toThrow("REDIRECT:/unauthorized");
  });

  it("redirects when the session transport is unavailable", async () => {
    mockedLoadCurrentSession.mockResolvedValue({ session: null, error: "Session unavailable" });
    await expect(requireSession()).rejects.toThrow("REDIRECT:/session-unavailable");
  });

  it("blocks a session with the wrong role", async () => {
    mockedLoadCurrentSession.mockResolvedValue({ session: session(), error: null });
    await expect(requireRole("admin")).rejects.toThrow("REDIRECT:/forbidden");
  });

  it("blocks an administrator without the requested permission", async () => {
    mockedLoadCurrentSession.mockResolvedValue({
      session: session({ role: "admin", customerId: null, adminPermissions: ["packing"] }),
      error: null,
    });
    await expect(requirePermission("reporting")).rejects.toThrow("REDIRECT:/forbidden");
  });

  it("requires a customer identity for customer routes", async () => {
    mockedLoadCurrentSession.mockResolvedValue({
      session: session({ customerId: null }),
      error: null,
    });
    await expect(requireCustomerSession()).rejects.toThrow("REDIRECT:/forbidden");
  });
});
