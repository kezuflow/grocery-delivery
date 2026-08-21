"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";
import type { OrderListResponse } from "@carbon/contracts";

type OrderRequestFormProps = Readonly<{
  orders: OrderListResponse["data"]["orders"];
}>;

export function OrderRequestForm({ orders }: OrderRequestFormProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  if (orders.length === 0) return null;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void (async () => {
          setBusy(true);
          setMessage(null);
          try {
            await createApiClient(createSameOriginApiTransport()).createOrderRequest(
              { orderId: form.get("orderId"), kind: form.get("kind"), reason: form.get("reason") },
              idempotencyKey,
            );
            setIdempotencyKey(crypto.randomUUID());
            event.currentTarget.reset();
            setMessage("Your request has been submitted for review.");
            router.refresh();
          } catch (error) {
            setMessage(
              error instanceof ApiClientError
                ? error.message
                : "The request could not be submitted.",
            );
          } finally {
            setBusy(false);
          }
        })();
      }}
    >
      <select name="orderId" defaultValue={orders[0]?.id} aria-label="Order">
        {orders.map((order) => (
          <option key={order.id} value={order.id}>
            {order.id}
          </option>
        ))}
      </select>
      <select name="kind" defaultValue="cancellation" aria-label="Request type">
        <option value="cancellation">Request cancellation</option>
        <option value="refund">Request refund</option>
      </select>
      <textarea
        name="reason"
        placeholder="Tell us why you are requesting this"
        minLength={3}
        maxLength={1000}
        required
      />
      <button type="submit" disabled={busy}>
        {busy ? "Submitting..." : "Submit request"}
      </button>
      {message ? (
        <p className="subscription-note" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
