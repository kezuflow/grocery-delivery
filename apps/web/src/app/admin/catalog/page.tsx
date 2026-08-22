import type { Metadata } from "next";

import { AppShell } from "../../../components/layout";
import { AdminCatalog } from "../../../features/admin-catalog";
import { loadAdminCatalog } from "../../../lib/admin-product";
import { requireAnyPermission } from "../../../lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Catalog administration" };

export default async function AdminCatalogPage() {
  const session = await requireAnyPermission(["catalog", "pricing", "superadmin"]);
  const data = await loadAdminCatalog();
  return (
    <AppShell
      breadcrumbs={[
        { href: "/", label: "Storefront" },
        { href: "/admin", label: "Operations" },
        { label: "Catalog" },
      ]}
      description="Review the active market and use the approved configuration workflow for server-owned catalog changes."
      eyebrow="Product operations"
      session={session}
      title="Catalog"
    >
      <AdminCatalog catalog={data.catalog} error={data.error} />
    </AppShell>
  );
}
