import { PublicShell } from "../../components/layout";
import { EmptyState, ErrorState, LinkButton } from "../../components/ui";
import { formatPhp } from "../../lib/format";
import type { SessionSummary } from "../../lib/permissions";
import type { StorefrontData } from "../../lib/storefront";
import { PublicAuthControls } from "../auth";

const highlights = [
  {
    number: "01",
    title: "Plan the week",
    description: "Choose a weekly plan and adjust your shop before the published cutoff.",
  },
  {
    number: "02",
    title: "Source what is needed",
    description: "Demand-led purchasing keeps food moving and reduces unnecessary storage.",
  },
  {
    number: "03",
    title: "Deliver together",
    description: "Grouped delivery windows make each route more useful and predictable.",
  },
] as const;

export function StorefrontContent({
  storefront,
  session,
  sessionError,
}: Readonly<{
  storefront: StorefrontData;
  session: SessionSummary | null;
  sessionError: string | null;
}>) {
  const banner = storefront.banners[0];

  return (
    <PublicShell
      actions={<PublicAuthControls session={session} />}
      navigation={[
        { href: "#how-it-works", label: "How it works" },
        { href: "#plans", label: "Plans" },
        { href: "#catalog", label: "This week" },
      ]}
    >
      <section className="relative isolate min-h-[36rem] overflow-hidden bg-deep text-white">
        {banner ? (
          <picture>
            <source media="(max-width: 640px)" srcSet={banner.mobileUrl} />
            <img
              alt={banner.altText}
              className="absolute inset-0 -z-20 size-full object-cover"
              decoding="async"
              fetchPriority="high"
              src={banner.desktopUrl}
            />
          </picture>
        ) : null}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-deep via-deep/85 to-deep/20" />
        <div className="mx-auto flex min-h-[36rem] max-w-[1180px] items-center px-5 py-20 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
              A better weekly shop
            </p>
            <h1 className="mt-5 text-5xl font-bold leading-[0.95] tracking-tight sm:text-7xl">
              {banner?.title ?? "Good food, planned around your week."}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/80 sm:text-lg">
              {banner?.copy ??
                "Server-priced groceries, practical weekly plans, and delivery routes designed to waste less."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href={banner?.ctaDestination ?? "#plans"} size="lg">
                {banner?.ctaLabel ?? "Explore plans"}
              </LinkButton>
              <LinkButton href="#how-it-works" size="lg" tone="secondary">
                How it works
              </LinkButton>
            </div>
          </div>
        </div>
      </section>

      {sessionError ? (
        <div
          className="border-b border-line bg-white px-5 py-3 text-center text-sm text-danger"
          role="status"
        >
          {sessionError}
        </div>
      ) : session ? (
        <div className="border-b border-line bg-accent/40 px-5 py-3 text-center text-sm font-bold">
          Your {session.role} session is active. Use “Open account” to continue.
        </div>
      ) : null}

      <section className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8" id="how-it-works">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
              Designed around real life
            </p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              A weekly rhythm that makes sense.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {highlights.map((highlight) => (
              <article className="border-t border-line pt-5" key={highlight.number}>
                <span className="text-sm font-bold text-accent-dark">{highlight.number}</span>
                <h3 className="mt-8 text-xl font-bold">{highlight.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{highlight.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-deep text-white" id="plans">
        <div className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                Weekly plans
              </p>
              <h2 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
                Start with the plan that fits your household.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-white/70">
              Fees and included credits come directly from the server-owned plan catalog.
            </p>
          </div>
          {storefront.error ? (
            <ErrorState
              className="mt-10 border-white/20 bg-white text-ink"
              description={storefront.error}
              title="Plans are temporarily unavailable"
            />
          ) : storefront.plans.length ? (
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {storefront.plans.map((plan) => (
                <article className="grid gap-5 border border-white/20 bg-white/5 p-6" key={plan.id}>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
                      {plan.code}
                    </p>
                    <h3 className="mt-3 text-2xl font-bold">{plan.name}</h3>
                  </div>
                  <div>
                    <strong className="text-3xl">{formatPhp(plan.weeklyFee.centavos)}</strong>
                    <span className="text-sm text-white/60"> / week</span>
                  </div>
                  <p className="text-sm leading-6 text-white/70">
                    Includes {formatPhp(plan.weeklyCredit.centavos)} in weekly grocery credit.
                  </p>
                  <LinkButton
                    href={session?.role === "customer" ? "/account" : "#join"}
                    tone="secondary"
                  >
                    {session?.role === "customer" ? "Manage your plan" : "Choose this plan"}
                  </LinkButton>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              className="mt-10 border-white/20 text-white"
              description="There are no active weekly plans right now."
              title="Plans are being prepared"
            />
          )}
        </div>
      </section>

      <CatalogPreview session={session} storefront={storefront} />

      <section className="border-y border-line bg-white" id="join">
        <div className="mx-auto grid max-w-[1180px] gap-6 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
              Ready for the week?
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Keep your groceries and deliveries in one place.
            </h2>
          </div>
          {session ? (
            <LinkButton href={session.role === "customer" ? "/shop" : "/"}>
              {session.role === "customer" ? "Shop this week" : "Return home"}
            </LinkButton>
          ) : (
            <PublicAuthControls session={null} />
          )}
        </div>
      </section>

      <footer className="mx-auto grid max-w-[1180px] gap-8 px-5 py-10 text-sm text-muted sm:px-8 md:grid-cols-[1fr_auto]">
        <div>
          <strong className="text-ink">Carbon Food Delivery</strong>
          <p className="mt-2 max-w-md leading-6">Weekly groceries with a lighter footprint.</p>
        </div>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-5">
          <a className="hover:text-ink" href="#privacy">
            Privacy
          </a>
          <a className="hover:text-ink" href="#terms">
            Terms
          </a>
          <a className="hover:text-ink" href="mailto:support@getscenepass.com">
            Support
          </a>
        </nav>
        <p className="md:col-span-2" id="privacy">
          Privacy: account data is used to operate subscriptions, orders, deliveries, and support.
        </p>
        <p className="md:col-span-2" id="terms">
          Terms: plan availability, prices, credits, and delivery windows are confirmed by the
          server.
        </p>
      </footer>
    </PublicShell>
  );
}

function CatalogPreview({
  storefront,
  session,
}: Readonly<{ storefront: StorefrontData; session: SessionSummary | null }>) {
  return (
    <section className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8" id="catalog">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
            Available this week
          </p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            A look at the catalog.
          </h2>
        </div>
        {session?.role === "customer" ? (
          <LinkButton href="/shop" tone="secondary">
            Shop the full catalog
          </LinkButton>
        ) : null}
      </div>
      {!storefront.error && storefront.catalog.items.length ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {storefront.catalog.items.slice(0, 8).map((item) => (
            <article className="overflow-hidden border border-line bg-white" key={item.id}>
              <div className="aspect-[4/3] bg-accent/20">
                {item.imageUrl ? (
                  <img
                    alt={item.name}
                    className="size-full object-cover"
                    decoding="async"
                    loading="lazy"
                    src={item.imageUrl}
                  />
                ) : (
                  <div className="grid size-full place-items-center text-xs font-bold uppercase tracking-[0.16em] text-muted">
                    Fresh this week
                  </div>
                )}
              </div>
              <div className="grid gap-3 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                  {getCategoryName(storefront, item.categoryId)}
                </p>
                <h3 className="text-lg font-bold">{item.name}</h3>
                <p className="line-clamp-2 text-sm leading-6 text-muted">{item.description}</p>
                <strong>{formatPhp(item.price.centavos)}</strong>
              </div>
            </article>
          ))}
        </div>
      ) : !storefront.error ? (
        <EmptyState
          className="mt-10"
          description="The next active catalog will appear here once it is published."
          title="No catalog items are available"
        />
      ) : null}
    </section>
  );
}

function getCategoryName(storefront: StorefrontData, categoryId: string): string {
  return (
    storefront.catalog.categories.find((category) => category.id === categoryId)?.name ?? "Catalog"
  );
}
