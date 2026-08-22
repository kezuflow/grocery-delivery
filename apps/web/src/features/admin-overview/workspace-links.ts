import type { AdminPermission } from "../../lib/permissions";

export type AdminWorkspaceLink = Readonly<{
  href: string;
  label: string;
  description: string;
  permission: AdminPermission;
}>;

export const adminWorkspaceLinks: readonly AdminWorkspaceLink[] = [
  {
    href: "/admin/catalog",
    label: "Catalog",
    description: "Active categories, items, and server-confirmed prices",
    permission: "catalog",
  },
  {
    href: "/admin/orders",
    label: "Orders",
    description: "Packing, dispatch, and customer request queues",
    permission: "dispatch",
  },
  {
    href: "/admin/staff",
    label: "Staff",
    description: "Audited role and permission assignments",
    permission: "superadmin",
  },
  {
    href: "/admin/procurement",
    label: "Procurement",
    description: "Demand, purchases, shortages, and substitutions",
    permission: "procurement",
  },
  {
    href: "/admin/packing",
    label: "Packing",
    description: "Order manifests and packing exceptions",
    permission: "packing",
  },
  {
    href: "/admin/dispatch",
    label: "Dispatch",
    description: "Delivery windows and driver assignments",
    permission: "dispatch",
  },
  {
    href: "/admin/support",
    label: "Support",
    description: "Cases, cancellations, and refund requests",
    permission: "support",
  },
  {
    href: "/admin/promotions",
    label: "Promotions",
    description: "Campaign status and redemption activity",
    permission: "marketing",
  },
  {
    href: "/admin/reporting",
    label: "Reporting",
    description: "Operational alerts and audit activity",
    permission: "reporting",
  },
  {
    href: "/admin/configuration",
    label: "Configuration",
    description: "Approved launch manifests",
    permission: "superadmin",
  },
];

export function visibleAdminWorkspaceLinks(permissions: readonly AdminPermission[]) {
  return adminWorkspaceLinks.filter((link) => permissions.includes(link.permission));
}
