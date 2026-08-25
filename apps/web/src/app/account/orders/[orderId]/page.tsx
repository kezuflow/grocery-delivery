import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MarketplacePageShell } from "../../../../components/layout";
import { CustomerOrderDetailView } from "../../../../features/orders";
import { requireCustomerSession } from "../../../../lib/auth";
import { loadCustomerOrderDetail } from "../../../../lib/orders";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order details" };

export default async function OrderDetailPage({
  params,
}: Readonly<{ params: Promise<{ orderId: string }> }>) {
  const session = await requireCustomerSession();
  const { orderId } = await params;
  const detail = await loadCustomerOrderDetail(orderId);
  if (!detail) notFound();
  return (
    <MarketplacePageShell
      description="Track this customer-owned order and review its server-confirmed receipt."
      eyebrow="Order details"
      session={session}
      title={orderId}
    >
      <CustomerOrderDetailView customerId={session.customerId!} detail={detail} />
    </MarketplacePageShell>
  );
}
