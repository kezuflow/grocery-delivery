import type { CartResponse, CatalogCategoryResponse, CatalogSkuResponse } from "@carbon/contracts";

export type CatalogFilters = Readonly<{ search: string; category: string }>;
export type CatalogSearchParams = Readonly<Record<string, string | string[] | undefined>>;
export type CartDraftLine = Readonly<{ skuId: string; quantity: number }>;

export function parseCatalogFilters(params: CatalogSearchParams): CatalogFilters {
  return {
    search: firstValue(params.search).trim(),
    category: firstValue(params.category).trim().toLowerCase(),
  };
}

export function filterCatalogItems(
  items: readonly CatalogSkuResponse[],
  categories: readonly CatalogCategoryResponse[],
  filters: CatalogFilters,
): readonly CatalogSkuResponse[] {
  const categoryIds = new Set(
    categories
      .filter((category) => category.slug === filters.category)
      .map((category) => category.id),
  );
  const search = filters.search.toLowerCase();

  return items.filter((item) => {
    if (!item.active) return false;
    const matchesCategory = !filters.category || categoryIds.has(item.categoryId);
    const searchableText = `${item.name} ${item.description} ${item.slug}`.toLowerCase();
    return matchesCategory && (!search || searchableText.includes(search));
  });
}

export function getCategoryName(
  categories: readonly CatalogCategoryResponse[],
  categoryId: string,
): string {
  return categories.find((category) => category.id === categoryId)?.name ?? "Catalog";
}

export function cartDraftFromResponse(cart: CartResponse["data"]): CartDraftLine[] {
  return cart.lines.map(({ skuId, quantity }) => ({ skuId, quantity }));
}

export function setCartQuantity(
  lines: readonly CartDraftLine[],
  skuId: string,
  quantity: number,
): CartDraftLine[] {
  const safeQuantity = Number.isFinite(quantity)
    ? Math.min(1_000, Math.max(0, Math.floor(quantity)))
    : 0;
  return lines
    .map((line) => (line.skuId === skuId ? { ...line, quantity: safeQuantity } : line))
    .filter((line) => line.quantity > 0);
}

export function addCartQuantity(lines: readonly CartDraftLine[], skuId: string): CartDraftLine[] {
  const existing = lines.find((line) => line.skuId === skuId);
  if (!existing) return [...lines, { skuId, quantity: 1 }];
  return setCartQuantity(lines, skuId, existing.quantity + 1);
}

export function toCartUpdateLines(lines: readonly CartDraftLine[]) {
  return lines.map(({ skuId, quantity }) => ({ skuId, quantity }));
}

export function cartDraftHasChanged(
  lines: readonly CartDraftLine[],
  cart: CartResponse["data"],
): boolean {
  if (lines.length !== cart.lines.length) return true;
  const savedQuantities = new Map(cart.lines.map((line) => [line.skuId, line.quantity]));
  return lines.some((line) => savedQuantities.get(line.skuId) !== line.quantity);
}

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
