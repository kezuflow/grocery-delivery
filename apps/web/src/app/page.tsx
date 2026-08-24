import type { Metadata } from "next";

import { FreshMarketsLanding } from "../features/landing/freshmarkets-landing";

export const metadata: Metadata = {
  title: "Good food. Better value.",
  description:
    "Fresh produce, local staples, and dinner-worthy ingredients delivered when your week needs them most.",
};

export default function HomePage() {
  return <FreshMarketsLanding />;
}
