"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { CartResponse, CatalogCategoryResponse, CatalogSkuResponse } from "@carbon/contracts";

import { Button, EmptyState, ErrorState, Input } from "../../components/ui";
import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";
import {
  addCartQuantity,
  cartDraftFromResponse,
  filterCatalogItems,
  parseCatalogFilters,
  setCartQuantity,
  toCartUpdateLines,
  type CatalogFilters,
  type CartDraftLine,
} from "./catalog-utils";
import { CartSummary } from "./cart-summary";
import { ProductCard } from "./product-card";

export function CustomerCatalog({
  catalog,
  cart,
  error,
  filters,
}: Readonly<{
  catalog: Readonly<{
    categories: readonly CatalogCategoryResponse[];
    items: readonly CatalogSkuResponse[];
  }>;
  cart: CartResponse["data"];
  error: string | null;
  filters: CatalogFilters;
}>) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(filters.search);
  const [activeFilters, setActiveFilters] = useState(filters);
  const [lines, setLines] = useState<CartDraftLine[]>(() => cartDraftFromResponse(cart));
  const [savedCart, setSavedCart] = useState(cart);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setLines(cartDraftFromResponse(cart));
    setSavedCart(cart);
  }, [cart]);

  useEffect(() => {
    function restoreFilters() {
      const restored = parseCatalogFilters(
        Object.fromEntries(new URLSearchParams(window.location.search)),
      );
      setActiveFilters(restored);
      setSearchInput(restored.search);
    }

    window.addEventListener("popstate", restoreFilters);
    return () => window.removeEventListener("popstate", restoreFilters);
  }, []);

  const visibleItems = useMemo(
    () => filterCatalogItems(catalog.items, catalog.categories, activeFilters),
    [activeFilters, catalog.categories, catalog.items],
  );

  function updateUrl(nextFilters: CatalogFilters) {
    const params = new URLSearchParams();
    if (nextFilters.search) params.set("search", nextFilters.search);
    if (nextFilters.category) params.set("category", nextFilters.category);
    const query = params.toString();
    window.history.pushState(null, "", `/shop${query ? `?${query}` : ""}`);
    setActiveFilters(nextFilters);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateUrl({ ...activeFilters, search: searchInput.trim() });
  }

  function changeCategory(category: string) {
    updateUrl({ ...activeFilters, category });
  }

  async function saveCart() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await createApiClient(createSameOriginApiTransport()).updateCart({
        lines: toCartUpdateLines(lines),
      });
      setLines(cartDraftFromResponse(response.data));
      setSavedCart(response.data);
      setMessage("Your saved cart is up to date.");
    } catch (saveError) {
      setMessage(
        saveError instanceof ApiClientError ? saveError.message : "We could not update your cart.",
      );
    } finally {
      setSaving(false);
    }
  }

  const hasFilters = Boolean(activeFilters.search || activeFilters.category);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-8">
      <div className="min-w-0">
        <div className="grid gap-4">
          <form className="relative flex" onSubmit={submitSearch} role="search">
            <Input
              aria-label="Search catalog"
              className="h-12 rounded-full border-market-line bg-white pl-5 pr-24 shadow-sm"
              id="catalog-search"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search produce, pantry, and more"
              type="search"
              value={searchInput}
            />
            <Button
              className="absolute right-1 top-1 h-10 rounded-full bg-market-green px-5 hover:bg-market-green-dark"
              size="sm"
              type="submit"
            >
              Search
            </Button>
          </form>
          <div
            className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
            aria-label="Product categories"
            role="tablist"
          >
            <button
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${!activeFilters.category ? "bg-market-green text-white" : "bg-white text-[#4b5563] ring-1 ring-market-line"}`}
              onClick={() => changeCategory("")}
              role="tab"
              aria-selected={!activeFilters.category}
              type="button"
            >
              All
            </button>
            {catalog.categories.map((category) => (
              <button
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${activeFilters.category === category.slug ? "bg-market-green text-white" : "bg-white text-[#4b5563] ring-1 ring-market-line"}`}
                key={category.id}
                onClick={() => changeCategory(category.slug)}
                role="tab"
                aria-selected={activeFilters.category === category.slug}
                type="button"
              >
                {category.name}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between border-b border-market-line pb-4">
            <p className="text-sm font-semibold text-[#374151]">Fresh picks for your week</p>
            <p className="text-sm text-market-muted" role="status">
              {visibleItems.length} {visibleItems.length === 1 ? "item" : "items"}
            </p>
          </div>
        </div>

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
                    updateUrl({ search: "", category: "" });
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
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleItems.map((item) => (
              <ProductCard
                categories={catalog.categories}
                item={item}
                key={item.id}
                quantity={lines.find((line) => line.skuId === item.id)?.quantity ?? 0}
                onAdd={() => setLines((current) => addCartQuantity(current, item.id))}
                onQuantityChange={(quantity) =>
                  setLines((current) => setCartQuantity(current, item.id, quantity))
                }
              />
            ))}
          </div>
        )}
      </div>

      <CartSummary
        cart={savedCart}
        catalog={catalog.items}
        lines={lines}
        message={message}
        onQuantityChange={(skuId, quantity) =>
          setLines((current) => setCartQuantity(current, skuId, quantity))
        }
        onSave={() => void saveCart()}
        pending={saving}
      />
    </div>
  );
}
