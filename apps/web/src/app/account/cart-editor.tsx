"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";

type CartLine = Readonly<{ skuId: string; quantity: number; unitPriceCentavos: number }>;
type CatalogItem = Readonly<{ id: string; name: string; priceCentavos: number }>;

function formatPrice(centavos: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(centavos / 100);
}

export function CartEditor({
  initialLines,
  catalog,
}: Readonly<{ initialLines: readonly CartLine[]; catalog: readonly CatalogItem[] }>) {
  const router = useRouter();
  const [lines, setLines] = useState<CartLine[]>([...initialLines]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedSkuId, setSelectedSkuId] = useState(catalog[0]?.id ?? "");
  const names = new Map(catalog.map((item) => [item.id, item.name]));

  function changeQuantity(skuId: string, quantity: number) {
    setLines((current) =>
      current
        .map((line) => (line.skuId === skuId ? { ...line, quantity } : line))
        .filter((line) => line.quantity > 0),
    );
  }

  function addSelectedItem() {
    if (!selectedSkuId) return;
    setLines((current) => {
      const existing = current.find((line) => line.skuId === selectedSkuId);
      const selected = catalog.find((item) => item.id === selectedSkuId);
      return existing
        ? current.map((line) =>
            line.skuId === selectedSkuId ? { ...line, quantity: line.quantity + 1 } : line,
          )
        : [
            ...current,
            {
              skuId: selectedSkuId,
              quantity: 1,
              unitPriceCentavos: selected?.priceCentavos ?? 0,
            },
          ];
    });
  }

  return (
    <div>
      {lines.length > 0 ? (
        <ul className="account-cart-lines">
          {lines.map((line) => (
            <li key={line.skuId}>
              <div>
                <strong>{names.get(line.skuId) ?? "Unavailable item"}</strong>
                <span>{formatPrice(line.unitPriceCentavos * line.quantity)}</span>
              </div>
              <label className="quantity-control">
                <span>Quantity</span>
                <input
                  aria-label={`Quantity for ${names.get(line.skuId) ?? line.skuId}`}
                  min={0}
                  onChange={(event) => changeQuantity(line.skuId, Number(event.target.value))}
                  type="number"
                  value={line.quantity}
                />
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="account-editor-empty">Your cart is empty.</p>
      )}
      {catalog.length > 0 ? (
        <div className="cart-add-control">
          <select
            aria-label="Catalog item"
            onChange={(event) => setSelectedSkuId(event.target.value)}
            value={selectedSkuId}
          >
            {catalog.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <button
            className="button button-small button-outline"
            onClick={addSelectedItem}
            type="button"
          >
            Add item
          </button>
        </div>
      ) : null}
      <div className="cart-editor-actions">
        <button
          className="button button-small"
          disabled={pending}
          onClick={() => {
            void (async () => {
              setPending(true);
              setMessage(null);
              try {
                const client = createApiClient(createSameOriginApiTransport());
                await client.updateCart({
                  lines: lines.map(({ skuId, quantity }) => ({ skuId, quantity })),
                });
              } catch (error) {
                setMessage(
                  error instanceof ApiClientError
                    ? error.message
                    : "We could not update your cart.",
                );
                setPending(false);
                return;
              }
              router.refresh();
              setPending(false);
            })();
          }}
          type="button"
        >
          {pending ? "Saving..." : "Save cart"}
        </button>
        {message ? (
          <p className="auth-message" role="alert">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
