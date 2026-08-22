import { ArrowRight, Carrot, PackageOpen } from "lucide-react";

import { EmptyState, LinkButton } from "../../components/ui";
import { formatPhp } from "../../lib/format";
import type { StorefrontData } from "../../lib/storefront";

export function StorefrontCatalog({ storefront }: Readonly<{ storefront: StorefrontData }>) {
  const destination = "/shop";

  return (
    <section className="bg-paper py-20 sm:py-24" id="market">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold text-coral">This week&apos;s market</p>
            <h2 className="storefront-display mt-3 max-w-2xl text-4xl leading-tight sm:text-5xl">
              Vegetables, fruit, pantry staples, and more.
            </h2>
          </div>
          <LinkButton href={destination} tone="secondary">
            Browse the full market
            <ArrowRight aria-hidden="true" size={17} />
          </LinkButton>
        </div>

        {storefront.catalog.categories.length ? (
          <ul className="mt-8 flex flex-wrap gap-2" aria-label="Available categories">
            {storefront.catalog.categories.slice(0, 8).map((category) => (
              <li
                className="border border-line bg-white px-4 py-2 text-sm font-bold text-ink"
                key={category.id}
              >
                {category.name}
              </li>
            ))}
          </ul>
        ) : null}

        {!storefront.error && storefront.catalog.items.length ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {storefront.catalog.items.slice(0, 8).map((item) => (
              <article
                className="group overflow-hidden rounded-[6px] border border-line bg-white"
                key={item.id}
              >
                <div className="aspect-[4/3] overflow-hidden bg-soft">
                  {item.imageUrl ? (
                    <img
                      alt={item.name}
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
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
                <div className="grid min-h-[190px] content-start gap-3 p-5">
                  <p className="text-xs font-bold text-coral">
                    {getCategoryName(storefront, item.categoryId)}
                  </p>
                  <h3 className="text-lg font-bold">{item.name}</h3>
                  <p className="line-clamp-2 text-sm leading-6 text-muted">{item.description}</p>
                  <strong className="mt-auto text-lg">{formatPhp(item.price.centavos)}</strong>
                </div>
              </article>
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

function getCategoryName(storefront: StorefrontData, categoryId: string): string {
  return (
    storefront.catalog.categories.find((category) => category.id === categoryId)?.name ?? "Market"
  );
}
