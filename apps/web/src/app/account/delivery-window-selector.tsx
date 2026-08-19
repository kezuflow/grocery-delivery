"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { DeliveryWindowsResponse } from "@carbon/contracts";
import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";

export function DeliveryWindowSelector({
  initial,
}: Readonly<{ initial: DeliveryWindowsResponse["data"] }>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="delivery-window-selector">
      <p className="subscription-note">Saturday delivery windows for cycle {initial.cycleId}.</p>
      {initial.windows.length === 0 ? (
        <p className="subscription-note">No delivery windows are available yet.</p>
      ) : null}
      <div className="delivery-window-list">
        {initial.windows.map((window) => (
          <button
            className={`delivery-window-option${initial.selectedWindowId === window.id ? " selected" : ""}`}
            disabled={pending || window.remaining === 0}
            key={window.id}
            onClick={() => {
              void (async () => {
                setPending(true);
                setMessage(null);
                try {
                  await createApiClient(createSameOriginApiTransport()).selectDeliveryWindow({
                    windowId: window.id,
                  });
                  router.refresh();
                } catch (error) {
                  setMessage(
                    error instanceof ApiClientError
                      ? error.message
                      : "We could not select this window.",
                  );
                } finally {
                  setPending(false);
                }
              })();
            }}
            type="button"
          >
            <strong>{window.label}</strong>
            <span>{window.remaining} spots remaining</span>
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
