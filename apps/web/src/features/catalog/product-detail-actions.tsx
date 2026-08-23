"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { CatalogSkuResponse, PlanResponse, SubscriptionResponse } from "@carbon/contracts";

import { Button, Dialog } from "../../components/ui";
import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";
import type { SessionSummary } from "../../lib/permissions";
import { PublicAuthControls } from "../auth";

export function ProductDetailActions({
  item,
  plans,
  session,
  subscription,
}: Readonly<{
  item: CatalogSkuResponse;
  plans: readonly PlanResponse["data"][];
  session: SessionSummary | null;
  subscription: SubscriptionResponse["data"] | null;
}>) {
  const router = useRouter();
  const [customerReady, setCustomerReady] = useState(session?.role === "customer");
  const [subscriptionReady, setSubscriptionReady] = useState(subscription?.status === "active");
  const [authOpen, setAuthOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [planPending, setPlanPending] = useState<string | null>(null);
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

  function requestAdd() {
    if (!customerReady) {
      setAuthOpen(true);
      return;
    }
    if (!subscriptionReady) {
      setPlanOpen(true);
      return;
    }
    void addItem();
  }

  async function activatePlan(planId: string) {
    setPlanPending(planId);
    setMessage(null);
    try {
      await createApiClient(createSameOriginApiTransport()).activateFreeTrial(
        { planId },
        crypto.randomUUID(),
      );
      setSubscriptionReady(true);
      setPlanOpen(false);
      await addItem();
    } catch (error) {
      setMessage(
        error instanceof ApiClientError ? error.message : "We could not activate your plan.",
      );
    } finally {
      setPlanPending(null);
    }
  }

  return (
    <>
      {!customerReady ? (
        <PublicAuthControls
          onAuthenticated={(role) => {
            if (role === "customer") {
              setCustomerReady(true);
              setAuthOpen(false);
              setPlanOpen(true);
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
      <Button loading={pending} onClick={requestAdd} type="button">
        Add to weekly cart
      </Button>
      {message ? (
        <p className="text-sm text-market-muted" role="status">
          {message}
        </p>
      ) : null}
      <Dialog
        description="Choose an active plan before adding your first item. Your first calendar month is free."
        onClose={() => setPlanOpen(false)}
        open={planOpen}
        title="Choose your weekly plan"
      >
        <div className="grid gap-3">
          {plans.map((plan) => (
            <button
              className="rounded border border-market-line px-4 py-3 text-left hover:border-market-green"
              disabled={planPending !== null}
              key={plan.id}
              onClick={() => void activatePlan(plan.id)}
              type="button"
            >
              <strong className="block">{plan.name}</strong>
              <span className="text-sm text-market-muted">
                {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
                  plan.weeklyFee.centavos / 100,
                )}{" "}
                per week
              </span>
              {planPending === plan.id ? (
                <span className="block text-sm">Activating...</span>
              ) : null}
            </button>
          ))}
        </div>
      </Dialog>
    </>
  );
}
