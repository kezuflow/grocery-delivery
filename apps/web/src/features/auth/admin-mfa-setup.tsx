"use client";

import type { FormEvent } from "react";
import { CheckCircle2, Copy, KeyRound, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Card, CardDescription, CardHeader, CardTitle, Input } from "../../components/ui";
import { getAuthErrorMessage } from "../../lib/auth-error";

type Enrollment = Readonly<{
  secret: string;
  totpUri: string;
  backupCodes: readonly string[];
}>;

export function AdminMfaSetup() {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState<"secret" | "backup" | null>(null);

  async function beginEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/two-factor/enable", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        password: form.get("password"),
        method: "totp",
        issuer: "Carbon Food Delivery",
      }),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage(getAuthErrorMessage(payload, "We could not start authenticator setup."));
      setPending(false);
      return;
    }
    const nextEnrollment = parseMfaEnrollment(payload);
    if (!nextEnrollment) {
      setMessage("Authenticator setup returned an incomplete response. Please try again.");
      setPending(false);
      return;
    }
    setEnrollment(nextEnrollment);
    setPending(false);
  }

  async function verifyEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
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
    router.replace("/admin/catalog");
    router.refresh();
  }

  async function copyValue(kind: "secret" | "backup", value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <Card>
        <CardHeader>
          <div className="mb-2 grid size-10 place-items-center rounded-full bg-emerald-50 text-emerald-700">
            <ShieldCheck aria-hidden="true" size={20} />
          </div>
          <CardTitle>Protect your administrator account</CardTitle>
          <CardDescription>
            Carbon requires an authenticator code before opening operational data or making catalog
            changes. Setup takes about a minute.
          </CardDescription>
        </CardHeader>

        {!enrollment ? (
          <form className="grid gap-4" onSubmit={(event) => void beginEnrollment(event)}>
            <Input
              autoComplete="current-password"
              id="mfa-password"
              label="Confirm your password"
              name="password"
              required
              type="password"
            />
            <Button className="justify-self-start" loading={pending} type="submit">
              Set up authenticator
            </Button>
          </form>
        ) : (
          <div className="grid gap-5">
            <section className="grid gap-3 rounded-lg border border-line bg-paper p-4">
              <div className="flex items-start gap-3">
                <KeyRound aria-hidden="true" className="mt-0.5 text-emerald-700" size={18} />
                <div>
                  <h3 className="font-bold">1. Add Carbon to your authenticator app</h3>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    Choose “enter a setup key”, use your Carbon email as the account name, and
                    select time-based codes.
                  </p>
                </div>
              </div>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                <code className="min-w-0 flex-1 break-all rounded bg-white px-3 py-2 text-sm">
                  {enrollment.secret}
                </code>
                <Button
                  onClick={() => void copyValue("secret", enrollment.secret)}
                  size="sm"
                  tone="secondary"
                  type="button"
                >
                  {copied === "secret" ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  {copied === "secret" ? "Copied" : "Copy key"}
                </Button>
              </div>
            </section>

            <form className="grid gap-4" onSubmit={(event) => void verifyEnrollment(event)}>
              <div>
                <h3 className="font-bold">2. Verify the six-digit code</h3>
                <p className="mt-1 text-sm text-muted">
                  Enter the current code shown for Carbon Food Delivery.
                </p>
              </div>
              <Input
                autoComplete="one-time-code"
                id="mfa-code"
                inputMode="numeric"
                label="Authenticator code"
                maxLength={6}
                name="code"
                pattern="[0-9]{6}"
                placeholder="000000"
                required
              />
              <Button className="justify-self-start" loading={pending} type="submit">
                Verify and open Catalog
              </Button>
            </form>

            <section className="grid gap-3 border-t border-line pt-5">
              <div>
                <h3 className="font-bold">3. Save your recovery codes</h3>
                <p className="mt-1 text-sm text-muted">
                  Store these somewhere safe. Each code can be used only once.
                </p>
              </div>
              <pre className="overflow-x-auto rounded-lg bg-[#171717] p-4 text-xs leading-6 text-white">
                {enrollment.backupCodes.join("\n")}
              </pre>
              <Button
                className="justify-self-start"
                onClick={() => void copyValue("backup", enrollment.backupCodes.join("\n"))}
                size="sm"
                tone="secondary"
                type="button"
              >
                {copied === "backup" ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                {copied === "backup" ? "Copied" : "Copy recovery codes"}
              </Button>
            </section>
          </div>
        )}

        {message ? (
          <p className="mt-4 text-sm font-medium text-red-700" role="alert">
            {message}
          </p>
        ) : null}
      </Card>
    </div>
  );
}

export function parseMfaEnrollment(value: unknown): Enrollment | null {
  if (!value || typeof value !== "object") return null;
  const payload =
    "data" in value && value.data && typeof value.data === "object" ? value.data : value;
  const record = payload as Record<string, unknown>;
  if (typeof record.totpURI !== "string" || !Array.isArray(record.backupCodes)) return null;
  const backupCodes = record.backupCodes.filter((code): code is string => typeof code === "string");
  const secret = new URL(record.totpURI).searchParams.get("secret");
  if (!secret || backupCodes.length === 0) return null;
  return { secret, totpUri: record.totpURI, backupCodes };
}
