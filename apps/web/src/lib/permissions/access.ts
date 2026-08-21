import type { CurrentSessionResponse } from "@carbon/contracts";

export type SessionSummary = CurrentSessionResponse["data"];
export type UserRole = SessionSummary["role"];
export type AdminPermission = SessionSummary["adminPermissions"][number];

export const adminPermissions: readonly AdminPermission[] = [
  "catalog",
  "pricing",
  "marketing",
  "finance",
  "procurement",
  "packing",
  "dispatch",
  "support",
  "reporting",
  "staff",
  "superadmin",
];

export function hasRole(session: SessionSummary, role: UserRole): boolean {
  return session.role === role;
}

export function can(session: SessionSummary, permission: AdminPermission): boolean {
  if (session.role !== "admin") return false;
  return (
    session.adminPermissions.includes("superadmin") || session.adminPermissions.includes(permission)
  );
}

export function getRoleHome(role: UserRole): string {
  if (role === "admin") return "/admin";
  if (role === "deliveryman") return "/deliveryman";
  return "/account";
}

export function getEffectiveAdminPermissions(session: SessionSummary): readonly AdminPermission[] {
  if (session.role !== "admin") return [];
  if (session.adminPermissions.includes("superadmin")) return adminPermissions;
  return session.adminPermissions;
}
