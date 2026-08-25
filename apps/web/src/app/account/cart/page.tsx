import type { Metadata } from "next";

import { MarketplacePageShell } from "../../../components/layout";
import { CartEditor } from "../../../features/checkout";
import { requireCustomerSession } from "../../../lib/auth";
import { loadCustomerCatalog } from "../../../lib/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your cart" };

export default async function CartPage() {
  const session = await requireCustomerSession();
  const data = await loadCustomerCatalog();

  return (
    <MarketplacePageShell
      description="Adjust quantities and save the cart before checkout. Prices are refreshed by the server."
      eyebrow="Your weekly shop"
      session={session}
      title="Your cart"
    >
      <CartEditor catalog={data.catalog} error={data.error} initialCart={data.cart} />
    </MarketplacePageShell>
  );
}
