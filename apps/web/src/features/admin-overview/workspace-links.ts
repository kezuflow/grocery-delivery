import type { AdminPermission } from "../../lib/permissions";
import { adminWorkspacePermissions } from "../../lib/permissions";

export type AdminWorkspaceLink = Readonly<{
  href: string;
  label: string;
  description: string;
  permissions: readonly AdminPermission[];
}>;

export const adminWorkspaceLinks: readonly AdminWorkspaceLink[] = [
  {
    href: "/admin/catalog",
    label: "Catalog",
    description: "Active categories, items, and server-confirmed prices",
    permissions: adminWorkspacePermissions.catalog,
  },
  {
    href: "/admin/orders",
    label: "Orders",
    description: "Packing, dispatch, and customer request queues",
    permissions: adminWorkspacePermissions.orders,
  },
  {
    href: "/admin/staff",
    label: "Staff",
    description: "Audited role and permission assignments",
    permissions: ["superadmin"],
  },
  {
    href: "/admin/procurement",
    label: "Procurement",
    description: "Demand, purchases, shortages, and substitutions",
    permissions: ["procurement"],
  },
  {
    href: "/admin/packing",
    label: "Packing",
    description: "Order manifests and packing exceptions",
    permissions: ["packing"],
  },
  {
    href: "/admin/dispatch",
    label: "Dispatch",
    description: "Delivery windows and driver assignments",
    permissions: ["dispatch"],
  },
  {
    href: "/admin/support",
    label: "Support",
    description: "Cases, cancellations, and refund requests",
    permissions: ["support"],
  },
  {
    href: "/admin/promotions",
    label: "Promotions",
    description: "Campaign status and redemption activity",
    permissions: ["marketing"],
  },
  {
    href: "/admin/reporting",
    label: "Reporting",
    description: "Operational alerts and audit activity",
    permissions: ["reporting"],
  },
  {
    href: "/admin/configuration",
    label: "Configuration",
    description: "Approved launch manifests",
    permissions: ["superadmin"],
  },
];

export function visibleAdminWorkspaceLinks(permissions: readonly AdminPermission[]) {
  return adminWorkspaceLinks.filter((link) =>
    link.permissions.some((permission) => permissions.includes(permission)),
  );
}
