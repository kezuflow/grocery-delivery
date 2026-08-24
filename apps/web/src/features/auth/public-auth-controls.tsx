"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { SignOutButton } from "../../components/layout";
import { Button, Dialog, Input, LinkButton } from "../../components/ui";
import { getAuthErrorMessage } from "../../lib/auth-error";
import type { SessionSummary } from "../../lib/permissions";
import { getRoleHome } from "../../lib/permissions";

type AuthMode = "sign-in" | "sign-up" | "forgot-password" | "two-factor";

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

  async function finishAuthentication() {
    const sessionResponse = await fetch("/api/v1/me", { cache: "no-store" });
    const sessionPayload = (await sessionResponse.json().catch(() => null)) as {
      data?: { role?: SessionSummary["role"] };
    } | null;
    if (!sessionResponse.ok || !sessionPayload?.data?.role) {
      setMessage("Your session could not be loaded. Please try signing in again.");
      setPending(false);
      return;
    }
    setDialogOpen(false);
    onAuthenticated?.(sessionPayload.data.role);
    const destination =
      redirectAfterAuth === false
        ? null
        : (redirectAfterAuth ?? getRoleHome(sessionPayload.data.role));
    if (destination) router.replace(destination);
    router.refresh();
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);

    if (mode === "two-factor") {
      const response = await fetch("/api/auth/two-factor/verify-totp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: form.get("code"), trustDevice: true }),
      });
      if (!response.ok) {
        setMessage(
          getAuthErrorMessage(
            await response.json().catch(() => null),
            "That authenticator code could not be verified.",
          ),
        );
        setPending(false);
        return;
      }
      await finishAuthentication();
      return;
    }

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
    const authPayload = (await response.json().catch(() => null)) as {
      twoFactorRedirect?: boolean;
    } | null;
    if (authPayload?.twoFactorRedirect) {
      setMode("two-factor");
      setMessage("Enter the current code from your authenticator app.");
      setPending(false);
      return;
    }
    await finishAuthentication();
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
        description={
          mode === "two-factor"
            ? "Complete the security check to finish signing in."
            : "Use your email to access your weekly shop."
        }
        onClose={() => setDialogOpen(false)}
        open={open}
        title={getDialogTitle(mode)}
      >
        <form className="grid gap-4" onSubmit={(event) => void submitAuth(event)}>
          {mode === "two-factor" ? (
            <Input
              autoComplete="one-time-code"
              autoFocus
              id="auth-totp"
              inputMode="numeric"
              label="Authenticator code"
              maxLength={6}
              name="code"
              pattern="[0-9]{6}"
              placeholder="000000"
              required
            />
          ) : null}
          {mode === "sign-up" ? (
            <Input autoComplete="name" id="auth-name" label="Name" name="name" required />
          ) : null}
          {mode !== "two-factor" ? (
            <Input
              autoComplete="email"
              id="auth-email"
              label="Email"
              name="email"
              required
              type="email"
            />
          ) : null}
          {mode !== "forgot-password" && mode !== "two-factor" ? (
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
            {mode !== "two-factor" ? (
              <button
                className="font-bold text-muted underline-offset-4 hover:text-ink hover:underline"
                onClick={() => setMode(mode === "sign-up" ? "sign-in" : "sign-up")}
                type="button"
              >
                {mode === "sign-up" ? "Already registered? Sign in" : "Create an account"}
              </button>
            ) : null}
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
  if (mode === "two-factor") return "Enter your security code";
  if (mode === "sign-up") return "Create your account";
  if (mode === "forgot-password") return "Reset your password";
  return "Welcome back";
}

function getSubmitLabel(mode: AuthMode): string {
  if (mode === "two-factor") return "Verify and continue";
  if (mode === "sign-up") return "Create account";
  if (mode === "forgot-password") return "Send reset link";
  return "Sign in";
}
