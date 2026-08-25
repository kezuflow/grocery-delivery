import type { Metadata } from "next";

import { MarketplacePageShell } from "../../../components/layout";
import { CustomerOrderList } from "../../../features/orders";
import { requireCustomerSession } from "../../../lib/auth";
import { loadCustomerOrders } from "../../../lib/orders";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order history" };

export default async function OrdersPage() {
  const session = await requireCustomerSession();
  const orders = await loadCustomerOrders();
  return (
    <MarketplacePageShell
      description="Review locked orders, totals, payment state, and delivery progress."
      eyebrow="Your weekly shop"
      session={session}
      title="Order history"
    >
      <CustomerOrderList orders={orders} />
    </MarketplacePageShell>
  );
}
