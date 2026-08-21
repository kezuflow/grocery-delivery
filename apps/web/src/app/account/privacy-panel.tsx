"use client";

import type { CustomerAccountData } from "../../lib/account";
import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";
import { useMemo, useState } from "react";

export function PrivacyPanel({ privacy }: Readonly<{ privacy: CustomerAccountData["privacy"] }>) {
  const client = useMemo(() => createApiClient(createSameOriginApiTransport()), []);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const downloadExport = () => {
    if (!privacy.export) return;
    const blob = new Blob([JSON.stringify(privacy.export, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "carbon-account-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Your account export has been downloaded.");
  };

  const requestDeletion = async () => {
    setBusy(true);
    try {
      const response = await client.requestAccountDeletion(crypto.randomUUID());
      setMessage(
        response.data.eligible
          ? "Your deletion request was recorded for review."
          : `Deletion is not available yet: ${response.data.reasons.join(", ")}.`,
      );
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : "Deletion request failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="account-panel account-panel-wide" id="privacy">
      <div className="account-panel-heading">
        <p className="eyebrow">Privacy and data</p>
        <span>{privacy.deletionEligible ? "deletion eligible" : "retention applies"}</span>
      </div>
      <p>
        Export your profile, consent history, and active-session inventory. Order and payment
        records may be retained when required for delivery, refunds, accounting, or legal
        obligations.
      </p>
      <div className="deliveryman-actions">
        <button className="button button-small" type="button" onClick={downloadExport}>
          Download account export
        </button>
        <button
          className="button button-small"
          disabled={busy || !privacy.deletionEligible}
          type="button"
          onClick={() => void requestDeletion()}
        >
          {busy ? "Requesting..." : "Request account deletion"}
        </button>
      </div>
      {!privacy.deletionEligible ? (
        <p className="subscription-note">
          Deletion eligibility: {privacy.deletionReasons.join(", ")}
        </p>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </article>
  );
}
