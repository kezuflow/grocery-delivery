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
    <article className="grid gap-4 overflow-hidden border border-line bg-white">
      <div className="aspect-[4/3] bg-accent/20">
        {item.imageUrl ? (
          <img
            alt={item.name}
            className="size-full object-cover"
            loading="lazy"
            src={item.imageUrl}
          />
        ) : (
          <div className="grid size-full place-items-center text-xs font-bold uppercase tracking-[0.16em] text-muted">
            Available this week
          </div>
        )}
      </div>
      <div className="grid gap-3 p-5 pt-0">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
            {getCategoryName(categories, item.categoryId)}
          </p>
          <span className="text-xs font-bold text-success">Available</span>
        </div>
        <h2 className="text-xl font-bold">{item.name}</h2>
        <p className="min-h-12 text-sm leading-6 text-muted">{item.description}</p>
        <div className="flex items-end justify-between gap-3">
          <div>
            <strong className="text-lg">{formatPhp(item.price.centavos)}</strong>
            <span className="ml-1 text-xs text-muted">/ {item.unit}</span>
          </div>
          {quantity > 0 ? (
            <QuantityControl
              label={`Quantity for ${item.name}`}
              onChange={onQuantityChange}
              quantity={quantity}
            />
          ) : (
            <Button onClick={onAdd} size="sm" type="button">
              Add
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
