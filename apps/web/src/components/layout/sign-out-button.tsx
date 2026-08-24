"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/auth/sign-out", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    if (!response.ok) {
      setError("Sign out failed. Please try again.");
      setPending(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="grid justify-items-end gap-1">
      <button
        aria-label="Sign out"
        className="inline-flex min-h-9 items-center gap-2 rounded-md border border-transparent px-2.5 text-xs font-semibold text-admin-text-secondary transition-colors hover:border-admin-border hover:bg-admin-surface-hover hover:text-admin-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent disabled:cursor-not-allowed disabled:opacity-50"
        disabled={pending}
        onClick={() => void signOut()}
        type="button"
      >
        <LogOut aria-hidden="true" size={14} />
        {pending ? "Signing out..." : "Sign out"}
      </button>
      {error ? (
        <span className="text-xs text-danger" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
