import type { Metadata } from "next";

import { AppShell } from "../../../components/layout";
import { AdminOrders } from "../../../features/admin-orders";
import { loadAdminOrders } from "../../../lib/admin-product";
import { requireAnyPermission } from "../../../lib/auth";
import { getEffectiveAdminPermissions } from "../../../lib/permissions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order operations" };

export default async function AdminOrdersPage() {
  const session = await requireAnyPermission([
    "procurement",
    "packing",
    "dispatch",
    "support",
    "finance",
    "reporting",
  ]);
  const data = await loadAdminOrders(getEffectiveAdminPermissions(session));
  return (
    <AppShell
      breadcrumbs={[
        { href: "/", label: "Storefront" },
        { href: "/admin", label: "Operations" },
        { label: "Orders" },
      ]}
      description="Inspect the active order lifecycle through server-owned packing, dispatch, and customer-request feeds."
      eyebrow="Order operations"
      session={session}
      title="Orders"
    >
      <AdminOrders data={data} />
    </AppShell>
  );
}
