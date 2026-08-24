import type { Metadata } from "next";

import { AppShell } from "../../../components/layout";
import { AdminCatalog } from "../../../features/admin-catalog";
import { loadAdminCatalog } from "../../../lib/admin-product";
import { requireAnyPermission } from "../../../lib/auth";
import { getEffectiveAdminPermissions } from "../../../lib/permissions";
import { adminWorkspacePermissions } from "../../../lib/permissions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Catalog administration" };

export default async function AdminCatalogPage() {
  const session = await requireAnyPermission(adminWorkspacePermissions.catalog);
  const data = await loadAdminCatalog();
  return (
    <AppShell
      breadcrumbs={[
        { href: "/", label: "Storefront" },
        { href: "/admin", label: "Operations" },
        { label: "Catalog" },
      ]}
      description="Create products, organize categories, set pricing, and manage availability."
      eyebrow="Product operations"
      session={session}
      title="Catalog"
    >
      <AdminCatalog
        catalog={data.catalog}
        error={data.error}
        state={data.state}
        permissions={getEffectiveAdminPermissions(session)}
      />
    </AppShell>
  );
}
