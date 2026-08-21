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
  cartDraftHasChanged,
  setCartQuantity,
  toCartUpdateLines,
  type CartDraftLine,
} from "../catalog/catalog-utils";
import { QuantityControl } from "../catalog/quantity-control";

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
  const names = useMemo(
    () => new Map(catalog.items.map((item) => [item.id, item.name])),
    [catalog.items],
  );

  useEffect(() => {
    setCart(initialCart);
    setLines(cartDraftFromResponse(initialCart));
  }, [initialCart]);

  async function save() {
    setPending(true);
    setMessage(null);
    try {
      const response = await createApiClient(createSameOriginApiTransport()).updateCart({
        lines: toCartUpdateLines(lines),
      });
      setCart(response.data);
      setLines(cartDraftFromResponse(response.data));
      setMessage("Your cart is saved.");
      router.refresh();
    } catch (saveError) {
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
          <Button onClick={() => router.push("/account/catalog")} size="sm">
            Browse catalog
          </Button>
        }
        description="Add active catalog items before reviewing your weekly order."
        title="Your cart is empty"
      />
    );
  }

  const changed = cartDraftHasChanged(lines, cart);
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="border border-line bg-white">
        <div className="border-b border-line p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Saved cart</p>
          <h2 className="mt-2 text-2xl font-bold">Items for this week</h2>
        </div>
        <ul className="divide-y divide-line">
          {lines.map((line) => (
            <li className="flex items-center justify-between gap-4 p-5" key={line.skuId}>
              <div className="min-w-0">
                <strong className="block truncate">
                  {names.get(line.skuId) ?? "Unavailable item"}
                </strong>
                {!names.has(line.skuId) ? (
                  <span className="text-xs text-danger">No longer available</span>
                ) : null}
              </div>
              <QuantityControl
                label={`Quantity for ${names.get(line.skuId) ?? line.skuId}`}
                onChange={(quantity) =>
                  setLines((current) => setCartQuantity(current, line.skuId, quantity))
                }
                quantity={line.quantity}
              />
            </li>
          ))}
        </ul>
      </div>
      <aside className="border border-line bg-white p-5 lg:sticky lg:top-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Server total</p>
        <p className="mt-2 text-3xl font-bold">{formatPrice(cart.subtotal.centavos)}</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          Save changes to refresh catalog pricing before checkout.
        </p>
        <div className="mt-5 grid gap-3">
          <Button disabled={!changed} loading={pending} onClick={() => void save()} type="button">
            Save cart
          </Button>
          <Button
            onClick={() => router.push("/account/checkout")}
            size="sm"
            tone="secondary"
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
