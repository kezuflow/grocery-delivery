import type { Metadata } from "next";

import { AppShell } from "../../../components/layout";
import {
  CustomerCatalog,
  parseCatalogFilters,
  type CatalogSearchParams,
} from "../../../features/catalog";
import { requireCustomerSession } from "../../../lib/auth";
import { loadCustomerCatalog } from "../../../lib/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Shop catalog" };

export default async function CatalogPage({
  searchParams,
}: Readonly<{ searchParams: Promise<CatalogSearchParams> }>) {
  const session = await requireCustomerSession();
  const [catalogData, query] = await Promise.all([loadCustomerCatalog(), searchParams]);
  const filters = parseCatalogFilters(query);

  return (
    <AppShell
      breadcrumbs={[
        { href: "/", label: "Storefront" },
        { href: "/account", label: "Account" },
        { label: "Catalog" },
      ]}
      description="Choose active items for your saved weekly cart. Prices and availability are confirmed by the server."
      eyebrow="Your weekly shop"
      session={session}
      title="Shop catalog"
    >
      <CustomerCatalog
        cart={catalogData.cart}
        catalog={catalogData.catalog}
        error={catalogData.error}
        filters={filters}
      />
    </AppShell>
  );
}
