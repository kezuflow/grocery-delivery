"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";

export function NotificationPreferencesForm({
  initial,
}: Readonly<{ initial: { deliveryUpdates: boolean; marketing: boolean } }>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void (async () => {
          setBusy(true);
          try {
            await createApiClient(createSameOriginApiTransport()).updateNotificationPreferences({
              deliveryUpdates: form.get("deliveryUpdates") === "on",
              marketing: form.get("marketing") === "on",
            });
            setMessage("Notification preferences saved.");
            router.refresh();
          } catch (error) {
            setMessage(
              error instanceof ApiClientError ? error.message : "Preferences could not be saved.",
            );
          } finally {
            setBusy(false);
          }
        })();
      }}
    >
      <label>
        <input name="deliveryUpdates" type="checkbox" defaultChecked={initial.deliveryUpdates} />{" "}
        Delivery updates
      </label>
      <label>
        <input name="marketing" type="checkbox" defaultChecked={initial.marketing} /> Marketing
        messages
      </label>
      <button type="submit" disabled={busy}>
        Save preferences
      </button>
      {message ? (
        <p className="subscription-note" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
