"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import type {
  CheckoutQuote,
  DeliveryAddressResponse,
  DeliveryAddressesResponse,
  DeliveryWindowsResponse,
  OrderResponse,
  PaymentMethodListResponse,
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
  customerId,
  paymentMethods,
  paymentUnavailableMessage,
}: Readonly<{
  initialQuote: CheckoutQuote | null;
  cartLines: number;
  subscriptionActive: boolean;
  cutoffAt: string;
  windows: DeliveryWindowsResponse["data"];
  addresses: DeliveryAddressesResponse["data"]["addresses"];
  selectedAddress: DeliveryAddressResponse["data"];
  customerId: string;
  paymentMethods: PaymentMethodListResponse["data"]["methods"];
  paymentUnavailableMessage: string | null;
}>) {
  const router = useRouter();
  const orderKey = useRef<string | null>(null);
  const paymentKey = useRef<string | null>(null);
  const lockedOrder = useRef<OrderResponse["data"] | null>(null);
  const [coupon, setCoupon] = useState("");
  const [quote, setQuote] = useState(initialQuote);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<"address" | "coupon" | "order" | "window" | null>(null);
  const [currentAddress, setCurrentAddress] = useState(
    () => addresses.find((address) => address.selected) ?? null,
  );
  const [selectedWindowId, setSelectedWindowId] = useState(windows.selectedWindowId);
  const [selectedPaymentReference, setSelectedPaymentReference] = useState(
    () => paymentMethods.find((method) => method.status === "active")?.providerReference ?? null,
  );

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
    if (
      !lockedOrder.current &&
      !window.confirm("Lock this week's order and charge the selected payment method?")
    ) {
      return;
    }
    setPending("order");
    setMessage(null);
    try {
      const client = createApiClient(createSameOriginApiTransport());
      if (!lockedOrder.current) {
        orderKey.current ??= crypto.randomUUID();
        const order = await client.createOrder(
          appliedCoupon ? { promotionCode: appliedCoupon } : {},
          orderKey.current,
        );
        lockedOrder.current = order.data;
        orderKey.current = null;
      }
      const order = lockedOrder.current;
      if (order.totals.totalDue.centavos === 0) {
        router.push(`/account/orders/${encodeURIComponent(order.id)}?payment=success`);
        router.refresh();
        return;
      }
      if (!selectedPaymentReference) {
        setMessage("Select an active payment method to complete this order.");
        return;
      }
      paymentKey.current ??= crypto.randomUUID();
      const attempt = await client.chargePayment(
        {
          orderId: order.id,
          customerReference: `carbon-customer-${customerId}`,
          paymentMethodReference: selectedPaymentReference,
        },
        paymentKey.current,
      );
      if (attempt.data.status === "failed") {
        paymentKey.current = null;
        setMessage("Payment was declined. Choose a payment method and retry.");
        return;
      }
      paymentKey.current = null;
      router.push(
        `/account/orders/${encodeURIComponent(order.id)}?payment=${attempt.data.status === "pending" ? "pending" : "success"}`,
      );
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 409) paymentKey.current = null;
      setMessage(apiMessage(error, "We could not place your order."));
    } finally {
      setPending(null);
    }
  }

  const ready =
    subscriptionActive &&
    cartLines > 0 &&
    Boolean(selectedWindowId) &&
    Boolean((currentAddress ?? selectedAddress)?.serviceable) &&
    (quote?.totalDue.centavos === 0 || Boolean(selectedPaymentReference));
  const effectiveAddress = currentAddress ?? selectedAddress;

  return (
    <div className="marketplace-checkout grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid gap-6">
        <Card
          aria-label="Delivery address"
          className="rounded-[var(--marketplace-radius-card)] border-[var(--marketplace-border)] p-4 sm:p-5"
        >
          <CardHeader>
            <p className="text-xs font-bold tracking-[0.12em] text-[var(--marketplace-accent-strong)]">
              1 of 3
            </p>
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
        <Card
          aria-label="Delivery time"
          className="rounded-[var(--marketplace-radius-card)] border-[var(--marketplace-border)] p-4 sm:p-5"
        >
          <CardHeader>
            <p className="text-xs font-bold tracking-[0.12em] text-[var(--marketplace-accent-strong)]">
              2 of 3
            </p>
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
        <Card
          aria-label="Discount code"
          className="rounded-[var(--marketplace-radius-card)] border-[var(--marketplace-border)] p-4 sm:p-5"
        >
          <CardHeader>
            <p className="text-xs font-bold tracking-[0.12em] text-[var(--marketplace-accent-strong)]">
              3 of 3
            </p>
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
        <Card
          aria-label="Payment method"
          className="rounded-[var(--marketplace-radius-card)] border-[var(--marketplace-border)] p-4 sm:p-5"
        >
          <CardHeader>
            <p className="text-xs font-bold tracking-[0.12em] text-[var(--marketplace-accent-strong)]">
              Payment
            </p>
            <CardTitle>Payment method</CardTitle>
            <CardDescription>
              The local provider receives only the saved provider reference after the order is
              locked.
            </CardDescription>
          </CardHeader>
          {paymentMethods.length ? (
            <div className="grid gap-2" role="radiogroup" aria-label="Payment method">
              {paymentMethods.map((method) => (
                <button
                  aria-checked={selectedPaymentReference === method.providerReference}
                  className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-line p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep aria-checked:border-deep aria-checked:bg-accent/20"
                  disabled={pending !== null || method.status !== "active"}
                  key={method.id}
                  onClick={() => setSelectedPaymentReference(method.providerReference)}
                  role="radio"
                  type="button"
                >
                  <span className="font-bold capitalize">{method.type.replace("_", " ")}</span>
                  <span className="text-xs font-bold text-muted">
                    {method.status === "active" ? "Ready" : "Unavailable"}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">
              {paymentUnavailableMessage ??
                "No saved payment method is ready. Add one from your account before ordering."}
            </p>
          )}
        </Card>
      </div>
      <Card
        aria-label="Order summary"
        className="h-fit rounded-[var(--marketplace-radius-card)] border-[var(--marketplace-border)] p-4 sm:p-5 lg:sticky lg:top-6"
      >
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
            <div className="flex justify-between border-t border-[var(--marketplace-border)] pt-4 text-base font-bold tabular-nums">
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
            {lockedOrder.current
              ? "Retry payment"
              : quote
                ? `Place order - ${formatPrice(quote.totalDue.centavos)}`
                : "Place order"}
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
