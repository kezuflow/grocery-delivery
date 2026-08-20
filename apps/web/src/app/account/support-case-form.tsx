"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";

export function SupportCaseForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        void (async () => {
          setBusy(true);
          setMessage(null);
          try {
            await createApiClient(createSameOriginApiTransport()).createSupportCase(
              { subject: form.get("subject"), message: form.get("message") },
              idempotencyKey,
            );
            setIdempotencyKey(crypto.randomUUID());
            formElement.reset();
            setMessage("Your request has been submitted.");
            router.refresh();
          } catch (error) {
            setMessage(
              error instanceof ApiClientError
                ? error.message
                : "The request could not be submitted.",
            );
          } finally {
            setBusy(false);
          }
        })();
      }}
    >
      <input name="subject" placeholder="Subject" maxLength={120} required />
      <textarea name="message" placeholder="How can we help?" maxLength={4000} required />
      <button type="submit" disabled={busy}>
        {busy ? "Submitting..." : "Contact support"}
      </button>
      {message ? (
        <p className="subscription-note" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
