import type { Metadata } from "next";
import { MarketplacePageShell } from "../../../components/layout";
import { requireCustomerSession } from "../../../lib/auth";
import { loadCustomerAccount } from "../../../lib/account";
import { SavedItemsView } from "./saved-items-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Saved items" };

export default async function SavedItemsPage() {
  const session = await requireCustomerSession();
  const account = await loadCustomerAccount();
  return (
    <MarketplacePageShell
      description="Keep favorite groceries close for your next weekly shop."
      eyebrow="Your weekly shop"
      session={session}
      title="Saved items"
    >
      <SavedItemsView items={account.savedItems} />
    </MarketplacePageShell>
  );
}
