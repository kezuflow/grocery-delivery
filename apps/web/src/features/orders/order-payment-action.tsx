"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { PaymentMethodListResponse } from "@carbon/contracts";

import { Button } from "../../components/ui";
import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";

export function OrderPaymentAction({
  customerId,
  orderId,
  paymentState,
  methods,
}: Readonly<{
  customerId: string;
  orderId: string;
  paymentState: "unpaid" | "pending" | "paid" | "failed";
  methods: PaymentMethodListResponse["data"]["methods"];
}>) {
  const router = useRouter();
  const key = useRef<string | null>(null);
  const [selectedReference, setSelectedReference] = useState(
    () => methods.find((method) => method.status === "active")?.providerReference ?? null,
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (paymentState === "paid") {
    return (
      <p className="rounded-xl bg-accent/30 p-4 text-sm font-bold text-deep" role="status">
        Payment confirmed. Your weekly order is locked in.
      </p>
    );
  }
  if (paymentState === "pending") {
    return (
      <p className="rounded-xl bg-accent/30 p-4 text-sm font-bold text-deep" role="status">
        Payment is processing. This page will reflect the provider-confirmed result.
      </p>
    );
  }

  async function retryPayment() {
    if (!selectedReference) return;
    key.current ??= crypto.randomUUID();
    setPending(true);
    setMessage(null);
    try {
      const result = await createApiClient(createSameOriginApiTransport()).chargePayment(
        {
          orderId,
          customerReference: `carbon-customer-${customerId}`,
          paymentMethodReference: selectedReference,
        },
        key.current,
      );
      if (result.data.status === "failed") {
        key.current = null;
        setMessage("Payment was declined. Select another method and retry.");
        return;
      }
      key.current = null;
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 409) key.current = null;
      setMessage(error instanceof ApiClientError ? error.message : "Payment could not be retried.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-warning" role="status">
        {paymentState === "failed"
          ? "The last payment attempt failed. Your order remains locked and can be retried."
          : "Payment is still required for this locked order."}
      </p>
      {methods.length ? (
        <div className="grid gap-2" role="radiogroup" aria-label="Payment method for retry">
          {methods.map((method) => (
            <button
              aria-checked={selectedReference === method.providerReference}
              className="flex min-h-12 items-center justify-between rounded-xl border border-line p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep aria-checked:border-deep aria-checked:bg-accent/20"
              disabled={pending || method.status !== "active"}
              key={method.id}
              onClick={() => setSelectedReference(method.providerReference)}
              role="radio"
              type="button"
            >
              <span className="font-bold capitalize">{method.type.replace("_", " ")}</span>
              <span className="text-xs text-muted">{method.status}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">No active saved payment method is available.</p>
      )}
      <Button
        disabled={!selectedReference}
        loading={pending}
        onClick={() => void retryPayment()}
        type="button"
      >
        Retry payment
      </Button>
      {message ? (
        <p aria-live="polite" className="text-sm text-muted" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
