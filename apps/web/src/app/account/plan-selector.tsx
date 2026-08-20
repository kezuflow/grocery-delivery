"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import type { PlanResponse } from "@carbon/contracts";

import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";

export function PlanSelector({ plans }: Readonly<{ plans: readonly PlanResponse["data"][] }>) {
  const router = useRouter();
  const request = useRef<Readonly<{ planId: string; idempotencyKey: string }> | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function choose(planId: string) {
    if (request.current?.planId !== planId) {
      request.current = { planId, idempotencyKey: crypto.randomUUID() };
    }
    setPending(planId);
    setMessage(null);
    try {
      await createApiClient(createSameOriginApiTransport()).createSubscription(
        { planId },
        request.current.idempotencyKey,
      );
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
      {plans.map((plan) => (
        <button
          className="button button-small button-outline"
          disabled={pending !== null}
          key={plan.id}
          onClick={() => void choose(plan.id)}
          type="button"
        >
          {pending === plan.id ? "Starting..." : `Choose ${plan.name}`}
        </button>
      ))}
      {message ? (
        <p className="auth-message" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
