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
    <article className="w-[108px] shrink-0 sm:w-[156px]">
      <div className="group relative aspect-square overflow-hidden rounded-md bg-[#f7f7f7]">
        {item.imageUrl ? (
          <img
            alt={item.name}
            className="size-full object-contain p-2 transition-transform duration-200 group-hover:scale-[1.04]"
            loading="lazy"
            src={item.imageUrl}
          />
        ) : (
          <div className="grid size-full place-items-center text-market-muted">
            <ImageIcon size={28} />
          </div>
        )}
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
            className="absolute bottom-2 right-2 grid size-8 place-items-center rounded-full bg-white text-market-ink shadow-md transition hover:bg-market-green hover:text-white"
            disabled={pending}
            onClick={onAdd}
            type="button"
          >
            <Plus size={19} />
          </button>
        )}
      </div>
      <div className="mt-2 min-w-0">
        <p className="!m-0 truncate text-[11px] font-semibold text-market-muted">
          {getCategoryName(categories, item.categoryId)}
        </p>
        <h3 className="!m-0 mt-0.5 line-clamp-2 !text-[13px] font-semibold leading-4">
          {item.name}
        </h3>
        <p className="!m-0 mt-1 text-[12px] leading-4 text-market-muted">{item.unit}</p>
        <strong className="mt-1 block text-[13px] font-bold">
          {formatPhp(item.price.centavos)}
        </strong>
      </div>
    </article>
  );
}
