"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { CatalogSkuResponse, SubscriptionResponse } from "@carbon/contracts";

import { Button } from "../../components/ui";
import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";
import type { SessionSummary } from "../../lib/permissions";
import { subscriptionReturnHref } from "../../lib/subscription-onboarding";
import { PublicAuthControls } from "../auth";

export function ProductDetailActions({
  item,
  session,
  subscription,
}: Readonly<{
  item: CatalogSkuResponse;
  session: SessionSummary | null;
  subscription: SubscriptionResponse["data"] | null;
}>) {
  const router = useRouter();
  const [customerReady, setCustomerReady] = useState(session?.role === "customer");
  const subscriptionReady = subscription?.status === "active";
  const [authOpen, setAuthOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function addItem() {
    setPending(true);
    setMessage(null);
    try {
      const client = createApiClient(createSameOriginApiTransport());
      const cart = await client.getCart();
      const existing = cart.data.lines.find((line) => line.skuId === item.id);
      const lines = existing
        ? cart.data.lines.map((line) =>
            line.skuId === item.id
              ? {
                  skuId: line.skuId,
                  quantity: line.quantity + 1,
                  substitutionPreference: line.substitutionPreference,
                }
              : {
                  skuId: line.skuId,
                  quantity: line.quantity,
                  substitutionPreference: line.substitutionPreference,
                },
          )
        : [
            ...cart.data.lines.map((line) => ({
              skuId: line.skuId,
              quantity: line.quantity,
              substitutionPreference: line.substitutionPreference,
            })),
            { skuId: item.id, quantity: 1 },
          ];
      await client.updateCart({ lines, expectedUpdatedAt: cart.data.updatedAt });
      setMessage(`${item.name} was added to your cart.`);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof ApiClientError ? error.message : "We could not update your cart.",
      );
    } finally {
      setPending(false);
    }
  }

  async function saveItem() {
    if (!customerReady) {
      setAuthOpen(true);
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      await createApiClient(createSameOriginApiTransport()).saveItem(item.id);
      setMessage(`${item.name} was saved for later.`);
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : "We could not save this item.");
    } finally {
      setPending(false);
    }
  }

  function requestAdd() {
    if (!customerReady) {
      setAuthOpen(true);
      return;
    }
    if (!subscriptionReady) {
      router.push(subscriptionReturnHref(window.location.pathname));
      return;
    }
    void addItem();
  }

  return (
    <>
      {!customerReady ? (
        <PublicAuthControls
          onAuthenticated={(role) => {
            if (role === "customer") {
              setCustomerReady(true);
              setAuthOpen(false);
              router.push(subscriptionReturnHref(window.location.pathname));
            } else {
              setMessage("A customer account is required to shop.");
            }
          }}
          onOpenChange={setAuthOpen}
          open={authOpen}
          redirectAfterAuth={false}
          session={null}
          showTriggers={false}
        />
      ) : null}
      <Button
        className="sticky bottom-[5rem] z-30 shadow-[0_10px_30px_rgba(22,101,52,0.2)] sm:static sm:shadow-none"
        loading={pending}
        onClick={requestAdd}
        type="button"
      >
        Add to weekly cart
      </Button>
      <Button disabled={pending} onClick={() => void saveItem()} tone="secondary" type="button">
        Save for later
      </Button>
      {message ? (
        <p className="text-sm text-market-muted" role="status">
          {message}
        </p>
      ) : null}
    </>
  );
}
