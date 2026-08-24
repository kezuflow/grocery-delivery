import type { Metadata } from "next";

import { FreshMarketsLanding } from "../features/landing/freshmarkets-landing";

export const metadata: Metadata = {
  title: "Groceries that fit your life",
  description:
    "Market-fresh produce and everyday essentials packed in a box and delivered on your schedule.",
};

export default function HomePage() {
  return <FreshMarketsLanding />;
}
