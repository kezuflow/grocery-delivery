import { redirect } from "next/navigation";

import { loadCurrentSession } from "../session";
import {
  can,
  hasRole,
  type AdminPermission,
  type SessionSummary,
  type UserRole,
} from "../permissions";

export async function requireSession(): Promise<SessionSummary> {
  const state = await loadCurrentSession();
  if (state.error) redirect("/session-unavailable");
  if (!state.session) redirect("/unauthorized");
  return state.session;
}

export async function requireRole(role: UserRole): Promise<SessionSummary> {
  const session = await requireSession();
  if (!hasRole(session, role)) redirect("/forbidden");
  if (role === "admin" && session.mfaRequired && !session.mfaVerified) {
    redirect("/admin/security");
  }
  return session;
}

export async function requirePermission(permission: AdminPermission): Promise<SessionSummary> {
  const session = await requireRole("admin");
  if (!can(session, permission)) redirect("/forbidden");
  return session;
}

export async function requireAnyPermission(
  permissions: readonly AdminPermission[],
): Promise<SessionSummary> {
  const session = await requireRole("admin");
  if (!permissions.some((permission) => can(session, permission))) redirect("/forbidden");
  return session;
}

export async function requireCustomerSession(): Promise<SessionSummary> {
  const session = await requireRole("customer");
  if (!session.customerId) redirect("/forbidden");
  return session;
}
