"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import type { SubscriptionActionRequest, SubscriptionResponse } from "@carbon/contracts";

import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";

type SubscriptionAction = SubscriptionActionRequest["action"];
type LifecycleAction = Exclude<SubscriptionAction, "change-plan">;
type SubscriptionStatus = SubscriptionResponse["data"]["status"];

const labels: Record<LifecycleAction, string> = {
  pause: "Pause subscription",
  resume: "Resume subscription",
  skip: "Skip this week",
  cancel: "Cancel subscription",
};

function availableActions(status: SubscriptionStatus): readonly LifecycleAction[] {
  if (status === "active") return ["pause", "skip", "cancel"];
  if (status === "paused") return ["resume", "cancel"];
  return [];
}

export function SubscriptionActions({
  status,
  skippedCycleId,
  billingStatus = "current",
}: Readonly<{
  status: SubscriptionStatus;
  skippedCycleId: string | null;
  billingStatus?: SubscriptionResponse["data"]["billingStatus"];
}>) {
  const router = useRouter();
  const idempotencyKeys = useRef(new Map<LifecycleAction, string>());
  const [pendingAction, setPendingAction] = useState<LifecycleAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const actions = billingStatus === "past_due" ? (["cancel"] as const) : availableActions(status);

  async function perform(action: LifecycleAction) {
    if (action === "cancel" && !window.confirm("Cancel your weekly subscription?")) return;

    setPendingAction(action);
    setMessage(null);
    const idempotencyKey = idempotencyKeys.current.get(action) ?? crypto.randomUUID();
    idempotencyKeys.current.set(action, idempotencyKey);

    try {
      const client = createApiClient(createSameOriginApiTransport());
      await client.performSubscriptionAction({ action }, idempotencyKey);
      idempotencyKeys.current.delete(action);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof ApiClientError ? error.message : "We could not update your subscription.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  if (actions.length === 0) {
    return <p className="subscription-note">This subscription has ended.</p>;
  }

  return (
    <div className="subscription-actions">
      {billingStatus === "past_due" ? (
        <p className="subscription-note order-message-error">
          Billing is past due. Ordering and plan changes are unavailable until payment recovers.
        </p>
      ) : null}
      {skippedCycleId ? <p className="subscription-note">A delivery cycle is skipped.</p> : null}
      <div className="subscription-action-buttons">
        {actions.map((action) => (
          <button
            className={`button button-small${action === "cancel" ? " button-danger" : " button-outline"}`}
            disabled={pendingAction !== null}
            key={action}
            onClick={() => void perform(action)}
            type="button"
          >
            {pendingAction === action ? "Updating..." : labels[action]}
          </button>
        ))}
      </div>
      {message ? (
        <p className="auth-message" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
