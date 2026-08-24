"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ActivePromotionBannersResponse,
  CartResponse,
  CatalogCategoryResponse,
  CatalogSkuResponse,
  SubscriptionResponse,
} from "@carbon/contracts";
import { ArrowRight, ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
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
  const [searchInput, setSearchInput] = useState(filters.search);
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
      setSearchInput(restored.search);
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
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateUrl({ ...activeFilters, search: searchInput.trim() });
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
      <section aria-labelledby="freshmarkets-prompt" className="mb-8 max-w-2xl">
        <h2
          className="!m-0 text-[28px] font-extrabold leading-tight tracking-normal sm:text-[34px]"
          id="freshmarkets-prompt"
        >
          Crave it? Get it.
        </h2>
        <form
          className="mt-5 flex items-center gap-3 border-b-2 border-market-ink pb-2"
          onSubmit={submitSearch}
          role="search"
        >
          <Search className="shrink-0 text-market-muted" size={19} />
          <label className="sr-only" htmlFor="freshmarkets-search">
            Search freshmarkets
          </label>
          <input
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-market-muted"
            id="freshmarkets-search"
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search for vegetables, healthy food, or a dish"
            value={searchInput}
          />
          <button
            aria-label="Search freshmarkets"
            className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-base-surface"
            title="Search freshmarkets"
            type="submit"
          >
            <ArrowRight size={18} />
          </button>
        </form>
      </section>
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
                  setSearchInput("");
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

function MerchandisingRail({
  banners,
}: Readonly<{
  banners: ActivePromotionBannersResponse["data"]["banners"];
}>) {
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

  return (
    <section aria-label="Featured offers" className="mb-10 scroll-mt-24" id="featured-offers">
      <a
        className="group relative isolate flex min-h-[320px] overflow-hidden rounded-[28px] bg-[#ff3f8f] px-6 py-7 text-white shadow-[0_22px_60px_rgba(139,19,71,0.18)] sm:min-h-[330px] sm:items-center sm:px-10 sm:py-9 lg:px-14"
        href="/shop?sort=popular"
      >
        <span
          aria-hidden="true"
          className="absolute -left-14 -top-20 size-52 rounded-full bg-[#ff87b8]/70 blur-sm"
        />
        <span
          aria-hidden="true"
          className="absolute -bottom-28 left-[37%] size-72 rounded-full bg-[#ffc6dc]/55"
        />
        <span
          aria-hidden="true"
          className="absolute right-[8%] top-5 size-16 rounded-full border-[14px] border-[#ffb5d2]/55 transition-transform duration-300 group-hover:rotate-12"
        />
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 z-[15] w-[68%] bg-gradient-to-r from-[#ff3f8f] via-[#ff3f8f]/95 to-transparent sm:hidden"
        />

        <div className="relative z-20 flex w-[61%] max-w-[520px] flex-col items-start sm:w-[52%]">
          <span className="inline-flex rounded-full bg-[#143f31] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white sm:text-xs">
            First order only
          </span>
          <h2 className="!m-0 mt-4 flex flex-col font-black tracking-[-0.055em] text-white">
            <span className="text-[clamp(3.15rem,7vw,5.75rem)] leading-[0.82]">40% off</span>
            <span className="mt-3 max-w-[10ch] text-[clamp(1.55rem,3.4vw,2.6rem)] leading-[0.92]">
              your first
              <br />
              order
            </span>
          </h2>
          <p className="mt-4 max-w-[21ch] text-xs font-bold leading-5 text-[#102c24] sm:max-w-[32ch] sm:text-sm">
            A bright welcome to the weekly market. Eligibility and savings are confirmed at
            checkout.
          </p>
          <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#fff8ed] px-4 py-2.5 text-xs font-extrabold text-[#163d30] shadow-sm transition-transform group-hover:translate-x-1 sm:px-5 sm:text-sm">
            Shop the offer <ChevronRight size={16} />
          </span>
        </div>

        <img
          alt="A cheerful shopper holding fresh groceries beside Carbon's sprout mascot"
          className="pointer-events-none absolute -bottom-[6%] -right-[15%] z-10 w-[74%] max-w-[570px] object-contain transition-transform duration-300 group-hover:scale-[1.025] sm:-right-[2%] sm:bottom-auto sm:top-[-5%] sm:w-[44%] lg:right-[2%] lg:w-[45%]"
          height="1024"
          src="/marketplace/first-order-campaign.webp"
          width="1024"
        />
      </a>
    </section>
  );
}
