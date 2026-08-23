"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CartResponse,
  CatalogCategoryResponse,
  CatalogSkuResponse,
  PlanResponse,
  SubscriptionResponse,
} from "@carbon/contracts";
import { ChevronRight, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { Button, Dialog, EmptyState, ErrorState } from "../../components/ui";
import { PublicAuthControls } from "../auth";
import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";
import type { SessionSummary } from "../../lib/permissions";
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
  catalog,
  cart,
  error,
  filters,
  plans,
  nextCursor,
  session,
  subscription,
}: Readonly<{
  catalog: Readonly<{
    categories: readonly CatalogCategoryResponse[];
    items: readonly CatalogSkuResponse[];
  }>;
  nextCursor: string | null;
  cart: CartResponse["data"];
  error: string | null;
  filters: CatalogQueryOptions;
  plans: readonly PlanResponse["data"][];
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
  const [planOpen, setPlanOpen] = useState(false);
  const [pendingAddSku, setPendingAddSku] = useState<string | null>(null);
  const [planPending, setPlanPending] = useState<string | null>(null);
  const canEditCart = session?.role === "customer";
  const hasActiveSubscription = subscription?.status === "active";

  useEffect(() => {
    setLines(cartDraftFromResponse(cart));
    setSavedCart(cart);
  }, [cart]);
  useEffect(() => {
    if (!pendingAddSku || !canEditCart) return;
    if (!hasActiveSubscription) {
      setPlanOpen(true);
      return;
    }
    void mutateCart(addCartQuantity(lines, pendingAddSku), pendingAddSku);
    setPendingAddSku(null);
  }, [canEditCart, hasActiveSubscription, pendingAddSku]);
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
  function changeCategory(category: string) {
    updateUrl({ ...activeFilters, category });
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
  async function activatePlan(planId: string) {
    setPlanPending(planId);
    setMessage(null);
    try {
      await createApiClient(createSameOriginApiTransport()).activateFreeTrial(
        { planId },
        crypto.randomUUID(),
      );
      setPlanOpen(false);
      if (pendingAddSku) {
        void mutateCart(addCartQuantity(lines, pendingAddSku), pendingAddSku);
        setPendingAddSku(null);
      }
      router.refresh();
    } catch (activationError) {
      setMessage(
        activationError instanceof ApiClientError
          ? activationError.message
          : "We could not activate your plan.",
      );
    } finally {
      setPlanPending(null);
    }
  }
  function requestAdd(skuId: string) {
    setPendingAddSku(skuId);
    if (!canEditCart) {
      setMessage("Sign in to add items to your cart.");
      setAuthOpen(true);
      return;
    }
    if (!hasActiveSubscription) {
      setPlanOpen(true);
      return;
    }
    void mutateCart(addCartQuantity(lines, skuId), skuId);
    setPendingAddSku(null);
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
  const cartCount = lines.reduce((total, line) => total + line.quantity, 0);

  return (
    <>
      {!canEditCart ? (
        <PublicAuthControls
          onAuthenticated={() => router.refresh()}
          onOpenChange={setAuthOpen}
          open={authOpen}
          redirectAfterAuth={false}
          session={null}
          showTriggers={false}
        />
      ) : null}
      <Dialog
        description="Choose an active plan before adding your first item. Your first calendar month is free."
        onClose={() => setPlanOpen(false)}
        open={planOpen}
        title="Choose your weekly plan"
      >
        <div className="grid gap-3">
          {plans.map((plan) => (
            <button
              className="rounded border border-market-line px-4 py-3 text-left hover:border-market-green"
              disabled={planPending !== null}
              key={plan.id}
              onClick={() => void activatePlan(plan.id)}
              type="button"
            >
              <strong className="block">{plan.name}</strong>
              <span className="text-sm text-market-muted">
                {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
                  plan.weeklyFee.centavos / 100,
                )}{" "}
                per week
              </span>
              {planPending === plan.id ? (
                <span className="block text-sm">Activating...</span>
              ) : null}
            </button>
          ))}
        </div>
      </Dialog>

      <section className="mb-5 lg:hidden">
        <h1 className="!m-0 !text-[22px] font-extrabold leading-tight tracking-[-0.025em]">
          Carbon Groceries
        </h1>
        <p className="mt-1 text-xs text-market-muted">4.8 ★ · Weekly delivery · Manila</p>
      </section>

      <section className="mb-7 overflow-hidden rounded-lg bg-[#e8f5ed] lg:mb-8">
        <div className="flex min-h-28 items-center justify-between gap-5 px-5 py-5 sm:px-7">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#087443]">
              <Sparkles size={14} /> This week
            </div>
            <h2 className="!m-0 !text-xl font-extrabold tracking-[-0.02em] sm:!text-2xl">
              Build your box and save
            </h2>
            <p className="mt-1 text-xs text-[#52675d] sm:text-sm">
              Fresh picks delivered in your next available window.
            </p>
          </div>
          <a
            className="hidden shrink-0 rounded-full bg-black px-4 py-2 text-xs font-bold !text-white sm:inline-flex"
            href="#best-sellers"
          >
            Shop now
          </a>
        </div>
      </section>

      <div className="sticky top-[68px] z-20 -mx-4 mb-6 border-y border-[#ededed] bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:top-16 lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
          <button
            aria-pressed={!activeFilters.category}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${!activeFilters.category ? "bg-black text-white" : "bg-[#f2f2f2]"}`}
            onClick={() => changeCategory("")}
            type="button"
          >
            Shop
          </button>
          {catalog.categories.map((category) => (
            <button
              aria-pressed={activeFilters.category === category.slug}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${activeFilters.category === category.slug ? "bg-black text-white" : "bg-[#f2f2f2]"}`}
              key={category.id}
              onClick={() => changeCategory(category.slug)}
              type="button"
            >
              {category.name}
            </button>
          ))}
          <details className="relative shrink-0">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full bg-[#f2f2f2] px-4 py-2 text-xs font-semibold">
              <SlidersHorizontal size={14} /> Filters
            </summary>
            <div className="absolute right-0 top-11 z-30 w-72 rounded-xl border border-[#ddd] bg-white p-4 shadow-xl">
              <label className="grid gap-1 text-xs font-semibold">
                Sort
                <select
                  aria-label="Sort products"
                  className="rounded border border-[#ddd] p-2 text-sm"
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
                    className="min-w-0 rounded border border-[#ddd] px-2 py-2"
                    min="0"
                    onChange={(event) => setMinimumPrice(event.target.value)}
                    type="number"
                    value={minimumPrice}
                  />
                </label>
                <label className="grid gap-1 text-xs">
                  Max PHP
                  <input
                    className="min-w-0 rounded border border-[#ddd] px-2 py-2"
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

      {activeFilters.search ? (
        <form className="mb-6 flex max-w-xl gap-2" onSubmit={submitSearch} role="search">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search products</span>
            <Search className="absolute left-3 top-3 text-market-muted" size={16} />
            <input
              className="h-10 w-full rounded-full bg-[#f3f3f3] pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-market-green"
              onChange={(event) => setSearchInput(event.target.value)}
              value={searchInput}
            />
          </label>
          <Button size="sm" type="submit">
            Search
          </Button>
        </form>
      ) : null}

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
          className="mb-8 inline-flex rounded-full bg-[#f2f2f2] px-5 py-2.5 text-sm font-bold"
          href={`/shop?${new URLSearchParams({ ...(activeFilters.search ? { search: activeFilters.search } : {}), ...(activeFilters.category ? { category: activeFilters.category } : {}), ...(activeFilters.sort !== "popular" ? { sort: activeFilters.sort } : {}), cursor: nextCursor }).toString()}`}
        >
          Load more
        </a>
      ) : null}
      {message ? (
        <div
          className="fixed bottom-24 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-lg bg-[#222] px-4 py-3 text-xs text-white shadow-xl lg:bottom-6"
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
  return (
    <section className="min-w-0" {...(id ? { id } : {})}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="!m-0 !text-lg font-extrabold tracking-[-0.02em] sm:!text-xl">{title}</h2>
        <a className="flex items-center gap-1 text-xs font-semibold" href="#top">
          See all <ChevronRight size={15} />
        </a>
      </div>
      <div className="flex max-w-full gap-3 overflow-x-auto pb-3 [scrollbar-width:none] sm:gap-4">
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
