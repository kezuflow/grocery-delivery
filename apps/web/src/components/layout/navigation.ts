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
];

const deliveryNavigation: readonly NavigationItem[] = [
  { href: "/deliveryman", label: "Assignments" },
];

const adminNavigation: readonly NavigationItem[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin#packing", label: "Packing", permission: "packing" },
  { href: "/admin#actions", label: "Actions", permission: "procurement" },
  { href: "/admin#support", label: "Support", permission: "support" },
  { href: "/admin#audit", label: "Reporting", permission: "reporting" },
  { href: "/admin#launch-configuration", label: "Configuration", permission: "superadmin" },
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
