import type { Metadata } from "next";

import { AppShell } from "../../../components/layout";
import { CartEditor } from "../../../features/checkout";
import { requireCustomerSession } from "../../../lib/auth";
import { loadCustomerCatalog } from "../../../lib/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your cart" };

export default async function CartPage() {
  const session = await requireCustomerSession();
  const data = await loadCustomerCatalog();

  return (
    <AppShell
      breadcrumbs={[
        { href: "/", label: "Storefront" },
        { href: "/account", label: "Account" },
        { label: "Cart" },
      ]}
      description="Adjust quantities and save the cart before checkout. Prices are refreshed by the server."
      eyebrow="Your weekly shop"
      session={session}
      title="Your cart"
    >
      <CartEditor catalog={data.catalog} error={data.error} initialCart={data.cart} />
    </AppShell>
  );
}
