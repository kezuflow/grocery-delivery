"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { CheckoutQuote, DeliveryWindowsResponse } from "@carbon/contracts";

import { Button, Card, CardDescription, CardHeader, CardTitle, Input } from "../../components/ui";
import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";

export function CheckoutReview({
  initialQuote,
  cartLines,
  subscriptionActive,
  cutoffAt,
  windows,
  addressLabel,
}: Readonly<{
  initialQuote: CheckoutQuote | null;
  cartLines: number;
  subscriptionActive: boolean;
  cutoffAt: string;
  windows: DeliveryWindowsResponse["data"];
  addressLabel: string;
}>) {
  const router = useRouter();
  const orderKey = useRef<string | null>(null);
  const [coupon, setCoupon] = useState("");
  const [quote, setQuote] = useState(initialQuote);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<"coupon" | "order" | "window" | null>(null);

  async function applyCoupon() {
    setPending("coupon");
    setMessage(null);
    try {
      const result = await createApiClient(createSameOriginApiTransport()).previewCoupon(coupon);
      setQuote(result.data);
      setAppliedCoupon(result.data.promotionCode);
      setMessage("Coupon applied. Totals are server-confirmed.");
    } catch (error) {
      setMessage(apiMessage(error, "We could not apply that coupon."));
    } finally {
      setPending(null);
    }
  }

  async function removeCoupon() {
    setPending("coupon");
    setMessage(null);
    try {
      const result = await createApiClient(createSameOriginApiTransport()).removeCoupon();
      setQuote(result.data);
      setAppliedCoupon(null);
      setCoupon("");
      setMessage("Coupon removed.");
    } catch (error) {
      setMessage(apiMessage(error, "We could not remove the coupon."));
    } finally {
      setPending(null);
    }
  }

  async function selectWindow(windowId: string) {
    setPending("window");
    setMessage(null);
    try {
      await createApiClient(createSameOriginApiTransport()).selectDeliveryWindow({ windowId });
      router.refresh();
    } catch (error) {
      setMessage(apiMessage(error, "We could not select that delivery window."));
    } finally {
      setPending(null);
    }
  }

  async function placeOrder() {
    if (!window.confirm("Lock this week's order using the reviewed cart and delivery details?")) {
      return;
    }
    orderKey.current ??= crypto.randomUUID();
    setPending("order");
    setMessage(null);
    try {
      const order = await createApiClient(createSameOriginApiTransport()).createOrder(
        appliedCoupon ? { promotionCode: appliedCoupon } : {},
        orderKey.current,
      );
      orderKey.current = null;
      router.push(`/account/orders/${encodeURIComponent(order.data.id)}`);
      router.refresh();
    } catch (error) {
      setMessage(apiMessage(error, "We could not place your order."));
    } finally {
      setPending(null);
    }
  }

  const ready =
    subscriptionActive &&
    cartLines > 0 &&
    Boolean(windows.selectedWindowId) &&
    !addressLabel.startsWith("Missing");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Delivery details</CardTitle>
            <CardDescription>{addressLabel}</CardDescription>
          </CardHeader>
          <div className="grid gap-3">
            {windows.windows.length === 0 ? (
              <p className="text-sm text-muted">No delivery windows are available.</p>
            ) : (
              windows.windows.map((deliveryWindow) => (
                <button
                  aria-pressed={windows.selectedWindowId === deliveryWindow.id}
                  className="flex min-h-14 items-center justify-between gap-4 border border-line p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep aria-pressed:border-deep aria-pressed:bg-accent/20"
                  disabled={pending !== null || deliveryWindow.remaining === 0}
                  key={deliveryWindow.id}
                  onClick={() => void selectWindow(deliveryWindow.id)}
                  type="button"
                >
                  <strong>{deliveryWindow.label}</strong>
                  <span className="text-sm text-muted">{deliveryWindow.remaining} spots</span>
                </button>
              ))
            )}
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Discount code</CardTitle>
            <CardDescription>Eligibility and savings are calculated by the server.</CardDescription>
          </CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              aria-label="Coupon code"
              disabled={Boolean(appliedCoupon)}
              onChange={(event) => setCoupon(event.target.value.toUpperCase())}
              placeholder="WELCOME"
              value={coupon}
            />
            <Button
              disabled={pending !== null || coupon.trim().length < 2}
              onClick={() => void (appliedCoupon ? removeCoupon() : applyCoupon())}
              size="sm"
              type="button"
            >
              {appliedCoupon ? "Remove" : "Apply"}
            </Button>
          </div>
        </Card>
      </div>
      <Card className="h-fit lg:sticky lg:top-6">
        <CardHeader>
          <CardTitle>Review order</CardTitle>
          <CardDescription>{cartLines} saved cart lines</CardDescription>
        </CardHeader>
        {quote ? (
          <dl className="grid gap-3 text-sm">
            <QuoteRow label="Subtotal" value={quote.originalSubtotal.centavos} />
            <QuoteRow label="Discount" subtract value={quote.discount.centavos} />
            <QuoteRow label="Delivery" value={quote.deliveryFee.centavos} />
            <QuoteRow label="Weekly fee" value={quote.weeklyFee.centavos} />
            <QuoteRow label="Included credit" subtract value={quote.includedCredit.centavos} />
            <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
              <dt>Total due</dt>
              <dd>{formatPrice(quote.totalDue.centavos)}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted">
            A server quote is not available until the cart and subscription are eligible.
          </p>
        )}
        <p className="mt-4 text-xs leading-5 text-muted">Cutoff: {formatDateTime(cutoffAt)}</p>
        <div className="mt-6 grid gap-3">
          <Button
            disabled={!ready || pending !== null}
            loading={pending === "order"}
            onClick={() => void placeOrder()}
            type="button"
          >
            Place order
          </Button>
          <Button
            onClick={() => router.push("/account/cart")}
            size="sm"
            tone="secondary"
            type="button"
          >
            Edit cart
          </Button>
        </div>
        {!ready ? (
          <p className="mt-3 text-sm text-warning" role="status">
            Complete the active subscription, cart, address, and delivery window before ordering.
          </p>
        ) : null}
        {message ? (
          <p className="mt-3 text-sm text-muted" role="status">
            {message}
          </p>
        ) : null}
      </Card>
    </div>
  );
}

function QuoteRow({
  label,
  value,
  subtract = false,
}: Readonly<{ label: string; value: number; subtract?: boolean }>) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd>
        {subtract && value ? "-" : ""}
        {formatPrice(value)}
      </dd>
    </div>
  );
}

function formatPrice(centavos: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    centavos / 100,
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "Not scheduled"
    : date.toLocaleString("en-PH", { timeZone: "Asia/Manila" });
}

function apiMessage(error: unknown, fallback: string) {
  return error instanceof ApiClientError ? error.message : fallback;
}
