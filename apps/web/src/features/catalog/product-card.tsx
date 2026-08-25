import type { CatalogCategoryResponse, CatalogSkuResponse } from "@carbon/contracts";
import { ImageIcon, Plus } from "lucide-react";
import { formatPhp } from "../../lib/format";
import { getCategoryName } from "./catalog-utils";
import { QuantityControl } from "./quantity-control";

export function ProductCard({
  categories,
  item,
  quantity,
  onAdd,
  pending = false,
  onQuantityChange,
}: Readonly<{
  categories: readonly CatalogCategoryResponse[];
  item: CatalogSkuResponse;
  quantity: number;
  onAdd: () => void;
  pending?: boolean;
  onQuantityChange: (quantity: number) => void;
}>) {
  return (
    <article className="w-[148px] shrink-0 sm:w-[184px]">
      <div className="group relative aspect-square overflow-hidden rounded-[var(--marketplace-radius-media)] bg-transparent">
        <a aria-label={`View ${item.name}`} className="block size-full" href={`/shop/${item.slug}`}>
          {item.imageUrl ? (
            <img
              alt={item.name}
              className="size-full rounded-[inherit] object-cover transition-transform duration-200 group-hover:scale-[1.04]"
              loading="lazy"
              src={item.imageUrl}
            />
          ) : (
            <span className="grid size-full place-items-center text-market-muted">
              <ImageIcon size={28} />
            </span>
          )}
        </a>
        {quantity > 0 ? (
          <div className="absolute bottom-2 right-2 rounded-full bg-white shadow-md">
            <QuantityControl
              label={`Quantity for ${item.name}`}
              onChange={onQuantityChange}
              quantity={quantity}
              disabled={pending}
            />
          </div>
        ) : (
          <button
            aria-label={`Add ${item.name} to cart`}
            className="absolute bottom-2 right-2 grid size-10 place-items-center rounded-full bg-white text-market-ink shadow-[0_4px_16px_rgba(22,22,22,0.14)] transition hover:bg-market-green hover:text-white"
            disabled={pending}
            onClick={onAdd}
            type="button"
          >
            <Plus size={19} />
          </button>
        )}
      </div>
      <div className="mt-2 min-w-0">
        <p className="!m-0 truncate text-[11px] font-semibold text-[var(--marketplace-text-secondary)]">
          {getCategoryName(categories, item.categoryId)}
        </p>
        <a
          className="block hover:text-[var(--marketplace-accent-strong)]"
          href={`/shop/${item.slug}`}
        >
          <h3 className="!m-0 mt-1 line-clamp-2 !text-sm font-bold leading-5">{item.name}</h3>
        </a>
        <p className="!m-0 mt-1 text-xs leading-4 text-[var(--marketplace-text-secondary)]">
          {item.unit}
        </p>
        <strong className="mt-1 block text-sm font-extrabold tabular-nums">
          {formatPhp(item.price.centavos)}
        </strong>
      </div>
    </article>
  );
}
