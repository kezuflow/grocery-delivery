"use client";

import { useState } from "react";
import { createApiClient, createSameOriginApiTransport } from "../../lib/api/client";
import type { CustomerAccountData } from "../../lib/account";

type Props = Readonly<{
  substitutions: CustomerAccountData["orderSubstitutions"];
}>;

export function OrderSubstitutions({ substitutions: initial }: Props) {
  const [substitutions, setSubstitutions] = useState(initial);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  async function decide(id: string, decision: "accept" | "reject") {
    setPendingId(id);
    setMessage(null);
    try {
      const result = await createApiClient(createSameOriginApiTransport()).decideOrderSubstitution(
        id,
        decision,
        `customer-substitution-${id}-${decision}`,
      );
      setSubstitutions((current) => current.map((item) => (item.id === id ? result.data : item)));
    } catch {
      setMessage("We could not save that decision. Please try again.");
    } finally {
      setPendingId(null);
    }
  }
  return (
    <article className="account-panel account-panel-wide">
      <div className="account-panel-heading">
        <p className="eyebrow">Substitution decisions</p>
        <span>{substitutions.length} proposals</span>
      </div>
      {message ? <p role="status">{message}</p> : null}
      {substitutions.length === 0 ? (
        <div className="account-empty">
          <h2>No substitutions</h2>
          <p>If an item becomes unavailable, proposals will appear here for your decision.</p>
        </div>
      ) : (
        <ul className="account-history">
          {substitutions.map((substitution) => (
            <li key={substitution.id}>
              <span>
                {substitution.originalSkuId} → {substitution.substituteSkuId} ·{" "}
                {substitution.quantity} item{substitution.quantity === 1 ? "" : "s"}
              </span>
              <strong>{substitution.status}</strong>
              {substitution.status === "pending" ? (
                <span className="account-actions">
                  <button
                    className="button button-small"
                    disabled={pendingId === substitution.id}
                    onClick={() => {
                      void decide(substitution.id, "accept");
                    }}
                    type="button"
                  >
                    Accept
                  </button>
                  <button
                    className="button button-small button-secondary"
                    disabled={pendingId === substitution.id}
                    onClick={() => {
                      void decide(substitution.id, "reject");
                    }}
                    type="button"
                  >
                    Reject
                  </button>
                </span>
              ) : null}
              <small>{new Date(substitution.updatedAt).toLocaleDateString("en-PH")}</small>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
