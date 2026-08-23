import type { Metadata } from "next";

import { AppShell } from "../../../components/layout";
import { loadCustomerAccount } from "../../../lib/account";
import { requireCustomerSession } from "../../../lib/auth";
import { normalizeSubscriptionReturnTo } from "../../../lib/subscription-onboarding";
import { SubscriptionOnboarding } from "./subscription-onboarding";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Choose a weekly plan" };

export default async function SubscribePage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ returnTo?: string }> }>) {
  const session = await requireCustomerSession();
  const account = await loadCustomerAccount();
  const returnTo = normalizeSubscriptionReturnTo((await searchParams).returnTo);

  return (
    <AppShell
      breadcrumbs={[
        { href: "/", label: "Storefront" },
        { href: "/account", label: "Account" },
        { label: "Weekly plan" },
      ]}
      description="Choose a server-owned weekly plan, then return to your saved shopping flow."
      eyebrow="Your weekly shop"
      session={session}
      title="Choose a weekly plan"
    >
      {account.error ? (
        <section className="account-state" role="alert">
          <h2>Plans temporarily unavailable</h2>
          <p>{account.error}</p>
        </section>
      ) : (
        <SubscriptionOnboarding
          plans={account.plans}
          returnTo={returnTo}
          subscription={account.subscription}
        />
      )}
    </AppShell>
  );
}
