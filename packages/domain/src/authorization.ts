export const ROLES = ["customer", "deliveryman", "admin"] as const;

export type Role = (typeof ROLES)[number];

export const ADMIN_PERMISSIONS = [
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
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export function isRole(value: string): value is Role {
  return ROLES.some((role) => role === value);
}

export function isAdminPermission(value: string): value is AdminPermission {
  return ADMIN_PERMISSIONS.some((permission) => permission === value);
}

export function hasAdminPermission(
  role: Role,
  grantedPermissions: readonly AdminPermission[],
  requiredPermission: AdminPermission,
): boolean {
  if (role !== "admin") {
    return false;
  }

  return (
    grantedPermissions.includes("superadmin") || grantedPermissions.includes(requiredPermission)
  );
}
