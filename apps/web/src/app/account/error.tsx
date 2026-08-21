"use client";

import { RouteError } from "../../components/feedback";

export default function AccountError({ reset }: Readonly<{ reset: () => void }>) {
  return <RouteError reset={reset} />;
}
