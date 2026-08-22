import { PublicShell } from "../../components/layout";
import type { SessionSummary } from "../../lib/permissions";
import type { StorefrontData } from "../../lib/storefront";
import { PublicAuthControls } from "../auth";
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
  sessionError,
}: Readonly<{
  storefront: StorefrontData;
  session: SessionSummary | null;
  sessionError: string | null;
}>) {
  return (
    <PublicShell
      actions={<PublicAuthControls session={session} />}
      navigation={[
        { href: "#market", label: "Market" },
        { href: "#how-it-works", label: "How it works" },
        { href: "#plans", label: "Plans" },
      ]}
    >
      <StorefrontHero banner={storefront.banners[0]} session={session} />
      <SessionNotice error={sessionError} session={session} />
      <StorefrontBenefits />
      <StorefrontCatalog session={session} storefront={storefront} />
      <StorefrontProcess />
      <StorefrontPlans session={session} storefront={storefront} />
      <StorefrontTrial session={session} />
      <StorefrontFooter />
    </PublicShell>
  );
}

function SessionNotice({
  error,
  session,
}: Readonly<{ error: string | null; session: SessionSummary | null }>) {
  if (!error && !session) return null;

  return (
    <div
      className={
        error
          ? "border-b border-red-200 bg-red-50 px-5 py-3 text-center text-sm font-bold text-danger"
          : "border-b border-[#d8ad42] bg-sun px-5 py-3 text-center text-sm font-bold text-ink"
      }
      role="status"
    >
      {error ?? `Your ${session?.role ?? "customer"} session is active.`}
    </div>
  );
}
