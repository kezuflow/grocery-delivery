"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import type { PlanResponse } from "@carbon/contracts";

import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";

export function PlanSelector({
  plans,
  currentPlanId,
  mode,
  trialEligible = false,
}: Readonly<{
  plans: readonly PlanResponse["data"][];
  currentPlanId?: string;
  mode: "create" | "change";
  trialEligible?: boolean;
}>) {
  const router = useRouter();
  const request = useRef<Readonly<{ planId: string; idempotencyKey: string }> | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  async function choose(planId: string) {
    if (request.current?.planId !== planId) {
      request.current = { planId, idempotencyKey: crypto.randomUUID() };
    }
    setPending(planId);
    setMessage(null);
    try {
      const client = createApiClient(createSameOriginApiTransport());
      if (mode === "change") {
        await client.performSubscriptionAction(
          { action: "change-plan", planId },
          request.current.idempotencyKey,
        );
      } else {
        if (trialEligible) {
          await client.activateFreeTrial({ planId }, request.current.idempotencyKey);
        } else {
          await client.createSubscription({ planId }, request.current.idempotencyKey);
        }
      }
      request.current = null;
      setSelectedPlanId(null);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof ApiClientError ? error.message : "We could not start your subscription.",
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="plan-selector">
      {mode === "change" ? (
        <p className="subscription-note">Choose a plan for the next delivery cycle.</p>
      ) : null}
      {plans.map((plan) => (
        <button
          className="button button-small button-outline"
          disabled={pending !== null || plan.id === currentPlanId}
          key={plan.id}
          onClick={() => {
            setMessage(null);
            setSelectedPlanId(plan.id);
          }}
          type="button"
        >
          {pending === plan.id
            ? "Saving..."
            : mode === "change"
              ? `Switch to ${plan.name}`
              : `Choose ${plan.name}`}
        </button>
      ))}
      {selectedPlan ? (
        <div className="subscription-actions" role="status">
          <p className="subscription-note">
            Confirm {mode === "change" ? "switching to" : "starting"} {selectedPlan.name}.{" "}
            {trialEligible ? "Your first calendar month is free, then " : ""}
            {new Intl.NumberFormat("en-PH", {
              style: "currency",
              currency: "PHP",
            }).format(selectedPlan.weeklyFee.centavos / 100)}{" "}
            per week applies.
          </p>
          <div className="subscription-action-buttons">
            <button
              className="button button-small"
              disabled={pending !== null}
              onClick={() => void choose(selectedPlan.id)}
              type="button"
            >
              {pending === selectedPlan.id
                ? "Saving..."
                : trialEligible
                  ? "Activate 1-month free trial"
                  : "Confirm plan"}
            </button>
            <button
              className="button button-small button-outline"
              disabled={pending !== null}
              onClick={() => setSelectedPlanId(null)}
              type="button"
            >
              Keep browsing
            </button>
          </div>
        </div>
      ) : null}
      {message ? (
        <p className="auth-message" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
