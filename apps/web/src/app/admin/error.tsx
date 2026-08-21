"use client";

import { RouteError } from "../../components/feedback";

export default function AdminError({ reset }: Readonly<{ reset: () => void }>) {
  return <RouteError reset={reset} />;
}
