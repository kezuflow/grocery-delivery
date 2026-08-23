import type { CartResponse, CatalogSkuResponse } from "@carbon/contracts";

import { Button, LinkButton } from "../../components/ui";
import { formatPhp } from "../../lib/format";
import type { CartDraftLine } from "./catalog-utils";
import { QuantityControl } from "./quantity-control";

export function CartSummary({
  cart,
  catalog,
  lines,
  message,
  onQuantityChange,
  onRetry,
  pending,
  canEdit,
}: Readonly<{
  cart: CartResponse["data"];
  catalog: readonly CatalogSkuResponse[];
  lines: readonly CartDraftLine[];
  message: string | null;
  onQuantityChange: (skuId: string, quantity: number) => void;
  onRetry?: () => void;
  pending: boolean;
  canEdit: boolean;
}>) {
  const names = new Map(catalog.map((item) => [item.id, item.name]));

  return (
    <aside className="rounded-2xl border border-market-line bg-white p-5 shadow-[0_2px_12px_rgba(17,24,39,0.04)] lg:sticky lg:top-6">
      {cart.adjustments?.length ? (
        <div
          className="-mx-5 -mt-5 mb-4 rounded-t-2xl border-b border-warning/30 bg-warning/10 px-5 py-3 text-sm"
          role="alert"
        >
          We refreshed {cart.adjustments.length} cart{" "}
          {cart.adjustments.length === 1 ? "item" : "items"} using current catalog data.
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-market-green-dark">
            Your cart
          </p>
          <h2 className="mt-2 text-xl font-bold">Ready for the week?</h2>
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
                disabled={pending}
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
          <span className="text-sm text-muted">Server subtotal</span>
          <strong>{formatPhp(cart.subtotal.centavos)}</strong>
        </div>
        <p className="text-xs leading-5 text-muted">
          Carbon confirms prices and availability after every cart change.
        </p>
        <p
          className="rounded-lg bg-market-soft px-3 py-2 text-xs leading-5 text-market-muted"
          role="status"
        >
          {pending ? "Updating your weekly cart..." : "Your cart is up to date."}
        </p>
        {onRetry ? (
          <Button disabled={pending} onClick={onRetry} size="sm" tone="secondary" type="button">
            Retry cart update
          </Button>
        ) : null}
        {canEdit ? (
          <LinkButton href="/account/cart" size="sm" tone="secondary">
            Review cart
          </LinkButton>
        ) : (
          <p className="text-xs leading-5 text-muted">Sign in before adding items to your cart.</p>
        )}
        {message ? (
          <p className="text-sm text-muted" role="status">
            {message}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
