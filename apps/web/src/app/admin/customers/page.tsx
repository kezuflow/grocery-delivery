import type { Metadata } from "next";
import { AppShell } from "../../../components/layout";
import { AdminCustomers } from "../../../features/admin-customers";
import { loadAdminCustomers } from "../../../lib/admin-product";
import { requirePermission } from "../../../lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Customers" };

export default async function AdminCustomersPage() {
  const session = await requirePermission("support");
  const data = await loadAdminCustomers();
  return (
    <AppShell
      breadcrumbs={[
        { href: "/", label: "Storefront" },
        { href: "/admin", label: "Operations" },
        { label: "Customers" },
      ]}
      description="Find customer identities quickly when resolving support and account questions."
      eyebrow="Operations"
      session={session}
      title="Customers"
    >
      <AdminCustomers {...data} />
    </AppShell>
  );
}
