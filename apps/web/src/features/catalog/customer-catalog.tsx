"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type {
  CartResponse,
  CatalogCategoryResponse,
  CatalogSkuResponse,
  PlanResponse,
  SubscriptionResponse,
} from "@carbon/contracts";

import { Button, Dialog, EmptyState, ErrorState, Input } from "../../components/ui";
import { PublicAuthControls } from "../auth";
import { ChevronDown, Grid2X2, List, Search, SlidersHorizontal } from "lucide-react";
import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";
import {
  addCartQuantity,
  cartDraftFromResponse,
  parseCatalogQuery,
  setCartQuantity,
  toCartUpdateLines,
  type CatalogQueryOptions,
  type CartDraftLine,
} from "./catalog-utils";
import { CartSummary } from "./cart-summary";
import { ProductCard } from "./product-card";
import type { SessionSummary } from "../../lib/permissions";

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
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState(filters.sort);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
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

  const visibleItems = catalog.items;

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

  function changeSort(nextSort: typeof sort) {
    updateUrl({ ...activeFilters, sort: nextSort });
  }

  function applyPriceFilter() {
    const minimum = Number(minimumPrice);
    const maximum = Number(maximumPrice);
    updateUrl({
      ...activeFilters,
      ...(Number.isFinite(minimum) && minimum >= 0 ? { minPriceCentavos: minimum * 100 } : {}),
      ...(Number.isFinite(maximum) && maximum >= 0 ? { maxPriceCentavos: maximum * 100 } : {}),
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
          ? "We refreshed your cart with current prices and availability."
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
          setMessage(
            "Your cart changed elsewhere, so we refreshed it. Review the latest cart and retry.",
          );
          return;
        } catch {
          // Preserve the original mutation error when reconciliation also fails.
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
    } catch (error) {
      setMessage(
        error instanceof ApiClientError ? error.message : "We could not activate your plan.",
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

  const hasFilters = Boolean(
    activeFilters.search ||
    activeFilters.category ||
    activeFilters.minPriceCentavos !== undefined ||
    activeFilters.maxPriceCentavos !== undefined,
  );

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
                {new Intl.NumberFormat("en-PH", {
                  style: "currency",
                  currency: "PHP",
                }).format(plan.weeklyFee.centavos / 100)}{" "}
                per week
              </span>
              {planPending === plan.id ? (
                <span className="block text-sm">Activating...</span>
              ) : null}
            </button>
          ))}
        </div>
      </Dialog>
      <section className="mb-5 border-b border-market-line pb-5 lg:mb-6 lg:pb-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-market-green-dark">
              Carbon Market
            </p>
            <h2 className="!m-0 !text-[28px] font-black leading-[1.08] tracking-tight sm:!text-3xl">
              Fresh groceries, ready for your week
            </h2>
            <p className="mt-2 text-sm text-market-muted">
              Produce, herbs, and pantry staples delivered in one weekly box.
            </p>
          </div>
          <div className="hidden text-right text-xs text-market-muted sm:block">
            <strong className="block text-market-ink">Manila delivery</strong>Next available weekend
            window
          </div>
        </div>
        <div
          className="mt-4 flex gap-2 overflow-x-auto pb-1"
          aria-label="Product categories"
          role="tablist"
        >
          <button
            aria-selected={!activeFilters.category}
            className={`min-h-10 shrink-0 rounded-full px-4 py-2 text-xs font-bold ${!activeFilters.category ? "bg-market-ink text-white" : "bg-[#f3f5f3] text-[#4b5563]"}`}
            onClick={() => changeCategory("")}
            role="tab"
            type="button"
          >
            All groceries
          </button>
          {catalog.categories.map((category) => (
            <button
              aria-selected={activeFilters.category === category.slug}
              className={`min-h-10 shrink-0 rounded-full px-4 py-2 text-xs font-bold ${activeFilters.category === category.slug ? "bg-market-ink text-white" : "bg-[#f3f5f3] text-[#4b5563]"}`}
              key={category.id}
              onClick={() => changeCategory(category.slug)}
              role="tab"
              type="button"
            >
              {category.name}
            </button>
          ))}
        </div>
      </section>
      <div
        className={`grid gap-6 lg:items-start lg:gap-7 ${canEditCart ? "lg:grid-cols-[minmax(0,1fr)_18rem]" : "lg:grid-cols-1"}`}
      >
        <div className="min-w-0">
          <div className="mb-6 flex items-center justify-between border-b border-market-line pb-4 lg:mb-8">
            <p className="text-sm text-market-muted">
              Showing <strong className="text-market-ink">{visibleItems.length} results</strong>
            </p>
            <div className="hidden items-center gap-5 text-sm lg:flex">
              <label className="flex items-center gap-2">
                Sort:
                <select
                  aria-label="Sort products"
                  className="border-0 bg-transparent font-semibold outline-none"
                  onChange={(event) => changeSort(event.target.value as typeof sort)}
                  value={sort}
                >
                  <option value="popular">Most popular</option>
                  <option value="name">Name</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                </select>
                <ChevronDown size={15} />
              </label>
              <span>Show:</span>
              <button
                aria-label="Grid view"
                className={view === "grid" ? "text-market-green" : "text-market-muted"}
                onClick={() => setView("grid")}
                type="button"
              >
                <Grid2X2 size={20} />
              </button>
              <button
                aria-label="List view"
                className={view === "list" ? "text-market-green" : "text-market-muted"}
                onClick={() => setView("list")}
                type="button"
              >
                <List size={20} />
              </button>
            </div>
            <button
              className="flex items-center gap-2 text-sm font-bold text-market-green lg:hidden"
              onClick={() => setMobileFiltersOpen((open) => !open)}
              type="button"
            >
              <SlidersHorizontal size={18} /> Filters
            </button>
          </div>
          {mobileFiltersOpen ? (
            <div className="mb-5 rounded-xl border border-market-line bg-white p-4 lg:hidden">
              <label className="grid gap-2 text-sm font-semibold">
                Sort products
                <select
                  aria-label="Sort products"
                  className="rounded border border-market-line p-2"
                  onChange={(event) => changeSort(event.target.value as typeof sort)}
                  value={sort}
                >
                  <option value="popular">Most popular</option>
                  <option value="name">Name</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                </select>
              </label>
            </div>
          ) : null}

          {error ? (
            <ErrorState
              className="mt-6"
              description={error}
              onRetry={() => router.refresh()}
              title="Catalog temporarily unavailable"
            />
          ) : visibleItems.length === 0 ? (
            <EmptyState
              className="mt-6"
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
                  ? "Try another search or category."
                  : "Active items will appear here when the next catalog is published."
              }
              title={hasFilters ? "No items match your filters" : "The catalog is empty"}
            />
          ) : (
            <div
              className={`mt-6 grid gap-3 ${view === "list" ? "grid-cols-1" : `grid-cols-2 sm:grid-cols-3 ${canEditCart ? "xl:grid-cols-4 2xl:grid-cols-5" : "xl:grid-cols-5 2xl:grid-cols-6"}`}`}
            >
              {visibleItems.map((item) => (
                <ProductCard
                  categories={catalog.categories}
                  item={item}
                  key={item.id}
                  quantity={lines.find((line) => line.skuId === item.id)?.quantity ?? 0}
                  onAdd={() => {
                    requestAdd(item.id);
                  }}
                  pending={saving && pendingSku === item.id}
                  view={view}
                  onQuantityChange={(quantity) =>
                    void mutateCart(setCartQuantity(lines, item.id, quantity), item.id)
                  }
                />
              ))}
            </div>
          )}
          {nextCursor ? (
            <a
              className="mt-6 inline-flex rounded border border-market-line px-4 py-2 text-sm font-semibold hover:border-market-green"
              href={`/shop?${new URLSearchParams({
                ...(activeFilters.search ? { search: activeFilters.search } : {}),
                ...(activeFilters.category ? { category: activeFilters.category } : {}),
                ...(activeFilters.sort !== "popular" ? { sort: activeFilters.sort } : {}),
                ...(activeFilters.minPriceCentavos !== undefined
                  ? { minPrice: String(activeFilters.minPriceCentavos / 100) }
                  : {}),
                ...(activeFilters.maxPriceCentavos !== undefined
                  ? { maxPrice: String(activeFilters.maxPriceCentavos / 100) }
                  : {}),
                cursor: nextCursor,
              }).toString()}`}
            >
              Load more products
            </a>
          ) : null}
        </div>

        <div className={canEditCart ? "grid gap-5" : "hidden"}>
          <aside className="hidden border-l border-market-line pl-5 lg:block">
            <form className="relative mb-7 flex" onSubmit={submitSearch} role="search">
              <Input
                aria-label="Sidebar search"
                className="h-12 rounded-full border-market-green pr-12"
                placeholder="Fresh Vegetable"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
              <button
                aria-label="Search sidebar"
                className="absolute right-3 top-3 text-market-green"
                type="submit"
              >
                <Search size={20} />
              </button>
            </form>
            <h2 className="border-b border-market-line pb-3 text-xl font-bold">Filter by Price</h2>
            <div className="my-5 grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-xs text-market-muted">
                Minimum (PHP)
                <input
                  className="min-w-0 rounded border border-market-line px-3 py-2 text-market-ink"
                  min="0"
                  onChange={(event) => setMinimumPrice(event.target.value)}
                  type="number"
                  value={minimumPrice}
                />
              </label>
              <label className="grid gap-1 text-xs text-market-muted">
                Maximum (PHP)
                <input
                  className="min-w-0 rounded border border-market-line px-3 py-2 text-market-ink"
                  min="0"
                  onChange={(event) => setMaximumPrice(event.target.value)}
                  type="number"
                  value={maximumPrice}
                />
              </label>
            </div>
            <div className="mb-7 flex items-center justify-between">
              <button
                className="rounded-full bg-market-green px-5 py-2 text-sm font-bold text-white"
                onClick={applyPriceFilter}
                type="button"
              >
                Apply
              </button>
              <button
                className="text-sm underline"
                onClick={() => {
                  setMinimumPrice("");
                  setMaximumPrice("");
                  updateUrl({
                    search: activeFilters.search,
                    category: activeFilters.category,
                    sort: activeFilters.sort,
                    ...(activeFilters.cursor ? { cursor: activeFilters.cursor } : {}),
                  });
                }}
                type="button"
              >
                Clear
              </button>
            </div>
            <h2 className="border-b border-market-line pb-3 text-xl font-bold">
              Filter by Categories
            </h2>
            <ul className="mt-4 grid gap-3 text-sm">
              {catalog.categories.map((category) => (
                <li key={category.id}>
                  <button
                    className="flex w-full items-center justify-between text-left"
                    onClick={() => changeCategory(category.slug)}
                    type="button"
                  >
                    <span className="flex items-center gap-2">
                      <span className="size-5 rounded-full border border-market-line" />
                      {category.name}
                    </span>
                    <span className="text-market-muted">
                      (
                      {catalog.items
                        .filter((item) => item.categoryId === category.id)
                        .length.toString()
                        .padStart(2, "0")}
                      )
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <CartSummary
            cart={savedCart}
            catalog={catalog.items}
            lines={lines}
            message={message}
            onQuantityChange={(skuId, quantity) =>
              void mutateCart(setCartQuantity(lines, skuId, quantity), skuId)
            }
            {...(retryLines ? { onRetry: () => void mutateCart(retryLines) } : {})}
            pending={saving}
            canEdit={canEditCart}
          />
        </div>
      </div>
      {canEditCart && lines.length ? (
        <a
          className="fixed inset-x-4 bottom-[4.6rem] z-20 mx-auto flex min-h-12 max-w-md items-center justify-between rounded-full bg-[#14532d] px-5 py-3 text-sm font-bold !text-white shadow-xl lg:hidden"
          href="/account/cart"
        >
          <span>{lines.reduce((total, line) => total + line.quantity, 0)} items</span>
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
