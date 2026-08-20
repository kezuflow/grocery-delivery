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
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [quote, setQuote] = useState<Readonly<{ totalDue: number; discount: number }> | null>(null);
  const [message, setMessage] = useState<Readonly<{ text: string; error: boolean }> | null>(null);

  async function placeOrder() {
    if (!subscriptionActive || !cartHasLines) return;
    if (!window.confirm("Lock this week's order using your saved cart?")) return;

    setPending(true);
    setMessage(null);
    idempotencyKey.current ??= crypto.randomUUID();
    try {
      const client = createApiClient(createSameOriginApiTransport());
      const order = await client.createOrder(
        appliedCoupon ? { promotionCode: appliedCoupon } : {},
        idempotencyKey.current,
      );
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

  async function applyCoupon() {
    if (!coupon.trim()) return;
    setPending(true);
    setMessage(null);
    try {
      const result = await createApiClient(createSameOriginApiTransport()).previewCoupon(coupon);
      setAppliedCoupon(result.data.promotionCode);
      setQuote({
        totalDue: result.data.totalDue.centavos,
        discount: result.data.discount.centavos,
      });
      setMessage({ text: "Coupon applied.", error: false });
    } catch (error) {
      setAppliedCoupon(null);
      setQuote(null);
      setMessage({
        text: error instanceof ApiClientError ? error.message : "We could not apply that coupon.",
        error: true,
      });
    } finally {
      setPending(false);
    }
  }

  async function removeCoupon() {
    setPending(true);
    setMessage(null);
    try {
      const result = await createApiClient(createSameOriginApiTransport()).removeCoupon();
      setAppliedCoupon(null);
      setCoupon("");
      setQuote({
        totalDue: result.data.totalDue.centavos,
        discount: result.data.discount.centavos,
      });
      setMessage({ text: "Coupon removed.", error: false });
    } catch (error) {
      setMessage({
        text: error instanceof ApiClientError ? error.message : "We could not remove that coupon.",
        error: true,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="place-order-actions">
      <div className="coupon-controls">
        <label htmlFor="checkout-coupon">Coupon code</label>
        <div>
          <input
            id="checkout-coupon"
            value={coupon}
            onChange={(event) => setCoupon(event.target.value.toUpperCase())}
            disabled={pending || Boolean(appliedCoupon)}
            maxLength={32}
          />
          {appliedCoupon ? (
            <button
              className="button button-small"
              disabled={pending}
              onClick={() => void removeCoupon()}
              type="button"
            >
              Remove
            </button>
          ) : (
            <button
              className="button button-small"
              disabled={pending || !coupon.trim()}
              onClick={() => void applyCoupon()}
              type="button"
            >
              Apply
            </button>
          )}
        </div>
        {quote ? (
          <p className="subscription-note">
            Discount: {formatPrice(quote.discount)}. Total: {formatPrice(quote.totalDue)}.
          </p>
        ) : null}
      </div>
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
