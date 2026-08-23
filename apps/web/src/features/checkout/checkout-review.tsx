"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import type {
  CheckoutQuote,
  DeliveryAddressResponse,
  DeliveryAddressesResponse,
  DeliveryWindowsResponse,
} from "@carbon/contracts";

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
  addresses,
  selectedAddress,
}: Readonly<{
  initialQuote: CheckoutQuote | null;
  cartLines: number;
  subscriptionActive: boolean;
  cutoffAt: string;
  windows: DeliveryWindowsResponse["data"];
  addresses: DeliveryAddressesResponse["data"]["addresses"];
  selectedAddress: DeliveryAddressResponse["data"];
}>) {
  const router = useRouter();
  const orderKey = useRef<string | null>(null);
  const [coupon, setCoupon] = useState("");
  const [quote, setQuote] = useState(initialQuote);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<"address" | "coupon" | "order" | "window" | null>(null);
  const [currentAddress, setCurrentAddress] = useState(
    () => addresses.find((address) => address.selected) ?? null,
  );
  const [selectedWindowId, setSelectedWindowId] = useState(windows.selectedWindowId);

  async function applyCoupon(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
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
      const result = await createApiClient(createSameOriginApiTransport()).selectDeliveryWindow({
        windowId,
      });
      setSelectedWindowId(result.data.selectedWindowId);
      setMessage("Delivery time updated.");
      router.refresh();
    } catch (error) {
      setMessage(apiMessage(error, "We could not select that delivery window."));
    } finally {
      setPending(null);
    }
  }

  async function selectAddress(addressId: string) {
    setPending("address");
    setMessage(null);
    try {
      const result = await createApiClient(createSameOriginApiTransport()).selectDeliveryAddress(
        addressId,
      );
      setCurrentAddress(result.data);
      setMessage("Delivery address updated. Quote will use the selected address.");
    } catch (error) {
      setMessage(apiMessage(error, "We could not select that address."));
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
    Boolean(selectedWindowId) &&
    Boolean((currentAddress ?? selectedAddress)?.serviceable);
  const effectiveAddress = currentAddress ?? selectedAddress;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid gap-6">
        <Card aria-label="Delivery address">
          <CardHeader>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">1 of 3</p>
            <CardTitle>Delivery address</CardTitle>
            <CardDescription>
              {effectiveAddress
                ? `${effectiveAddress.recipientName}, ${effectiveAddress.line1}, ${effectiveAddress.city} ${effectiveAddress.postalCode}`
                : "Add a serviceable delivery address before ordering."}
            </CardDescription>
          </CardHeader>
          {addresses.length ? (
            <div className="grid gap-2 border-b border-line pb-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                Saved addresses
              </p>
              {addresses.map((address) => (
                <button
                  aria-pressed={currentAddress?.id === address.id}
                  className="flex min-h-14 items-start justify-between gap-4 rounded-xl border border-line p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep aria-pressed:border-deep aria-pressed:bg-accent/20"
                  disabled={pending !== null || !address.serviceable}
                  key={address.id}
                  onClick={() => void selectAddress(address.id)}
                  type="button"
                >
                  <span>
                    <strong className="block text-sm">{address.recipientName}</strong>
                    <span className="text-xs text-muted">
                      {address.line1}, {address.city} {address.postalCode}
                    </span>
                  </span>
                  <span className="text-xs font-bold text-muted">
                    {address.serviceable
                      ? currentAddress?.id === address.id
                        ? "Selected"
                        : "Use"
                      : "Unavailable"}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="border-b border-line pb-4 text-sm text-muted">
              No saved address is available. Add one from your account before checkout.
            </p>
          )}
          <Button
            className="mt-4 w-fit"
            onClick={() => router.push("/account")}
            size="sm"
            tone="secondary"
            type="button"
          >
            Manage addresses
          </Button>
        </Card>
        <Card aria-label="Delivery time">
          <CardHeader>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">2 of 3</p>
            <CardTitle>Delivery time</CardTitle>
            <CardDescription>
              Choose an available weekend window before the Friday cutoff.
            </CardDescription>
          </CardHeader>
          <div className="grid gap-3">
            {windows.windows.length === 0 ? (
              <p className="text-sm text-muted">No delivery windows are available.</p>
            ) : (
              windows.windows.map((deliveryWindow) => (
                <button
                  aria-pressed={selectedWindowId === deliveryWindow.id}
                  className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-line p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep aria-pressed:border-deep aria-pressed:bg-accent/20"
                  disabled={pending !== null || deliveryWindow.remaining === 0}
                  key={deliveryWindow.id}
                  onClick={() => void selectWindow(deliveryWindow.id)}
                  type="button"
                >
                  <strong>{deliveryWindow.label}</strong>
                  <span className="text-sm text-muted">
                    {deliveryWindow.remaining === 0 ? "Full" : `${deliveryWindow.remaining} spots`}
                  </span>
                </button>
              ))
            )}
          </div>
        </Card>
        <Card aria-label="Discount code">
          <CardHeader>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">3 of 3</p>
            <CardTitle>Discount code</CardTitle>
            <CardDescription>Eligibility and savings are calculated by the server.</CardDescription>
          </CardHeader>
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => void applyCoupon(event)}
          >
            <Input
              aria-label="Coupon code"
              disabled={Boolean(appliedCoupon)}
              onChange={(event) => setCoupon(event.target.value.toUpperCase())}
              placeholder="WELCOME"
              value={coupon}
            />
            <Button
              disabled={pending !== null || coupon.trim().length < 2}
              onClick={appliedCoupon ? () => void removeCoupon() : undefined}
              size="sm"
              type={appliedCoupon ? "button" : "submit"}
            >
              {appliedCoupon ? "Remove" : "Apply"}
            </Button>
          </form>
          {appliedCoupon ? (
            <p className="mt-3 text-sm font-bold text-deep">{appliedCoupon} is applied</p>
          ) : null}
        </Card>
      </div>
      <Card aria-label="Order summary" className="h-fit lg:sticky lg:top-6">
        <CardHeader>
          <CardTitle>Review order</CardTitle>
          <CardDescription>{cartLines} saved cart lines</CardDescription>
        </CardHeader>
        {quote ? (
          <dl className="grid gap-3 text-sm">
            <QuoteRow label="Subtotal" value={quote.originalSubtotal.centavos} />
            <QuoteRow label="Discount" subtract value={quote.discount.centavos} />
            <QuoteRow label="Included credit" subtract value={quote.includedCredit.centavos} />
            <QuoteRow label="Credit overage" value={quote.overage.centavos} />
            <QuoteRow label="Delivery" value={quote.deliveryFee.centavos} />
            <QuoteRow label="Weekly fee" value={quote.weeklyFee.centavos} />
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
        <div className="fixed inset-x-3 bottom-3 z-40 grid gap-2 rounded-2xl border border-line bg-white p-3 shadow-xl lg:static lg:mt-6 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <Button
            disabled={!ready || pending !== null}
            loading={pending === "order"}
            onClick={() => void placeOrder()}
            type="button"
          >
            {quote ? `Place order - ${formatPrice(quote.totalDue.centavos)}` : "Place order"}
          </Button>
          <Button
            className="hidden lg:inline-flex"
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
          <p aria-live="polite" className="mt-3 text-sm text-muted" role="status">
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
