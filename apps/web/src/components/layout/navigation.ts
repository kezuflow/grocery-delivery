import type { AdminPermission, SessionSummary, UserRole } from "../../lib/permissions";
import { can } from "../../lib/permissions";

export type NavigationItem = Readonly<{
  href: string;
  label: string;
  permission?: AdminPermission;
}>;

const customerNavigation: readonly NavigationItem[] = [
  { href: "/account", label: "Account overview" },
  { href: "/account/catalog", label: "Shop catalog" },
  { href: "/account/cart", label: "Your cart" },
  { href: "/account/checkout", label: "Checkout" },
  { href: "/account/orders", label: "Order history" },
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
  { href: "/admin", label: "Overview" },
  { href: "/admin/procurement", label: "Procurement", permission: "procurement" },
  { href: "/admin/packing", label: "Packing", permission: "packing" },
  { href: "/admin/dispatch", label: "Dispatch", permission: "dispatch" },
  { href: "/admin/support", label: "Support", permission: "support" },
  { href: "/admin/promotions", label: "Promotions", permission: "marketing" },
  { href: "/admin/reporting", label: "Reporting", permission: "reporting" },
  { href: "/admin/configuration", label: "Configuration", permission: "superadmin" },
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
