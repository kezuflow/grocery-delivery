import type { Metadata } from "next";

import { AppShell } from "../../components/layout";
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
    <AppShell
      breadcrumbs={[{ href: "/", label: "Storefront" }, { label: "Marketplace" }]}
      description="Browse vegetables and grocery items, then save your weekly cart. Prices and availability are confirmed by the server."
      eyebrow="Your grocery marketplace"
      session={session}
      title="Shop fresh groceries"
    >
      {!marketplace.subscription ? (
        <section className="account-panel account-panel-wide">
          <div className="account-panel-heading">
            <p className="eyebrow">New customer offer</p>
            <span>One month free</span>
          </div>
          <h2>Activate your free grocery plan trial</h2>
          <p>
            Choose an active plan. Your first calendar month is free, and the server records the
            trial dates before any future billing.
          </p>
          <PlanSelector mode="create" plans={marketplace.plans} trialEligible />
        </section>
      ) : marketplace.subscription.trialEndsAt ? (
        <p className="signed-in-banner">
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
    </AppShell>
  );
}
