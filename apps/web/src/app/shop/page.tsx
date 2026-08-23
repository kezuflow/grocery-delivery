import type { Metadata } from "next";

import { MarketplaceShell } from "../../components/layout";
import {
  CustomerCatalog,
  parseCatalogQuery,
  type CatalogSearchParams,
} from "../../features/catalog";
import { loadMarketplace } from "../../lib/marketplace";
import { loadCurrentSession } from "../../lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Marketplace" };

export default async function ShopPage({
  searchParams,
}: Readonly<{ searchParams: Promise<CatalogSearchParams> }>) {
  const query = await searchParams;
  const filters = parseCatalogQuery(query);
  const [auth, marketplace] = await Promise.all([loadCurrentSession(), loadMarketplace(filters)]);

  return (
    <MarketplaceShell
      categories={marketplace.catalog.categories}
      cart={marketplace.cart}
      deliveryAddress={marketplace.deliveryAddress}
      search={filters.search}
      session={auth.session}
    >
      <h1 className="sr-only">Shop fresh groceries</h1>
      <CustomerCatalog
        banners={marketplace.banners}
        cart={marketplace.cart}
        catalog={marketplace.catalog}
        error={marketplace.error}
        filters={filters}
        plans={marketplace.plans}
        nextCursor={marketplace.catalog.nextCursor}
        session={auth.session}
        subscription={marketplace.subscription}
      />
    </MarketplaceShell>
  );
}
