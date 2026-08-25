import type { Metadata } from "next";

import { MarketplacePageShell } from "../../../components/layout";
import { SupportWorkspace } from "../../../features/support";
import { requireCustomerSession } from "../../../lib/auth";
import { loadCustomerAccount } from "../../../lib/account";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Support" };

export default async function SupportPage() {
  const session = await requireCustomerSession();
  const account = await loadCustomerAccount();
  return (
    <MarketplacePageShell
      description="Ask about an order, delivery, billing, or your account."
      eyebrow="Customer care"
      session={session}
      title="Support"
    >
      <SupportWorkspace
        initialCases={account.supportCases}
        orderRequests={account.orderRequests}
        orders={account.orderHistory}
      />
    </MarketplacePageShell>
  );
}
