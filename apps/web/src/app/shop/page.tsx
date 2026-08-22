import type { Metadata } from "next";

import { MarketplaceShell } from "../../components/layout";
import {
  CustomerCatalog,
  parseCatalogFilters,
  type CatalogSearchParams,
} from "../../features/catalog";
import { requireCustomerSession } from "../../lib/auth";
import { loadMarketplace } from "../../lib/marketplace";
import { PlanSelector } from "../account/plan-selector";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Marketplace" };

export default async function ShopPage({
  searchParams,
}: Readonly<{ searchParams: Promise<CatalogSearchParams> }>) {
  const session = await requireCustomerSession();
  const [marketplace, query] = await Promise.all([loadMarketplace(), searchParams]);
  const filters = parseCatalogFilters(query);

  return (
    <MarketplaceShell session={session}>
      <header className="mb-6 grid gap-5 lg:mb-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-market-green-dark">
            Weekly market
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-market-ink sm:text-4xl">
            Shop fresh groceries
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-market-muted">
            Browse this week&apos;s catalog and save your cart. Prices and availability are
            confirmed by Carbon.
          </p>
        </div>
        <a
          className="hidden text-sm font-bold text-market-green-dark underline-offset-4 hover:underline lg:inline-flex"
          href="/account/cart"
        >
          View cart
        </a>
      </header>
      {!marketplace.subscription ? (
        <section className="mb-7 overflow-hidden rounded-2xl bg-market-banner px-5 py-5 sm:px-7 sm:py-6">
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
          <div className="mt-4">
            <PlanSelector mode="create" plans={marketplace.plans} trialEligible />
          </div>
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
      />
    </MarketplaceShell>
  );
}
