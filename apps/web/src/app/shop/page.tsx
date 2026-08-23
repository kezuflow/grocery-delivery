import type { Metadata } from "next";

import { MarketplaceShell } from "../../components/layout";
import {
  CustomerCatalog,
  parseCatalogQuery,
  type CatalogSearchParams,
} from "../../features/catalog";
import { loadMarketplace } from "../../lib/marketplace";
import { loadCurrentSession } from "../../lib/session";
import { PlanSelector } from "../account/plan-selector";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Marketplace" };

export default async function ShopPage({
  searchParams,
}: Readonly<{ searchParams: Promise<CatalogSearchParams> }>) {
  const query = await searchParams;
  const filters = parseCatalogQuery(query);
  const [auth, marketplace] = await Promise.all([loadCurrentSession(), loadMarketplace(filters)]);

  return (
    <MarketplaceShell search={filters.search} session={auth.session}>
      <h1 className="sr-only">Shop fresh groceries</h1>
      {!marketplace.subscription ? (
        <section className="mb-5 flex items-center gap-4 border-b border-market-line bg-[#f7fbf7] px-4 py-3 sm:px-5 lg:mb-6">
          <span className="shrink-0 rounded-full bg-market-green-dark px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white">
            1 month free
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="!m-0 truncate !text-sm font-bold leading-5 text-market-ink">
              Your first weekly box is on us
            </h2>
            <p className="hidden text-xs text-market-muted sm:block">
              Choose a plan when you add your first item.
            </p>
          </div>
          {auth.session?.role === "customer" ? (
            <div className="shrink-0">
              <PlanSelector mode="create" plans={marketplace.plans} trialEligible />
            </div>
          ) : (
            <span className="hidden shrink-0 text-xs font-semibold text-market-green-dark sm:block">
              Add an item to get started
            </span>
          )}
        </section>
      ) : marketplace.subscription.trialEndsAt ? (
        <p
          className="mb-6 rounded-xl bg-market-soft px-4 py-3 text-sm font-semibold text-market-green-dark"
          role="status"
        >
          Free trial active until{" "}
          {new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeZone: "UTC" }).format(
            new Date(marketplace.subscription.trialEndsAt),
          )}
          .
        </p>
      ) : null}
      <CustomerCatalog
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
