"use client";

import { RouteError } from "../../components/feedback";

export default function DeliverymanError({ reset }: Readonly<{ reset: () => void }>) {
  return <RouteError reset={reset} />;
}
