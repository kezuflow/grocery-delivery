"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CartResponse, CatalogCategoryResponse, CatalogSkuResponse } from "@carbon/contracts";

import { Button, EmptyState, ErrorState } from "../../components/ui";
import {
  createApiClient,
  createSameOriginApiTransport,
  ApiClientError,
} from "../../lib/api/client";
import {
  cartDraftFromResponse,
  setCartQuantity,
  toCartUpdateLines,
  type CartDraftLine,
} from "../catalog/catalog-utils";
import { QuantityControl } from "../catalog/quantity-control";
import { formatPhp } from "../../lib/format";

export function CartEditor({
  catalog,
  initialCart,
  error,
}: Readonly<{
  catalog: Readonly<{
    categories: readonly CatalogCategoryResponse[];
    items: readonly CatalogSkuResponse[];
  }>;
  initialCart: CartResponse["data"];
  error: string | null;
}>) {
  const router = useRouter();
  const [cart, setCart] = useState(initialCart);
  const [lines, setLines] = useState<CartDraftLine[]>(() => cartDraftFromResponse(initialCart));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const catalogById = useMemo(
    () => new Map(catalog.items.map((item) => [item.id, item])),
    [catalog.items],
  );

  useEffect(() => {
    setCart(initialCart);
    setLines(cartDraftFromResponse(initialCart));
  }, [initialCart]);

  async function update(nextLines: readonly CartDraftLine[]) {
    const previousLines = lines;
    setPending(true);
    setMessage(null);
    setLines([...nextLines]);
    try {
      const response = await createApiClient(createSameOriginApiTransport()).updateCart({
        lines: toCartUpdateLines(nextLines),
        expectedUpdatedAt: cart.updatedAt,
      });
      setCart(response.data);
      setLines(cartDraftFromResponse(response.data));
      setMessage(
        response.data.adjustments?.length
          ? "We refreshed your cart with current prices and availability."
          : "Cart updated.",
      );
      router.refresh();
    } catch (saveError) {
      setLines(previousLines);
      if (
        saveError instanceof ApiClientError &&
        (saveError.code === "CART_STALE" || saveError.code === "SKU_NOT_AVAILABLE")
      ) {
        router.refresh();
        setMessage("Your cart changed elsewhere. We are refreshing the latest version.");
        return;
      }
      setMessage(
        saveError instanceof ApiClientError ? saveError.message : "We could not save your cart.",
      );
    } finally {
      setPending(false);
    }
  }

  if (error)
    return (
      <ErrorState description={error} onRetry={() => router.refresh()} title="Cart unavailable" />
    );
  if (lines.length === 0) {
    return (
      <EmptyState
        action={
          <Button onClick={() => router.push("/shop")} size="sm">
            Browse catalog
          </Button>
        }
        description="Add active catalog items before reviewing your weekly order."
        title="Your cart is empty"
      />
    );
  }

  return (
    <section className="marketplace-cart grid gap-6 pb-28 lg:grid-cols-[minmax(0,1fr)_22rem] lg:pb-0">
      <div className="overflow-hidden rounded-[var(--marketplace-radius-card)] border border-[var(--marketplace-border)] bg-[var(--marketplace-surface)]">
        {cart.adjustments?.length ? (
          <div
            className="border-b border-warning/30 bg-warning/10 px-4 py-3 text-sm text-ink sm:px-5"
            role="alert"
          >
            We updated {cart.adjustments.length} cart{" "}
            {cart.adjustments.length === 1 ? "item" : "items"} to match current prices and
            availability.
          </div>
        ) : null}
        <div className="border-b border-[var(--marketplace-border)] p-4 sm:p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.12em] text-[var(--marketplace-accent-strong)]">
                Saved cart
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em]">Items for this week</h2>
            </div>
            <span className="text-sm tabular-nums text-muted">
              {lines.length} {lines.length === 1 ? "item" : "items"}
            </span>
          </div>
        </div>
        <ul className="divide-y divide-line">
          {lines.map((line) => (
            <li
              className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 p-4 transition-colors hover:bg-[var(--marketplace-surface-subtle)] sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:items-center sm:p-5"
              key={line.skuId}
            >
              <div className="aspect-square overflow-hidden rounded-[var(--marketplace-radius-media)] bg-[var(--marketplace-surface-subtle)] p-2">
                {catalogById.get(line.skuId)?.imageUrl ? (
                  <img
                    alt={catalogById.get(line.skuId)?.name ?? "Cart item"}
                    className="size-full object-contain"
                    src={catalogById.get(line.skuId)?.imageUrl ?? ""}
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <strong className="block truncate text-[15px]">
                  {catalogById.get(line.skuId)?.name ?? "Unavailable item"}
                </strong>
                {catalogById.has(line.skuId) ? (
                  <span className="mt-1 block text-sm tabular-nums text-muted">
                    {formatPhp(
                      cart.lines.find((item) => item.skuId === line.skuId)?.unitPrice.centavos ?? 0,
                    )}{" "}
                    / {catalogById.get(line.skuId)?.unit}
                  </span>
                ) : (
                  <span className="text-xs text-danger">No longer available</span>
                )}
                <label className="mt-3 flex min-h-10 items-center gap-2 text-xs text-muted">
                  <input
                    checked={(line.substitutionPreference ?? "best_match") === "best_match"}
                    disabled={pending}
                    onChange={(event) =>
                      void update(
                        lines.map((item) =>
                          item.skuId === line.skuId
                            ? {
                                ...item,
                                substitutionPreference: event.target.checked
                                  ? "best_match"
                                  : "refund",
                              }
                            : item,
                        ),
                      )
                    }
                    type="checkbox"
                  />
                  Allow the best available substitute
                </label>
              </div>
              <QuantityControl
                label={`Quantity for ${catalogById.get(line.skuId)?.name ?? line.skuId}`}
                onChange={(quantity) => void update(setCartQuantity(lines, line.skuId, quantity))}
                quantity={line.quantity}
                disabled={pending}
              />
            </li>
          ))}
        </ul>
      </div>
      <aside className="fixed inset-x-0 bottom-16 z-30 border-t border-[var(--marketplace-border)] bg-[var(--marketplace-surface)] p-4 shadow-[0_-8px_24px_rgba(17,24,39,0.08)] lg:sticky lg:inset-auto lg:top-6 lg:h-fit lg:rounded-[var(--marketplace-radius-card)] lg:border lg:p-5 lg:shadow-none">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-bold tracking-[0.12em] text-[var(--marketplace-accent-strong)]">
            Server total
          </p>
          <span className="text-xs text-muted">Updated as you edit</span>
        </div>
        <p className="mt-2 text-3xl font-bold tabular-nums tracking-[-0.04em]">
          {formatPrice(cart.subtotal.centavos)}
        </p>
        <p className="mt-2 text-sm leading-6 text-muted">
          Carbon confirms price and availability after every change.
        </p>
        <div className="mt-5 grid gap-3">
          <Button
            onClick={() => router.push("/account/checkout")}
            size="sm"
            tone="primary"
            type="button"
          >
            Continue to checkout
          </Button>
        </div>
        {message ? (
          <p className="mt-3 text-sm text-muted" role="status">
            {message}
          </p>
        ) : null}
      </aside>
    </section>
  );
}

function formatPrice(centavos: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    centavos / 100,
  );
}
