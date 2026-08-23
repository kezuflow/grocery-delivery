import type { AdminPermission, SessionSummary, UserRole } from "../../lib/permissions";
import { can } from "../../lib/permissions";

export type NavigationItem = Readonly<{
  href: string;
  label: string;
  permission?: AdminPermission;
  group?: "Workspace" | "Operations" | "Manage";
}>;

const customerNavigation: readonly NavigationItem[] = [
  { href: "/account", label: "Account overview" },
  { href: "/shop", label: "Marketplace" },
  { href: "/account/cart", label: "Your cart" },
  { href: "/account/checkout", label: "Checkout" },
  { href: "/account/orders", label: "Order history" },
  { href: "/account/saved", label: "Saved items" },
  { href: "/account/support", label: "Support" },
];

const deliveryNavigation: readonly NavigationItem[] = [
  { href: "/deliveryman", label: "Dashboard" },
  { href: "/deliveryman/assignments", label: "Assignments" },
  { href: "/deliveryman/route", label: "Route" },
  { href: "/deliveryman/sync", label: "Sync" },
  { href: "/deliveryman/history", label: "History" },
];

const adminNavigation: readonly NavigationItem[] = [
  { href: "/admin", label: "Overview", group: "Workspace" },
  { href: "/admin/catalog", label: "Catalog", permission: "catalog", group: "Workspace" },
  { href: "/admin/orders", label: "Orders", permission: "dispatch", group: "Operations" },
  {
    href: "/admin/procurement",
    label: "Procurement",
    permission: "procurement",
    group: "Operations",
  },
  { href: "/admin/packing", label: "Packing", permission: "packing", group: "Operations" },
  { href: "/admin/dispatch", label: "Dispatch", permission: "dispatch", group: "Operations" },
  { href: "/admin/support", label: "Support", permission: "support", group: "Operations" },
  { href: "/admin/promotions", label: "Promotions", permission: "marketing", group: "Manage" },
  { href: "/admin/reporting", label: "Reporting", permission: "reporting", group: "Manage" },
  { href: "/admin/staff", label: "Staff", permission: "superadmin", group: "Manage" },
  {
    href: "/admin/configuration",
    label: "Configuration",
    permission: "superadmin",
    group: "Manage",
  },
];

export function getNavigation(session: SessionSummary): readonly NavigationItem[] {
  if (session.role === "customer") return customerNavigation;
  if (session.role === "deliveryman") return deliveryNavigation;
  return adminNavigation.filter((item) => !item.permission || can(session, item.permission));
}

export function getRoleLabel(role: UserRole): string {
  if (role === "deliveryman") return "Delivery staff";
  if (role === "admin") return "Operations";
  return "Customer";
}
