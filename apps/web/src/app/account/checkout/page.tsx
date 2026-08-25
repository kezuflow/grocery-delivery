import type { Metadata } from "next";

import { MarketplacePageShell } from "../../../components/layout";
import { CheckoutReview } from "../../../features/checkout";
import { requireCustomerSession } from "../../../lib/auth";
import { loadCheckoutData } from "../../../lib/checkout";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const session = await requireCustomerSession();
  const data = await loadCheckoutData();
  const subscriptionActive =
    data.subscription?.status === "active" && data.subscription.billingStatus === "current";

  return (
    <MarketplacePageShell
      description="Confirm delivery details, payment readiness, discounts, and server-owned totals before locking the order."
      eyebrow="Final review"
      session={session}
      title="Checkout"
    >
      <div className="grid gap-8 pb-24 lg:pb-0">
        <CheckoutReview
          addresses={data.deliveryAddresses}
          cartLines={data.cart.lines.length}
          cutoffAt={data.deliveryWindows.cutoffAt}
          customerId={session.customerId!}
          initialQuote={data.quote}
          paymentMethods={data.paymentMethods}
          paymentUnavailableMessage={data.error}
          selectedAddress={data.deliveryAddress}
          subscriptionActive={subscriptionActive}
          windows={data.deliveryWindows}
        />
      </div>
    </MarketplacePageShell>
  );
}
