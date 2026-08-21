"use client";

import { RouteError } from "../components/feedback";

export default function StorefrontError({ reset }: Readonly<{ reset: () => void }>) {
  return <RouteError reset={reset} />;
}
