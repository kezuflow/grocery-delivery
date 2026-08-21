"use client";

import { ErrorState } from "../ui";

export function RouteError({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-5 py-12 text-ink sm:px-8">
      <ErrorState
        className="w-full max-w-xl bg-white"
        description="The page could not finish loading. Please try again."
        onRetry={reset}
        title="This page is temporarily unavailable"
      />
    </main>
  );
}
