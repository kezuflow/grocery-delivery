import { PublicShell } from "../../components/layout";
import { ArrowRight } from "lucide-react";
import { LinkButton } from "../../components/ui";
import type { SessionSummary } from "../../lib/permissions";
import type { StorefrontData } from "../../lib/storefront";
import { StorefrontBenefits } from "./storefront-benefits";
import { StorefrontCatalog } from "./storefront-catalog";
import { StorefrontFooter } from "./storefront-footer";
import { StorefrontHero } from "./storefront-hero";
import { StorefrontPlans } from "./storefront-plans";
import { StorefrontProcess } from "./storefront-process";
import { StorefrontTrial } from "./storefront-trial";

export function StorefrontContent({
  storefront,
  session,
}: Readonly<{
  storefront: StorefrontData;
  session: SessionSummary | null;
}>) {
  return (
    <PublicShell
      actions={
        <LinkButton href="/shop" size="sm">
          Go to app
          <ArrowRight aria-hidden="true" size={16} />
        </LinkButton>
      }
      navigation={[
        { href: "#market", label: "Market" },
        { href: "#how-it-works", label: "How it works" },
        { href: "#plans", label: "Plans" },
      ]}
    >
      <StorefrontHero banner={storefront.banners[0]} session={session} />
      <StorefrontBenefits />
      <StorefrontCatalog storefront={storefront} />
      <StorefrontProcess />
      <StorefrontPlans storefront={storefront} />
      <StorefrontTrial session={session} />
      <StorefrontFooter />
    </PublicShell>
  );
}

export function getSessionErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "We could not verify your session. Please try again shortly.";
}
