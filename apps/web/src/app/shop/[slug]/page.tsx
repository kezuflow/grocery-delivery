import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ImageIcon, PackageCheck } from "lucide-react";

import { MarketplaceShell } from "../../../components/layout";
import { ProductDetailActions } from "../../../features/catalog/product-detail-actions";
import { formatPhp } from "../../../lib/format";
import { loadCatalogItem } from "../../../lib/catalog-item";
import { loadCurrentSession } from "../../../lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadCatalogItem(slug);
  return { title: data.item?.name ?? "Product" };
}

export default async function ProductPage({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const [data, auth] = await Promise.all([loadCatalogItem(slug), loadCurrentSession()]);
  if (!data.item && !data.error) notFound();

  return (
    <MarketplaceShell session={auth.session}>
      <a
        className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[var(--marketplace-text-secondary)] hover:text-[var(--marketplace-accent-strong)]"
        href="/shop"
      >
        <ArrowLeft size={17} /> Back to shop
      </a>
      {data.error || !data.item ? (
        <section className="rounded border border-market-line bg-white p-6" role="status">
          <h1 className="text-2xl font-bold">Product temporarily unavailable</h1>
          <p className="mt-2 text-market-muted">{data.error}</p>
        </section>
      ) : (
        <article className="grid gap-8 rounded-[var(--marketplace-radius-card)] border border-[var(--marketplace-border)] bg-[var(--marketplace-surface)] p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)] lg:items-center">
          <div className="aspect-square overflow-hidden rounded-[var(--marketplace-radius-media)] bg-[var(--marketplace-surface-subtle)]">
            {data.item.imageUrl ? (
              <img
                alt={data.item.name}
                className="size-full object-cover"
                src={data.item.imageUrl}
              />
            ) : (
              <div className="grid size-full place-items-center text-market-muted">
                <ImageIcon size={54} strokeWidth={1.3} />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-market-green-dark">
              {data.categories.find((category) => category.id === data.item?.categoryId)?.name ??
                "Carbon Market"}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] sm:text-5xl">
              {data.item.name}
            </h1>
            <p className="mt-4 leading-7 text-market-muted">{data.item.description}</p>
            <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-market-green-dark">
              <PackageCheck size={18} /> Available this week
            </p>
            <p className="mt-6">
              <strong className="text-3xl font-extrabold tabular-nums text-coral">
                {formatPhp(data.item.price.centavos)}
              </strong>
              <span className="ml-2 text-market-muted">per {data.item.unit}</span>
            </p>
            <div className="mt-8 grid max-w-sm gap-3">
              <ProductDetailActions
                item={data.item}
                session={auth.session}
                subscription={data.subscription}
              />
            </div>
          </div>
        </article>
      )}
    </MarketplaceShell>
  );
}
