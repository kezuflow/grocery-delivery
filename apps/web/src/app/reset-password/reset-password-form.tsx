"use client";

import { useState } from "react";

export function ResetPasswordForm({ token }: Readonly<{ token: string | null }>) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!token) {
    return (
      <p className="auth-message" role="alert">
        This reset link is invalid or has expired.
      </p>
    );
  }

  return (
    <form
      className="reset-password-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void (async () => {
          setPending(true);
          setMessage(null);
          const response = await fetch("/api/auth/reset-password", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token, newPassword: form.get("password") }),
          });
          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as {
              message?: string;
              error?: string;
            } | null;
            setMessage(
              payload?.message ?? payload?.error ?? "The reset link is invalid or expired.",
            );
            setPending(false);
            return;
          }
          setMessage("Password updated. You can now sign in.");
          setPending(false);
        })();
      }}
    >
      <label>
        New password
        <input autoComplete="new-password" minLength={8} name="password" required type="password" />
      </label>
      <button className="button" disabled={pending} type="submit">
        {pending ? "Updating..." : "Update password"}
      </button>
      {message ? (
        <p className="auth-message" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
