import type { CatalogCategoryResponse, CatalogSkuResponse } from "@carbon/contracts";
import { ImageIcon, PackageCheck, Plus } from "lucide-react";

import { Button } from "../../components/ui";
import { formatPhp } from "../../lib/format";
import { getCategoryName } from "./catalog-utils";
import { QuantityControl } from "./quantity-control";

export function ProductCard({
  categories,
  item,
  quantity,
  onAdd,
  pending = false,
  view = "grid",
  onQuantityChange,
}: Readonly<{
  categories: readonly CatalogCategoryResponse[];
  item: CatalogSkuResponse;
  quantity: number;
  onAdd: () => void;
  pending?: boolean;
  view?: "grid" | "list";
  onQuantityChange: (quantity: number) => void;
}>) {
  return (
    <article
      className={`group overflow-hidden border-b border-r border-market-line bg-white ${view === "list" ? "grid gap-4 p-4 sm:grid-cols-[12rem_1fr]" : "grid gap-3"}`}
    >
      <div
        className={`relative bg-market-soft ${view === "list" ? "aspect-square" : "aspect-square"}`}
      >
        {item.imageUrl ? (
          <img
            alt={item.name}
            className="size-full object-cover"
            loading="lazy"
            src={item.imageUrl}
          />
        ) : (
          <div className="grid size-full place-items-center px-4 text-center text-market-muted">
            <span className="grid justify-items-center gap-2 text-xs">
              <ImageIcon size={34} strokeWidth={1.5} />
              No image preview
            </span>
          </div>
        )}
      </div>
      <div className="grid gap-2.5 p-4 sm:p-5 sm:pt-4">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-[#6b7280]">
            {getCategoryName(categories, item.categoryId)}
          </p>
          <span className="flex items-center gap-1 text-[11px] font-bold text-market-green-dark">
            <PackageCheck size={14} /> In stock
          </span>
        </div>
        <h2 className="line-clamp-2 text-base font-bold sm:text-lg">
          <a className="hover:text-market-green-dark" href={`/shop/${item.slug}`}>
            {item.name}
          </a>
        </h2>
        <p className="line-clamp-2 min-h-10 text-xs leading-5 text-market-muted sm:text-sm">
          {item.description}
        </p>
        <div className="flex items-end justify-between gap-3">
          <div>
            <strong className="text-base text-coral sm:text-lg">
              {formatPhp(item.price.centavos)}
            </strong>
            <span className="ml-1 text-[11px] text-market-muted">/ {item.unit}</span>
          </div>
          {quantity > 0 ? (
            <QuantityControl
              label={`Quantity for ${item.name}`}
              onChange={onQuantityChange}
              quantity={quantity}
              disabled={pending}
            />
          ) : (
            <Button
              aria-label={`Add ${item.name} to cart`}
              className="size-10 rounded-full bg-market-green p-0 hover:bg-market-green-dark"
              onClick={onAdd}
              disabled={pending}
              size="sm"
              type="button"
            >
              <Plus size={22} />
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
