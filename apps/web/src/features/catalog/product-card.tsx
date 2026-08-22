import type { CatalogCategoryResponse, CatalogSkuResponse } from "@carbon/contracts";

import { Button } from "../../components/ui";
import { formatPhp } from "../../lib/format";
import { getCategoryName } from "./catalog-utils";
import { QuantityControl } from "./quantity-control";

export function ProductCard({
  categories,
  item,
  quantity,
  onAdd,
  onQuantityChange,
}: Readonly<{
  categories: readonly CatalogCategoryResponse[];
  item: CatalogSkuResponse;
  quantity: number;
  onAdd: () => void;
  onQuantityChange: (quantity: number) => void;
}>) {
  return (
    <article className="grid gap-3 overflow-hidden rounded-2xl border border-market-line bg-white shadow-[0_2px_12px_rgba(17,24,39,0.04)]">
      <div className="aspect-square bg-market-soft">
        {item.imageUrl ? (
          <img
            alt={item.name}
            className="size-full object-cover"
            loading="lazy"
            src={item.imageUrl}
          />
        ) : (
          <div className="grid size-full place-items-center px-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-market-muted">
            Fresh this week
          </div>
        )}
      </div>
      <div className="grid gap-2.5 p-4 pt-0 sm:p-5 sm:pt-0">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-[#6b7280]">
            {getCategoryName(categories, item.categoryId)}
          </p>
          <span className="text-[11px] font-bold text-market-green-dark">Available</span>
        </div>
        <h2 className="line-clamp-2 text-base font-bold sm:text-lg">{item.name}</h2>
        <p className="line-clamp-2 min-h-10 text-xs leading-5 text-market-muted sm:text-sm">
          {item.description}
        </p>
        <div className="flex items-end justify-between gap-3">
          <div>
            <strong className="text-base sm:text-lg">{formatPhp(item.price.centavos)}</strong>
            <span className="ml-1 text-[11px] text-market-muted">/ {item.unit}</span>
          </div>
          {quantity > 0 ? (
            <QuantityControl
              label={`Quantity for ${item.name}`}
              onChange={onQuantityChange}
              quantity={quantity}
            />
          ) : (
            <Button
              className="rounded-full bg-market-green px-4 hover:bg-market-green-dark"
              onClick={onAdd}
              size="sm"
              type="button"
            >
              Add to cart
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
