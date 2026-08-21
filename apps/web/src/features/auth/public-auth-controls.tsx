"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { SignOutButton } from "../../components/layout";
import { Button, Dialog, Input, LinkButton } from "../../components/ui";
import type { SessionSummary } from "../../lib/permissions";
import { getRoleHome } from "../../lib/permissions";

type AuthMode = "sign-in" | "sign-up" | "forgot-password";

export function PublicAuthControls({ session }: Readonly<{ session: SessionSummary | null }>) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (session) {
    return (
      <div className="flex items-center gap-2">
        <LinkButton href={getRoleHome(session.role)} size="sm">
          Open account
        </LinkButton>
        <SignOutButton />
      </div>
    );
  }

  function chooseMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage(null);
    setOpen(true);
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);

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
    setOpen(false);
    router.replace("/shop");
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button onClick={() => chooseMode("sign-in")} size="sm" tone="ghost" type="button">
          Sign in
        </Button>
        <Button onClick={() => chooseMode("sign-up")} size="sm" type="button">
          Join Carbon
        </Button>
      </div>
      <Dialog
        description="Use your email to access your weekly shop."
        onClose={() => setOpen(false)}
        open={open}
        title={getDialogTitle(mode)}
      >
        <form className="grid gap-4" onSubmit={(event) => void submitAuth(event)}>
          {mode === "sign-up" ? (
            <Input autoComplete="name" id="auth-name" label="Name" name="name" required />
          ) : null}
          <Input
            autoComplete="email"
            id="auth-email"
            label="Email"
            name="email"
            required
            type="email"
          />
          {mode !== "forgot-password" ? (
            <Input
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              id="auth-password"
              label="Password"
              minLength={8}
              name="password"
              required
              type="password"
            />
          ) : null}
          <Button loading={pending} type="submit">
            {getSubmitLabel(mode)}
          </Button>
          <div className="flex flex-wrap gap-3 text-sm">
            {mode === "sign-in" ? (
              <button
                className="font-bold text-muted underline-offset-4 hover:text-ink hover:underline"
                onClick={() => setMode("forgot-password")}
                type="button"
              >
                Forgot password?
              </button>
            ) : null}
            <button
              className="font-bold text-muted underline-offset-4 hover:text-ink hover:underline"
              onClick={() => setMode(mode === "sign-up" ? "sign-in" : "sign-up")}
              type="button"
            >
              {mode === "sign-up" ? "Already registered? Sign in" : "Create an account"}
            </button>
          </div>
          {message ? (
            <p className="text-sm text-muted" role="status">
              {message}
            </p>
          ) : null}
        </form>
      </Dialog>
    </>
  );
}

function getDialogTitle(mode: AuthMode): string {
  if (mode === "sign-up") return "Create your account";
  if (mode === "forgot-password") return "Reset your password";
  return "Welcome back";
}

function getSubmitLabel(mode: AuthMode): string {
  if (mode === "sign-up") return "Create account";
  if (mode === "forgot-password") return "Send reset link";
  return "Sign in";
}
