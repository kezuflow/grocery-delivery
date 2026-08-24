"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ActivePromotionBannersResponse,
  CartResponse,
  CatalogCategoryResponse,
  CatalogSkuResponse,
  SubscriptionResponse,
} from "@carbon/contracts";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Button, EmptyState, ErrorState } from "../../components/ui";
import { PublicAuthControls } from "../auth";
import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";
import type { SessionSummary } from "../../lib/permissions";
import { subscriptionReturnHref } from "../../lib/subscription-onboarding";
import {
  addCartQuantity,
  cartDraftFromResponse,
  parseCatalogQuery,
  setCartQuantity,
  toCartUpdateLines,
  type CatalogQueryOptions,
  type CartDraftLine,
} from "./catalog-utils";
import { ProductCard } from "./product-card";

export function CustomerCatalog({
  banners,
  catalog,
  cart,
  error,
  filters,
  nextCursor,
  session,
  subscription,
}: Readonly<{
  banners: ActivePromotionBannersResponse["data"]["banners"];
  catalog: Readonly<{
    categories: readonly CatalogCategoryResponse[];
    items: readonly CatalogSkuResponse[];
  }>;
  nextCursor: string | null;
  cart: CartResponse["data"];
  error: string | null;
  filters: CatalogQueryOptions;
  session: SessionSummary | null;
  subscription: SubscriptionResponse["data"] | null;
}>) {
  const router = useRouter();
  const [activeFilters, setActiveFilters] = useState(filters);
  const [lines, setLines] = useState<CartDraftLine[]>(() => cartDraftFromResponse(cart));
  const [savedCart, setSavedCart] = useState(cart);
  const [saving, setSaving] = useState(false);
  const [pendingSku, setPendingSku] = useState<string | null>(null);
  const [retryLines, setRetryLines] = useState<readonly CartDraftLine[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sort, setSort] = useState(filters.sort);
  const [minimumPrice, setMinimumPrice] = useState(
    filters.minPriceCentavos ? String(filters.minPriceCentavos / 100) : "",
  );
  const [maximumPrice, setMaximumPrice] = useState(
    filters.maxPriceCentavos ? String(filters.maxPriceCentavos / 100) : "",
  );
  const [authOpen, setAuthOpen] = useState(false);
  const canEditCart = session?.role === "customer";
  const hasActiveSubscription = subscription?.status === "active";

  useEffect(() => {
    setLines(cartDraftFromResponse(cart));
    setSavedCart(cart);
  }, [cart]);
  useEffect(() => {
    function restoreFilters() {
      const restored = parseCatalogQuery(
        Object.fromEntries(new URLSearchParams(window.location.search)),
      );
      setActiveFilters(restored);
      setSort(restored.sort);
      setMinimumPrice(restored.minPriceCentavos ? String(restored.minPriceCentavos / 100) : "");
      setMaximumPrice(restored.maxPriceCentavos ? String(restored.maxPriceCentavos / 100) : "");
    }
    window.addEventListener("popstate", restoreFilters);
    return () => window.removeEventListener("popstate", restoreFilters);
  }, []);

  function updateUrl(nextFilters: CatalogQueryOptions) {
    const normalized: CatalogQueryOptions = {
      search: nextFilters.search,
      category: nextFilters.category,
      sort: nextFilters.sort,
      ...(nextFilters.minPriceCentavos !== undefined
        ? { minPriceCentavos: nextFilters.minPriceCentavos }
        : {}),
      ...(nextFilters.maxPriceCentavos !== undefined
        ? { maxPriceCentavos: nextFilters.maxPriceCentavos }
        : {}),
    };
    const params = new URLSearchParams();
    if (normalized.search) params.set("search", normalized.search);
    if (normalized.category) params.set("category", normalized.category);
    if (normalized.sort !== "popular") params.set("sort", normalized.sort);
    if (normalized.minPriceCentavos !== undefined)
      params.set("minPrice", String(normalized.minPriceCentavos / 100));
    if (normalized.maxPriceCentavos !== undefined)
      params.set("maxPrice", String(normalized.maxPriceCentavos / 100));
    const query = params.toString();
    window.history.pushState(null, "", `/shop${query ? `?${query}` : ""}`);
    setActiveFilters(normalized);
    setSort(normalized.sort);
    router.refresh();
  }
  function applyPriceFilter() {
    const minimum = Number(minimumPrice);
    const maximum = Number(maximumPrice);
    updateUrl({
      ...activeFilters,
      ...(Number.isFinite(minimum) && minimum >= 0 && minimumPrice !== ""
        ? { minPriceCentavos: minimum * 100 }
        : {}),
      ...(Number.isFinite(maximum) && maximum >= 0 && maximumPrice !== ""
        ? { maxPriceCentavos: maximum * 100 }
        : {}),
    });
  }
  async function mutateCart(nextLines: readonly CartDraftLine[], skuId?: string) {
    if (!canEditCart) {
      setAuthOpen(true);
      return;
    }
    if (saving) return;
    const previousLines = lines;
    setSaving(true);
    setPendingSku(skuId ?? null);
    setRetryLines(null);
    setMessage(null);
    setLines([...nextLines]);
    try {
      const response = await createApiClient(createSameOriginApiTransport()).updateCart({
        lines: toCartUpdateLines(nextLines),
        expectedUpdatedAt: savedCart.updatedAt,
      });
      setLines(cartDraftFromResponse(response.data));
      setSavedCart(response.data);
      setMessage(
        response.data.adjustments?.length
          ? "Your cart was refreshed with current prices and availability."
          : "Cart updated.",
      );
    } catch (saveError) {
      setLines(previousLines);
      setRetryLines(nextLines);
      if (
        saveError instanceof ApiClientError &&
        (saveError.code === "CART_STALE" || saveError.code === "SKU_NOT_AVAILABLE")
      ) {
        try {
          const refreshed = await createApiClient(createSameOriginApiTransport()).getCart();
          setLines(cartDraftFromResponse(refreshed.data));
          setSavedCart(refreshed.data);
          setMessage("Your cart changed elsewhere, so we refreshed it. Review it and retry.");
          return;
        } catch {
          /* Preserve the mutation error. */
        }
      }
      setMessage(
        saveError instanceof ApiClientError ? saveError.message : "We could not update your cart.",
      );
    } finally {
      setSaving(false);
      setPendingSku(null);
    }
  }
  function requestAdd(skuId: string) {
    if (!canEditCart) {
      setMessage("Sign in to add items to your cart.");
      setAuthOpen(true);
      return;
    }
    if (!hasActiveSubscription) {
      router.push(subscriptionReturnHref(window.location.pathname + window.location.search));
      return;
    }
    void mutateCart(addCartQuantity(lines, skuId), skuId);
  }

  const visibleItems = catalog.items;
  const hasFilters = Boolean(
    activeFilters.search ||
    activeFilters.category ||
    activeFilters.minPriceCentavos !== undefined ||
    activeFilters.maxPriceCentavos !== undefined,
  );
  const aisleSections = catalog.categories
    .map((category) => ({
      category,
      items: visibleItems.filter((item) => item.categoryId === category.id),
    }))
    .filter((section) => section.items.length);
  const featured = visibleItems.slice(0, 10);
  const greenItems = visibleItems.filter((item) =>
    /broccoli|cabbage|green beans|lettuce|pechay|kangkong|cilantro|spring onions/i.test(item.name),
  );
  const leafyItems = visibleItems.filter((item) =>
    /cabbage|lettuce|pechay|kangkong|cilantro|basil/i.test(item.name),
  );
  const cartCount = lines.reduce((total, line) => total + line.quantity, 0);

  return (
    <>
      {!canEditCart ? (
        <PublicAuthControls
          onAuthenticated={(role) => {
            if (role === "customer") {
              setAuthOpen(false);
              router.push(
                subscriptionReturnHref(window.location.pathname + window.location.search),
              );
            } else {
              setMessage("A customer account is required to shop.");
            }
          }}
          onOpenChange={setAuthOpen}
          open={authOpen}
          redirectAfterAuth={false}
          session={null}
          showTriggers={false}
        />
      ) : null}
      <div className="sticky top-[68px] z-20 -mx-4 mb-6 border-y border-base-line bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:top-16 lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
          {categoryShortcuts(catalog.categories).map((category) => (
            <button
              aria-pressed={category.active(activeFilters)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${category.active(activeFilters) ? "bg-base-action text-white" : "bg-base-surface"}`}
              key={category.label}
              onClick={() => category.onSelect(updateUrl, activeFilters)}
              type="button"
            >
              {category.label}
            </button>
          ))}
          <details className="relative shrink-0">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full bg-base-surface px-4 py-2 text-xs font-semibold">
              <SlidersHorizontal size={14} /> Filters
            </summary>
            <div className="absolute right-0 top-11 z-30 w-72 rounded-xl border border-base-line bg-white p-4 shadow-xl">
              <label className="grid gap-1 text-xs font-semibold">
                Sort
                <select
                  aria-label="Sort products"
                  className="rounded border border-base-line p-2 text-sm"
                  onChange={(event) => {
                    const nextSort = event.target.value as typeof sort;
                    setSort(nextSort);
                    updateUrl({ ...activeFilters, sort: nextSort });
                  }}
                  value={sort}
                >
                  <option value="popular">Most popular</option>
                  <option value="name">Name</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                </select>
              </label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-xs">
                  Min PHP
                  <input
                    className="min-w-0 rounded border border-base-line px-2 py-2"
                    min="0"
                    onChange={(event) => setMinimumPrice(event.target.value)}
                    type="number"
                    value={minimumPrice}
                  />
                </label>
                <label className="grid gap-1 text-xs">
                  Max PHP
                  <input
                    className="min-w-0 rounded border border-base-line px-2 py-2"
                    min="0"
                    onChange={(event) => setMaximumPrice(event.target.value)}
                    type="number"
                    value={maximumPrice}
                  />
                </label>
              </div>
              <div className="mt-3 flex gap-2">
                <Button onClick={applyPriceFilter} size="sm" type="button">
                  Apply
                </Button>
                <Button
                  onClick={() => {
                    setMinimumPrice("");
                    setMaximumPrice("");
                    updateUrl({
                      search: activeFilters.search,
                      category: activeFilters.category,
                      sort: activeFilters.sort,
                    });
                  }}
                  size="sm"
                  tone="secondary"
                  type="button"
                >
                  Clear
                </Button>
              </div>
            </div>
          </details>
        </div>
      </div>

      {!hasFilters && visibleItems.length > 1 ? <MerchandisingRail banners={banners} /> : null}

      {error ? (
        <ErrorState
          className="my-8"
          description={error}
          onRetry={() => router.refresh()}
          title="Catalog temporarily unavailable"
        />
      ) : visibleItems.length === 0 ? (
        <EmptyState
          className="my-8"
          action={
            hasFilters ? (
              <Button
                onClick={() => {
                  updateUrl({ search: "", category: "", sort: "popular" });
                }}
                size="sm"
                tone="secondary"
                type="button"
              >
                Clear filters
              </Button>
            ) : null
          }
          description={
            hasFilters
              ? "Try another search or aisle."
              : "Active items will appear when the next catalog is published."
          }
          title={hasFilters ? "No items found" : "The store is empty"}
        />
      ) : (
        <div className="grid min-w-0 gap-10 pb-8">
          {!activeFilters.category && !activeFilters.search ? (
            <>
              <ProductRow
                categories={catalog.categories}
                id="best-sellers"
                items={featured}
                lines={lines}
                onAdd={requestAdd}
                onQuantityChange={(skuId, quantity) =>
                  void mutateCart(setCartQuantity(lines, skuId, quantity), skuId)
                }
                pendingSku={pendingSku}
                saving={saving}
                title="Best sellers"
              />
              <ProductRow
                categories={catalog.categories}
                id="greens"
                items={greenItems}
                lines={lines}
                onAdd={requestAdd}
                onQuantityChange={(skuId, quantity) =>
                  void mutateCart(setCartQuantity(lines, skuId, quantity), skuId)
                }
                pendingSku={pendingSku}
                saving={saving}
                title="Greens"
              />
              <ProductRow
                categories={catalog.categories}
                id="leafy-vegetables"
                items={leafyItems}
                lines={lines}
                onAdd={requestAdd}
                onQuantityChange={(skuId, quantity) =>
                  void mutateCart(setCartQuantity(lines, skuId, quantity), skuId)
                }
                pendingSku={pendingSku}
                saving={saving}
                title="Leafy vegetables"
              />
            </>
          ) : null}
          {aisleSections.map(({ category, items }) => (
            <ProductRow
              categories={catalog.categories}
              items={items}
              key={category.id}
              lines={lines}
              onAdd={requestAdd}
              onQuantityChange={(skuId, quantity) =>
                void mutateCart(setCartQuantity(lines, skuId, quantity), skuId)
              }
              pendingSku={pendingSku}
              saving={saving}
              title={category.name}
            />
          ))}
        </div>
      )}

      {nextCursor ? (
        <a
          className="mb-8 inline-flex rounded-full bg-base-surface px-5 py-2.5 text-sm font-bold"
          href={`/shop?${new URLSearchParams({ ...(activeFilters.search ? { search: activeFilters.search } : {}), ...(activeFilters.category ? { category: activeFilters.category } : {}), ...(activeFilters.sort !== "popular" ? { sort: activeFilters.sort } : {}), cursor: nextCursor }).toString()}`}
        >
          Load more
        </a>
      ) : null}
      {message ? (
        <div
          className="fixed bottom-24 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-lg bg-base-action px-4 py-3 text-xs text-white shadow-xl lg:bottom-6"
          role="status"
        >
          <span>{saving ? "Updating cart..." : message}</span>
          {retryLines ? (
            <button
              aria-label="Retry cart update"
              className="font-bold underline"
              onClick={() => void mutateCart(retryLines)}
              type="button"
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}
      {canEditCart && cartCount ? (
        <a
          className="fixed inset-x-4 bottom-[4.8rem] z-40 mx-auto flex min-h-12 max-w-md items-center justify-between rounded-lg bg-black px-5 py-3 text-sm font-bold !text-white shadow-xl lg:bottom-6 lg:left-auto lg:right-6 lg:w-72"
          href="/account/cart"
        >
          <span>
            {cartCount} {cartCount === 1 ? "item" : "items"}
          </span>
          <span>
            View cart ·{" "}
            {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
              savedCart.subtotal.centavos / 100,
            )}
          </span>
        </a>
      ) : null}
    </>
  );
}

function ProductRow({
  title,
  id,
  items,
  categories,
  lines,
  pendingSku,
  saving,
  onAdd,
  onQuantityChange,
}: Readonly<{
  title: string;
  id?: string;
  items: readonly CatalogSkuResponse[];
  categories: readonly CatalogCategoryResponse[];
  lines: readonly CartDraftLine[];
  pendingSku: string | null;
  saving: boolean;
  onAdd: (skuId: string) => void;
  onQuantityChange: (skuId: string, quantity: number) => void;
}>) {
  const railRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [scrollState, setScrollState] = useState({ left: false, right: items.length > 4 });
  const rowId =
    id ??
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  function updateScrollState() {
    const rail = railRef.current;
    if (!rail) return;
    setScrollState({
      left: rail.scrollLeft > 1,
      right: rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 1,
    });
  }

  useEffect(() => {
    updateScrollState();
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
  }, [items]);

  return (
    <section
      aria-labelledby={`${rowId}-heading`}
      className="min-w-0"
      data-testid={`product-row-${rowId}`}
      {...(id ? { id } : {})}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2
          className="!m-0 !text-lg font-extrabold tracking-[-0.02em] sm:!text-xl"
          id={`${rowId}-heading`}
        >
          {title}
        </h2>
        <div className="flex items-center gap-3">
          <div className={`hidden items-center gap-1 sm:flex ${expanded ? "sm:hidden" : ""}`}>
            <button
              aria-label={`Scroll ${title} left`}
              className="grid size-8 place-items-center rounded-full border border-base-line hover:bg-base-surface disabled:cursor-not-allowed disabled:opacity-35"
              disabled={!scrollState.left}
              onClick={() => railRef.current?.scrollBy({ left: -420, behavior: "smooth" })}
              type="button"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              aria-label={`Scroll ${title} right`}
              className="grid size-8 place-items-center rounded-full border border-base-line hover:bg-base-surface disabled:cursor-not-allowed disabled:opacity-35"
              disabled={!scrollState.right}
              onClick={() => railRef.current?.scrollBy({ left: 420, behavior: "smooth" })}
              type="button"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            aria-controls={`${rowId}-products`}
            aria-expanded={expanded}
            className="flex items-center gap-1 text-xs font-semibold"
            onClick={() => {
              setExpanded((current) => !current);
              railRef.current?.scrollTo({ left: 0 });
            }}
            type="button"
          >
            {expanded ? "Show less" : "See all"} <ChevronRight size={15} />
          </button>
        </div>
      </div>
      <div
        aria-label={`${title} products`}
        className={`max-w-full gap-3 pb-3 sm:gap-4 ${expanded ? "flex flex-wrap overflow-visible" : "flex overflow-x-auto [scrollbar-width:none]"}`}
        data-testid={`product-rail-${rowId}`}
        id={`${rowId}-products`}
        onScroll={updateScrollState}
        ref={railRef}
        tabIndex={expanded ? -1 : 0}
      >
        {items.map((item) => (
          <ProductCard
            categories={categories}
            item={item}
            key={item.id}
            onAdd={() => onAdd(item.id)}
            onQuantityChange={(quantity) => onQuantityChange(item.id, quantity)}
            pending={saving && pendingSku === item.id}
            quantity={lines.find((line) => line.skuId === item.id)?.quantity ?? 0}
          />
        ))}
      </div>
    </section>
  );
}

function categoryShortcuts(categories: readonly CatalogCategoryResponse[]) {
  return [
    {
      label: "Grocery",
      active: (filters: CatalogQueryOptions) => !filters.category && !filters.search,
      onSelect: (update: (filters: CatalogQueryOptions) => void, filters: CatalogQueryOptions) =>
        update({ ...filters, category: "", search: "" }),
    },
    ...categories.map((category) => ({
      label: category.name,
      active: (filters: CatalogQueryOptions) => filters.category === category.slug,
      onSelect: (update: (filters: CatalogQueryOptions) => void, filters: CatalogQueryOptions) =>
        update({ ...filters, category: category.slug, search: "" }),
    })),
    {
      label: "Greens",
      active: () => false,
      onSelect: () => selectCollection("greens"),
    },
    {
      label: "Leafy vegetables",
      active: () => false,
      onSelect: () => selectCollection("leafy-vegetables"),
    },
  ];
}

function selectCollection(id: string) {
  const collection = document.getElementById(id);
  if (collection) {
    collection.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  window.location.assign(`/shop#${id}`);
}

const DEFAULT_FEATURED_CAMPAIGNS = [
  {
    id: "first-order",
    headline: "40% off",
    subheadline: "your first order",
    ctaLabel: "Shop the offer",
    href: "/shop?sort=popular",
    imageUrl: "/marketplace/first-order-campaign.webp",
    imageAlt: "A cheerful shopper presenting a box of fresh produce",
    backgroundClassName: "bg-[#ff3f8f] text-white",
    headlineClassName: "text-[#161616]",
    ctaClassName: "bg-[#fff8ed] text-[#163d30]",
  },
  {
    id: "build-your-box",
    headline: "Build your box",
    subheadline: "your way",
    ctaLabel: "Start choosing",
    href: "/shop?sort=popular",
    imageUrl: "/marketplace/build-your-box-campaign.webp",
    imageAlt: "Hands packing a fresh produce box",
    backgroundClassName: "bg-[#174b3a] text-white",
    headlineClassName: "text-white",
    ctaClassName: "bg-[#fff8ed] text-[#163d30]",
  },
  {
    id: "market-fresh",
    headline: "Market fresh",
    subheadline: "every week",
    ctaLabel: "See what's fresh",
    href: "/shop?sort=newest",
    imageUrl: "/marketplace/market-fresh-campaign.webp",
    imageAlt: "A market grower holding a box of fresh produce",
    backgroundClassName: "bg-[#ffad52] text-[#143f31]",
    headlineClassName: "text-[#161616]",
    ctaClassName: "bg-white text-[#163d30]",
  },
  {
    id: "weekend-delivery",
    headline: "Weekend drops",
    subheadline: "right on time",
    ctaLabel: "Browse the market",
    href: "/shop?sort=popular",
    imageUrl: "/marketplace/weekend-delivery-campaign.webp",
    imageAlt: "A bicycle courier carrying a produce delivery box",
    backgroundClassName: "bg-[#9cd9eb] text-[#143f31]",
    headlineClassName: "text-[#161616]",
    ctaClassName: "bg-white text-[#163d30]",
  },
  {
    id: "free-month",
    headline: "One month free",
    subheadline: "to get started",
    ctaLabel: "Try a membership",
    href: "/account/subscribe?returnTo=%2Fshop",
    imageUrl: "/marketplace/free-month-campaign.webp",
    imageAlt: "A couple happily unpacking a box of fresh produce",
    backgroundClassName: "bg-[#7446a8] text-white",
    headlineClassName: "text-white",
    ctaClassName: "bg-[#fff8ed] text-[#163d30]",
  },
] as const;

function MerchandisingRail({
  banners,
}: Readonly<{
  banners: ActivePromotionBannersResponse["data"]["banners"];
}>) {
  const [activeCampaignIndex, setActiveCampaignIndex] = useState(0);

  if (banners.length) {
    return (
      <section
        aria-label="Featured offers"
        className="mb-9 grid scroll-mt-24 gap-3 sm:grid-cols-2"
        id="featured-offers"
      >
        {banners.slice(0, 2).map((banner) => (
          <a
            className="group relative min-h-36 overflow-hidden rounded-xl bg-[#e8f5ed] px-5 py-5 sm:min-h-40"
            href={banner.ctaDestination}
            key={banner.id}
          >
            <div className="relative z-10 max-w-[64%]">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#087443]">
                Featured this week
              </p>
              <h2 className="!m-0 mt-2 !text-lg font-extrabold leading-tight sm:!text-xl">
                {banner.title}
              </h2>
              <p className="mt-1 text-xs leading-4 text-[#52675d]">{banner.copy}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold">
                {banner.ctaLabel} <ChevronRight size={14} />
              </span>
            </div>
            <picture>
              <source media="(max-width: 639px)" srcSet={banner.mobileUrl} />
              <img
                alt={banner.altText}
                className="absolute inset-y-0 right-0 h-full w-[45%] object-cover transition-transform group-hover:scale-105"
                src={banner.desktopUrl}
              />
            </picture>
          </a>
        ))}
      </section>
    );
  }

  const activeCampaign =
    DEFAULT_FEATURED_CAMPAIGNS[activeCampaignIndex] ?? DEFAULT_FEATURED_CAMPAIGNS[0];
  const secondaryCampaign =
    DEFAULT_FEATURED_CAMPAIGNS[(activeCampaignIndex + 1) % DEFAULT_FEATURED_CAMPAIGNS.length] ??
    DEFAULT_FEATURED_CAMPAIGNS[1];

  function showPreviousCampaign() {
    setActiveCampaignIndex((current) =>
      current === 0 ? DEFAULT_FEATURED_CAMPAIGNS.length - 1 : current - 1,
    );
  }

  function showNextCampaign() {
    setActiveCampaignIndex((current) => (current + 1) % DEFAULT_FEATURED_CAMPAIGNS.length);
  }

  return (
    <section
      aria-label="Featured offers"
      aria-roledescription="carousel"
      className="mb-10 scroll-mt-24"
      id="featured-offers"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {[activeCampaign, secondaryCampaign].map((campaign, index) => (
          <a
            aria-label={`${campaign.headline} ${campaign.subheadline}: ${campaign.ctaLabel}`}
            className={`group relative isolate min-h-[320px] overflow-hidden rounded-[28px] px-6 py-7 shadow-[0_22px_60px_rgba(21,61,48,0.17)] sm:min-h-[340px] sm:items-center sm:px-10 sm:py-9 lg:min-h-[370px] lg:px-8 ${campaign.backgroundClassName} ${index === 0 ? "flex" : "hidden lg:flex"}`}
            href={campaign.href}
            key={campaign.id}
          >
            <span
              aria-hidden="true"
              className="absolute -left-14 -top-20 size-52 rounded-full bg-white/20 blur-sm"
            />
            <span
              aria-hidden="true"
              className="absolute -bottom-28 left-[37%] size-72 rounded-full bg-white/15"
            />
            <span
              aria-hidden="true"
              className="absolute right-[8%] top-5 size-16 rounded-full border-[14px] border-white/20 transition-transform duration-300 group-hover:rotate-12"
            />
            <div className="relative z-20 flex w-[61%] max-w-[560px] flex-col items-start justify-center self-stretch sm:w-[56%] lg:w-[58%]">
              <h2
                className={`!m-0 flex flex-col font-black tracking-[-0.055em] ${campaign.headlineClassName}`}
              >
                <span className="max-w-[9ch] text-[clamp(2.7rem,6.4vw,5.6rem)] leading-[0.82] text-inherit lg:text-[clamp(2.7rem,3.6vw,3.65rem)]">
                  {campaign.headline}
                </span>
                <span className="mt-3 max-w-[11ch] text-[clamp(1.45rem,3.2vw,2.55rem)] leading-[0.92] text-inherit lg:text-[clamp(1.35rem,1.9vw,1.8rem)]">
                  {campaign.subheadline}
                </span>
              </h2>
              <span
                className={`mt-6 inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-extrabold shadow-sm transition-transform group-hover:translate-x-1 sm:px-5 sm:text-sm ${campaign.ctaClassName}`}
              >
                {campaign.ctaLabel} <ChevronRight size={16} />
              </span>
            </div>

            <img
              alt={campaign.imageAlt}
              className="pointer-events-none absolute bottom-0 right-2 z-10 h-[94%] w-auto max-w-none origin-bottom-right object-contain object-right-bottom transition-transform duration-300 group-hover:scale-[1.015] sm:right-3 sm:h-[96%] lg:right-4"
              height="1024"
              src={campaign.imageUrl}
              width="1024"
            />
          </a>
        ))}
      </div>

      <div
        className="mt-3 flex items-center justify-center gap-3"
        role="group"
        aria-label="Featured offer controls"
      >
        <button
          aria-label="Previous featured offer"
          className="grid size-9 place-items-center rounded-full border border-[#dce7e1] bg-white text-[#173f33] shadow-sm transition hover:border-[#9eb7aa] hover:bg-[#f5f8f6]"
          onClick={showPreviousCampaign}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={17} />
        </button>
        <div className="flex items-center gap-0.5">
          {DEFAULT_FEATURED_CAMPAIGNS.map((campaign, index) => (
            <button
              aria-label={`Show featured offer ${index + 1}: ${campaign.headline}`}
              aria-pressed={index === activeCampaignIndex}
              className="group/dot grid size-6 place-items-center rounded-full"
              key={campaign.id}
              onClick={() => setActiveCampaignIndex(index)}
              type="button"
            >
              <span
                className={`h-2.5 rounded-full transition-all ${
                  index === activeCampaignIndex
                    ? "w-8 bg-[#173f33]"
                    : "w-2.5 bg-[#cbd9d2] group-hover/dot:bg-[#9eb7aa]"
                }`}
              />
            </button>
          ))}
        </div>
        <button
          aria-label="Next featured offer"
          className="grid size-9 place-items-center rounded-full border border-[#dce7e1] bg-white text-[#173f33] shadow-sm transition hover:border-[#9eb7aa] hover:bg-[#f5f8f6]"
          onClick={showNextCampaign}
          type="button"
        >
          <ChevronRight aria-hidden="true" size={17} />
        </button>
      </div>
    </section>
  );
}
