"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AuthMode = "sign-in" | "sign-up" | "forgot-password";

export function AuthControls({ signedIn }: Readonly<{ signedIn: boolean }>) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (signedIn) {
    return (
      <div className="auth-controls">
        <button
          className="button button-small button-outline"
          disabled={pending}
          onClick={() => {
            void (async () => {
              setPending(true);
              setMessage(null);
              const response = await fetch("/api/auth/sign-out", { method: "POST" });
              if (!response.ok) {
                setMessage("We could not sign you out. Please try again.");
                setPending(false);
                return;
              }
              router.refresh();
            })();
          }}
          type="button"
        >
          {pending ? "Signing out..." : "Sign out"}
        </button>
        {message ? (
          <p className="auth-message" role="alert">
            {message}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="auth-controls">
      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          const currentTarget = event.currentTarget;
          void (async () => {
            setPending(true);
            setMessage(null);
            const form = new FormData(currentTarget);
            if (mode === "forgot-password") {
              const response = await fetch("/api/auth/request-password-reset", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  email: form.get("email"),
                  redirectTo: `${window.location.origin}/reset-password`,
                }),
              });
              setMessage(
                response.ok
                  ? "If that email exists, a reset link is on its way."
                  : "We could not send a reset link. Please try again.",
              );
              setPending(false);
              return;
            }
            const endpoint = mode === "sign-in" ? "sign-in" : "sign-up";
            const response = await fetch(`/api/auth/${endpoint}/email`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                email: form.get("email"),
                password: form.get("password"),
                ...(mode === "sign-up" ? { name: form.get("name") } : {}),
              }),
            });
            if (!response.ok) {
              const payload = (await response.json().catch(() => null)) as {
                message?: string;
                error?: string;
              } | null;
              setMessage(payload?.message ?? payload?.error ?? "Authentication failed.");
              setPending(false);
              return;
            }
            router.replace("/shop");
            router.refresh();
          })();
        }}
      >
        {mode === "sign-up" ? (
          <input aria-label="Name" name="name" placeholder="Name" required />
        ) : null}
        <input
          aria-label="Email"
          autoComplete="email"
          name="email"
          placeholder="Email"
          required
          type="email"
        />
        {mode !== "forgot-password" ? (
          <input
            aria-label="Password"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            minLength={8}
            name="password"
            placeholder="Password"
            required
            type="password"
          />
        ) : null}
        <button className="button button-small" disabled={pending} type="submit">
          {pending
            ? "Working..."
            : mode === "sign-in"
              ? "Sign in"
              : mode === "sign-up"
                ? "Create account"
                : "Send reset link"}
        </button>
      </form>
      {mode === "sign-in" ? (
        <button
          className="auth-switch"
          onClick={() => {
            setMode("forgot-password");
            setMessage(null);
          }}
          type="button"
        >
          Forgot password?
        </button>
      ) : null}
      <button
        className="auth-switch"
        onClick={() => {
          setMode(mode === "sign-in" || mode === "forgot-password" ? "sign-up" : "sign-in");
          setMessage(null);
        }}
        type="button"
      >
        {mode === "sign-in" ? "Create an account" : "Already have an account? Sign in"}
      </button>
      {message ? (
        <p className="auth-message" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
