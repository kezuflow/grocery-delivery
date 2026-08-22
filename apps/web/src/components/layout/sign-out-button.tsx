"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "../ui";

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
      <Button loading={pending} onClick={() => void signOut()} size="sm" tone="ghost" type="button">
        Sign out
      </Button>
      {error ? (
        <span className="text-xs text-danger" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
