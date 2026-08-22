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
      <nav
        aria-label="Breadcrumb"
        className="mb-20 hidden text-center text-sm text-market-muted lg:block"
      >
        <a href="/">Home</a>
        <span className="mx-2">–</span>
        <span>Shop</span>
      </nav>
      <h1 className="sr-only">Shop fresh groceries</h1>
      {!marketplace.subscription ? (
        <section className="mb-7 overflow-hidden rounded-xl bg-market-banner px-5 py-5 sm:px-7 sm:py-6 lg:mb-10 lg:flex lg:items-center lg:justify-between lg:gap-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-market-green-dark">
              New customer offer
            </p>
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-market-green-dark">
              One month free
            </span>
          </div>
          <h2 className="mt-3 text-xl font-bold text-[#14532d]">
            Activate your free grocery plan trial
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#166534]">
            Choose an active plan. Your first calendar month is free, and the server records the
            trial dates before any future billing.
          </p>
          {auth.session?.role === "customer" ? (
            <div className="mt-4 shrink-0 lg:mt-0">
              <PlanSelector mode="create" plans={marketplace.plans} trialEligible />
            </div>
          ) : (
            <p className="mt-4 text-sm font-semibold text-market-green-dark">
              Add your first item to create an account and choose a plan.
            </p>
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
