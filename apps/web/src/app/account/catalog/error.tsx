"use client";

import { RouteError } from "../../../components/feedback";

export default function CatalogError({ reset }: Readonly<{ reset: () => void }>) {
  return <RouteError reset={reset} />;
}
