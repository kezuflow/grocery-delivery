"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { SignOutButton } from "../../components/layout";
import { Button, Dialog, Input, LinkButton } from "../../components/ui";
import { getAuthErrorMessage } from "../../lib/auth-error";
import type { SessionSummary } from "../../lib/permissions";
import { getRoleHome } from "../../lib/permissions";

type AuthMode = "sign-in" | "sign-up" | "forgot-password";

type PublicAuthControlsProps = Readonly<{
  session: SessionSummary | null;
  inverse?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAuthenticated?: (role: SessionSummary["role"]) => void;
  showTriggers?: boolean;
  redirectAfterAuth?: string | false;
}>;

export function PublicAuthControls({
  session,
  inverse = false,
  open: controlledOpen,
  onOpenChange,
  onAuthenticated,
  showTriggers = true,
  redirectAfterAuth,
}: PublicAuthControlsProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [internalOpen, setInternalOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const open = controlledOpen ?? internalOpen;

  function setDialogOpen(nextOpen: boolean) {
    if (controlledOpen === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }

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
    setDialogOpen(true);
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
      setMessage(
        getAuthErrorMessage(await response.json().catch(() => null), "Authentication failed."),
      );
      setPending(false);
      return;
    }
    const sessionResponse = await fetch("/api/v1/me", { cache: "no-store" });
    const sessionPayload = (await sessionResponse.json().catch(() => null)) as {
      data?: { role?: SessionSummary["role"] };
    } | null;
    setDialogOpen(false);
    if (sessionPayload?.data?.role) onAuthenticated?.(sessionPayload.data.role);
    const destination =
      redirectAfterAuth === false
        ? null
        : (redirectAfterAuth ??
          (sessionPayload?.data?.role ? getRoleHome(sessionPayload.data.role) : "/"));
    if (destination) router.replace(destination);
    router.refresh();
  }

  return (
    <>
      {showTriggers ? (
        <div className="flex items-center gap-2">
          <Button
            className={inverse ? "text-white hover:bg-white/10 hover:text-white" : undefined}
            onClick={() => chooseMode("sign-in")}
            size="sm"
            tone="ghost"
            type="button"
          >
            Sign in
          </Button>
          <Button
            onClick={() => chooseMode("sign-up")}
            size="sm"
            tone={inverse ? "accent" : "primary"}
            type="button"
          >
            Join Carbon
          </Button>
        </div>
      ) : null}
      <Dialog
        description="Use your email to access your weekly shop."
        onClose={() => setDialogOpen(false)}
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
