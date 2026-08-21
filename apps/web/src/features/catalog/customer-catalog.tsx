"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { CartResponse, CatalogCategoryResponse, CatalogSkuResponse } from "@carbon/contracts";

import { Button, EmptyState, ErrorState, Input, Select } from "../../components/ui";
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
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="min-w-0">
        <div className="grid gap-4 border-b border-line pb-6">
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={submitSearch} role="search">
            <Input
              aria-label="Search catalog"
              className="flex-1"
              id="catalog-search"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search produce, pantry, and more"
              type="search"
              value={searchInput}
            />
            <Button size="md" type="submit">
              Search
            </Button>
          </form>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <Select
              aria-label="Filter by category"
              className="sm:max-w-xs"
              id="catalog-category"
              label="Category"
              onChange={(event) => changeCategory(event.target.value)}
              value={activeFilters.category}
            >
              <option value="">All categories</option>
              {catalog.categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </Select>
            <p className="text-sm text-muted" role="status">
              {visibleItems.length} available {visibleItems.length === 1 ? "item" : "items"}
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
