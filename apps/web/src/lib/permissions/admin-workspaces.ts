import type { AdminPermission } from "./access";

export const adminWorkspacePermissions = {
  catalog: ["catalog", "pricing", "superadmin"],
  orders: ["procurement", "packing", "dispatch", "support", "finance", "reporting"],
  procurement: ["procurement"],
  packing: ["packing"],
  dispatch: ["dispatch"],
  support: ["support"],
  customers: ["support"],
  promotions: ["marketing"],
  reporting: ["reporting"],
  staff: ["superadmin"],
  configuration: ["superadmin"],
} as const satisfies Record<string, readonly AdminPermission[]>;

export type AdminWorkspaceKey = keyof typeof adminWorkspacePermissions;

export function canAccessAdminWorkspace(
  permissions: readonly AdminPermission[],
  workspace: AdminWorkspaceKey,
): boolean {
  return adminWorkspacePermissions[workspace].some((permission) =>
    permissions.includes(permission),
  );
}
