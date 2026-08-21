import type { CartResponse, CatalogSkuResponse } from "@carbon/contracts";

import { Button, LinkButton } from "../../components/ui";
import { formatPhp } from "../../lib/format";
import { cartDraftHasChanged, type CartDraftLine } from "./catalog-utils";
import { QuantityControl } from "./quantity-control";

export function CartSummary({
  cart,
  catalog,
  lines,
  message,
  onQuantityChange,
  onSave,
  pending,
}: Readonly<{
  cart: CartResponse["data"];
  catalog: readonly CatalogSkuResponse[];
  lines: readonly CartDraftLine[];
  message: string | null;
  onQuantityChange: (skuId: string, quantity: number) => void;
  onSave: () => void;
  pending: boolean;
}>) {
  const names = new Map(catalog.map((item) => [item.id, item.name]));
  const hasUnsavedChanges = cartDraftHasChanged(lines, cart);

  return (
    <aside className="border border-line bg-white p-5 lg:sticky lg:top-6">
      <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Your cart</p>
          <h2 className="mt-2 text-2xl font-bold">Ready for the week?</h2>
        </div>
        <span className="text-sm text-muted">{lines.length} lines</span>
      </div>
      {lines.length ? (
        <ul className="grid divide-y divide-line">
          {lines.map((line) => (
            <li className="flex items-center justify-between gap-3 py-4" key={line.skuId}>
              <div className="min-w-0">
                <strong className="block truncate text-sm">
                  {names.get(line.skuId) ?? "Unavailable item"}
                </strong>
                {names.has(line.skuId) ? null : (
                  <span className="text-xs text-danger">No longer available</span>
                )}
              </div>
              <QuantityControl
                label={`Quantity for ${names.get(line.skuId) ?? line.skuId}`}
                onChange={(quantity) => onQuantityChange(line.skuId, quantity)}
                quantity={line.quantity}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-6 text-sm text-muted">
          Your cart is empty. Add something from this week&apos;s catalog.
        </p>
      )}
      <div className="grid gap-3 border-t border-line pt-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-muted">Saved subtotal</span>
          <strong>{formatPhp(cart.subtotal.centavos)}</strong>
        </div>
        <p className="text-xs leading-5 text-muted">
          The subtotal reflects the last server-confirmed cart. Save changes to refresh prices and
          totals.
        </p>
        <Button disabled={!hasUnsavedChanges} loading={pending} onClick={onSave} type="button">
          Save cart changes
        </Button>
        <LinkButton href="/account/cart" size="sm" tone="secondary">
          Review cart
        </LinkButton>
        {message ? (
          <p className="text-sm text-muted" role="status">
            {message}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
