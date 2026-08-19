"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";

export function PlaceOrderButton({
  cartHasLines,
  subscriptionActive,
}: Readonly<{ cartHasLines: boolean; subscriptionActive: boolean }>) {
  const router = useRouter();
  const idempotencyKey = useRef<string | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<Readonly<{ text: string; error: boolean }> | null>(null);

  async function placeOrder() {
    if (!subscriptionActive || !cartHasLines) return;
    if (!window.confirm("Lock this week's order using your saved cart?")) return;

    setPending(true);
    setMessage(null);
    idempotencyKey.current ??= crypto.randomUUID();
    try {
      const client = createApiClient(createSameOriginApiTransport());
      const order = await client.createOrder({}, idempotencyKey.current);
      setMessage({
        text: `Order ${order.data.id} locked. Total due: ${formatPrice(order.data.totals.totalDue.centavos)}.`,
        error: false,
      });
      idempotencyKey.current = undefined;
      router.refresh();
    } catch (error) {
      setMessage({
        text: error instanceof ApiClientError ? error.message : "We could not place your order.",
        error: true,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="place-order-actions">
      <button
        className="button button-small"
        disabled={!subscriptionActive || !cartHasLines || pending}
        onClick={() => void placeOrder()}
        type="button"
      >
        {pending ? "Locking order..." : "Place order"}
      </button>
      {!subscriptionActive ? (
        <p className="subscription-note">An active subscription is required to place an order.</p>
      ) : !cartHasLines && !message ? (
        <p className="subscription-note">Add at least one saved cart item to place an order.</p>
      ) : null}
      {message ? (
        <p className={`order-message${message.error ? " order-message-error" : ""}`} role="status">
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

function formatPrice(centavos: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(centavos / 100);
}
