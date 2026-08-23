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
      className={`group overflow-hidden rounded-lg bg-white ${view === "list" ? "grid gap-4 p-4 shadow-sm ring-1 ring-market-line sm:grid-cols-[12rem_1fr]" : "grid gap-2 ring-1 ring-[#edf0ed]"}`}
    >
      <div
        className={`relative bg-[#f6f8f4] ${view === "list" ? "aspect-square" : "aspect-square"}`}
      >
        {item.imageUrl ? (
          <img
            alt={item.name}
            className="size-full object-contain p-3 mix-blend-multiply transition-transform duration-200 group-hover:scale-[1.03]"
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
      <div className="grid gap-2 p-3 sm:p-4 sm:pt-3">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[#4b5563]">
            {getCategoryName(categories, item.categoryId)}
          </p>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-market-green-dark">
            <PackageCheck size={14} /> In stock
          </span>
        </div>
        <h2 className="!m-0 line-clamp-2 !text-sm font-bold leading-5 sm:!text-base">
          <a className="hover:text-market-green-dark" href={`/shop/${item.slug}`}>
            {item.name}
          </a>
        </h2>
        <p className="line-clamp-2 min-h-9 text-[11px] leading-4 text-market-muted sm:text-xs">
          {item.description}
        </p>
        <div className="flex items-end justify-between gap-3">
          <div>
            <strong className="text-sm font-black text-market-ink sm:text-base">
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
              className="size-9 rounded-full bg-market-green-dark p-0 text-white shadow-sm hover:bg-market-green"
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
