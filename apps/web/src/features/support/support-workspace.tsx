"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  CustomerOrderRequestsResponse,
  OrderListResponse,
  SupportCasesResponse,
} from "@carbon/contracts";

import { Button, EmptyState, Input, Select, Textarea } from "../../components/ui";
import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";

export function SupportWorkspace({
  initialCases,
  orders,
  orderRequests,
}: Readonly<{
  initialCases: SupportCasesResponse["data"]["cases"];
  orders: OrderListResponse["data"]["orders"];
  orderRequests: CustomerOrderRequestsResponse["data"]["requests"];
}>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="grid gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Open requests</p>
          <h2 className="mt-2 text-2xl font-bold">Support history</h2>
        </div>
        {initialCases.length === 0 ? (
          <EmptyState
            description="Send a request and the support team will keep its status here."
            title="No support requests"
          />
        ) : (
          <ul className="grid gap-3">
            {initialCases.map((supportCase) => (
              <li className="border border-line bg-white p-4" key={supportCase.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <strong>{supportCase.subject}</strong>
                  <span className="text-sm capitalize text-muted">{supportCase.status}</span>
                </div>
                <p className="mt-2 text-sm text-muted">
                  Updated {new Date(supportCase.updatedAt).toLocaleDateString("en-PH")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="grid h-fit gap-6 lg:sticky lg:top-6">
        <form
          className="grid gap-3 border border-line bg-white p-5"
          onSubmit={(event) => {
            event.preventDefault();
            const formElement = event.currentTarget;
            const form = new FormData(formElement);
            void (async () => {
              setPending(true);
              setMessage(null);
              try {
                await createApiClient(createSameOriginApiTransport()).createSupportCase(
                  { subject: form.get("subject"), message: form.get("message") },
                  crypto.randomUUID(),
                );
                formElement.reset();
                setMessage("Your support request was sent.");
                router.refresh();
              } catch (error) {
                setMessage(
                  error instanceof ApiClientError
                    ? error.message
                    : "We could not send your request.",
                );
              } finally {
                setPending(false);
              }
            })();
          }}
        >
          <h2 className="text-lg font-bold">Contact support</h2>
          <Input label="Subject" maxLength={120} name="subject" required />
          <Textarea label="Message" maxLength={4000} name="message" required />
          <Button disabled={pending} loading={pending} type="submit">
            Send request
          </Button>
        </form>
        {orders.length ? (
          <form
            className="grid gap-3 border border-line bg-white p-5"
            onSubmit={(event) => {
              event.preventDefault();
              const formElement = event.currentTarget;
              const form = new FormData(formElement);
              void (async () => {
                setPending(true);
                setMessage(null);
                try {
                  await createApiClient(createSameOriginApiTransport()).createOrderRequest(
                    {
                      orderId: form.get("orderId"),
                      kind: form.get("kind"),
                      reason: form.get("reason"),
                    },
                    crypto.randomUUID(),
                  );
                  formElement.reset();
                  setMessage("Your order request was submitted for review.");
                  router.refresh();
                } catch (error) {
                  setMessage(
                    error instanceof ApiClientError
                      ? error.message
                      : "We could not send your order request.",
                  );
                } finally {
                  setPending(false);
                }
              })();
            }}
          >
            <h2 className="text-lg font-bold">Order request</h2>
            <Select label="Order" name="orderId" defaultValue={orders[0]?.id}>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.id}
                </option>
              ))}
            </Select>
            <Select label="Request" name="kind" defaultValue="cancellation">
              <option value="cancellation">Cancellation</option>
              <option value="refund">Refund</option>
            </Select>
            <Textarea label="Reason" maxLength={1000} minLength={3} name="reason" required />
            <Button disabled={pending} loading={pending} type="submit">
              Submit order request
            </Button>
            {orderRequests.length ? (
              <p className="text-xs text-muted">{orderRequests.length} previous order request(s)</p>
            ) : null}
          </form>
        ) : null}
        {message ? (
          <p className="text-sm text-muted" role="status">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
