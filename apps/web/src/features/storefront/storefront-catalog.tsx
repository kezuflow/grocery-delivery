import { ArrowRight, Carrot, PackageOpen } from "lucide-react";

import { EmptyState, LinkButton } from "../../components/ui";
import { formatPhp } from "../../lib/format";
import type { StorefrontData } from "../../lib/storefront";

export function StorefrontCatalog({ storefront }: Readonly<{ storefront: StorefrontData }>) {
  const destination = "/shop";

  return (
    <section className="bg-white py-20 sm:py-28" id="market">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">
              This week&apos;s market
            </p>
            <h2 className="storefront-display mt-4 max-w-3xl text-4xl leading-[1.04] tracking-[-0.035em] sm:text-6xl">
              The market run, already within reach.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted">
              Explore the active catalog, save what looks good, and build a basket at your own pace.
            </p>
          </div>
          <LinkButton className="shrink-0" href={destination} tone="secondary">
            Browse the full market
            <ArrowRight aria-hidden="true" size={17} />
          </LinkButton>
        </div>

        {storefront.catalog.categories.length ? (
          <ul className="mt-9 flex flex-wrap gap-2" aria-label="Available categories">
            {storefront.catalog.categories.slice(0, 8).map((category) => (
              <li
                className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-bold text-ink"
                key={category.id}
              >
                {category.name}
              </li>
            ))}
          </ul>
        ) : null}

        {!storefront.error && storefront.catalog.items.length ? (
          <div className="mt-10 grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {storefront.catalog.items.slice(0, 8).map((item) => (
              <a
                aria-label={`View ${item.name}, ${formatPhp(item.price.centavos)}`}
                className="group block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-deep"
                href={getProductHref(item.slug)}
                key={item.id}
              >
                <article>
                  <div className="aspect-square overflow-hidden rounded-2xl bg-paper p-5 transition-colors group-hover:bg-soft">
                    {item.imageUrl ? (
                      <img
                        alt={item.name}
                        className="size-full object-contain transition-transform duration-300 group-hover:scale-[1.04]"
                        decoding="async"
                        loading="lazy"
                        src={item.imageUrl}
                      />
                    ) : (
                      <div className="grid size-full place-items-center text-deep">
                        <Carrot aria-hidden="true" size={46} strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                  <div className="grid min-h-[168px] content-start gap-2 px-1 pt-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-coral">
                        {getCategoryName(storefront, item.categoryId)}
                      </p>
                      <ArrowRight
                        aria-hidden="true"
                        className="text-muted transition-transform group-hover:translate-x-1 group-hover:text-ink"
                        size={16}
                      />
                    </div>
                    <h3 className="text-lg font-bold">{item.name}</h3>
                    <p className="line-clamp-2 text-sm leading-6 text-muted">{item.description}</p>
                    <strong className="mt-1 text-lg">{formatPhp(item.price.centavos)}</strong>
                  </div>
                </article>
              </a>
            ))}
          </div>
        ) : !storefront.error ? (
          <div className="mt-10 grid overflow-hidden rounded-[6px] border border-line bg-white md:grid-cols-[0.8fr_1.2fr]">
            <div className="grid min-h-[260px] place-items-center bg-soft text-deep">
              <PackageOpen aria-hidden="true" size={64} strokeWidth={1.25} />
            </div>
            <EmptyState
              action={<LinkButton href={destination}>Open the marketplace</LinkButton>}
              className="content-center border-0 p-8 sm:p-12"
              description="The next active catalog will appear here when it is published. Your marketplace will keep the same search, cart, and server-priced checkout flow."
              title="The weekly catalog is being prepared"
            />
          </div>
        ) : (
          <EmptyState
            className="mt-10 bg-white"
            description={storefront.error}
            title="The market is temporarily unavailable"
          />
        )}
      </div>
    </section>
  );
}

export function getProductHref(slug: string): string {
  return `/shop/${encodeURIComponent(slug)}`;
}

function getCategoryName(storefront: StorefrontData, categoryId: string): string {
  return (
    storefront.catalog.categories.find((category) => category.id === categoryId)?.name ?? "Market"
  );
}
