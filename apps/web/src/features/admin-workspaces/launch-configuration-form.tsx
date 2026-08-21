"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";

export function LaunchConfigurationForm() {
  const router = useRouter();
  const client = createApiClient(createSameOriginApiTransport());
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <section
      className="account-panel account-panel-wide"
      aria-labelledby="launch-config-title"
      id="launch-configuration"
    >
      <div className="account-panel-heading">
        <p className="eyebrow" id="launch-config-title">
          Launch configuration
        </p>
        <span>{busy ? "Applying..." : "Superadmin only"}</span>
      </div>
      <p className="subscription-note">
        Import an approved catalog and delivery-window manifest. Prices are calculated by the server
        from procurement cost and markup; do not include final prices in the JSON.
      </p>
      <form
        className="launch-configuration-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const reasonValue = form.get("reason");
          const manifestValue = form.get("manifest");
          const reason = typeof reasonValue === "string" ? reasonValue : "";
          const manifestText = typeof manifestValue === "string" ? manifestValue : "";
          void applyManifest(reason, manifestText);
        }}
      >
        <label>
          Approval reason
          <input
            name="reason"
            maxLength={500}
            placeholder="Approved by launch owner on YYYY-MM-DD"
            required
          />
        </label>
        <label>
          Manifest JSON
          <textarea name="manifest" spellCheck={false} placeholder={manifestPlaceholder} required />
        </label>
        <div className="launch-configuration-actions">
          <button className="button button-small" type="submit" disabled={busy}>
            Apply approved manifest
          </button>
          <small>Retry key: {idempotencyKey}</small>
        </div>
        {message ? (
          <p className="order-message" role="status">
            {message}
          </p>
        ) : null}
      </form>
    </section>
  );

  async function applyManifest(reason: string, manifestText: string): Promise<void> {
    setBusy(true);
    setMessage(null);
    try {
      const manifest = parseManifest(manifestText);
      const response = await client.applyLaunchConfiguration(
        { ...manifest, reason },
        idempotencyKey,
      );
      const { categoryCount, skuCount, deliveryWindowCount, replayed } = response.data;
      setMessage(
        `${replayed ? "Replayed" : "Applied"} ${categoryCount} categories, ${skuCount} SKUs, and ${deliveryWindowCount} delivery windows.`,
      );
      if (!replayed) setIdempotencyKey(crypto.randomUUID());
      router.refresh();
    } catch (error) {
      setMessage(formatLaunchConfigurationError(error));
    } finally {
      setBusy(false);
    }
  }
}

function parseManifest(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("The manifest must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

function formatLaunchConfigurationError(error: unknown): string {
  if (error instanceof ApiClientError) {
    return `${error.message} (${error.code}${error.correlationId ? `, ${error.correlationId}` : ""})`;
  }
  if (error instanceof SyntaxError) return "The manifest is not valid JSON.";
  if (error instanceof Error && error.name === "ZodError") {
    return "The manifest fields do not match the launch-configuration contract.";
  }
  if (error instanceof Error) return error.message;
  return "The launch configuration could not be applied.";
}

const manifestPlaceholder = `Paste the approved JSON object here.

Required top-level arrays:
- categories
- skus (with procurementCostCentavos and markupBasisPoints)
- deliveryWindows`;
