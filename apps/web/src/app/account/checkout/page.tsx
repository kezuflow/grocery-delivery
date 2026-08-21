import type { Metadata } from "next";

import { AppShell } from "../../../components/layout";
import { CheckoutReview, PaymentMethodsPanel } from "../../../features/checkout";
import { requireCustomerSession } from "../../../lib/auth";
import { loadCheckoutData } from "../../../lib/checkout";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const session = await requireCustomerSession();
  const data = await loadCheckoutData();
  const selectedAddress = data.deliveryAddress;
  const addressLabel = selectedAddress
    ? `${selectedAddress.recipientName}, ${selectedAddress.line1}, ${selectedAddress.city} ${selectedAddress.postalCode}`
    : "Missing delivery address";
  const subscriptionActive =
    data.subscription?.status === "active" && data.subscription.billingStatus === "current";

  return (
    <AppShell
      breadcrumbs={[
        { href: "/", label: "Storefront" },
        { href: "/account", label: "Account" },
        { href: "/account/cart", label: "Cart" },
        { label: "Checkout" },
      ]}
      description="Confirm delivery details, payment readiness, discounts, and server-owned totals before locking the order."
      eyebrow="Final review"
      session={session}
      title="Checkout"
    >
      <div className="grid gap-8">
        <CheckoutReview
          addressLabel={addressLabel}
          cartLines={data.cart.lines.length}
          cutoffAt={data.deliveryWindows.cutoffAt}
          initialQuote={data.quote}
          subscriptionActive={subscriptionActive}
          windows={data.deliveryWindows}
        />
        <section aria-labelledby="payment-methods-heading" className="grid gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Payment</p>
            <h2 className="mt-2 text-2xl font-bold" id="payment-methods-heading">
              Payment methods
            </h2>
          </div>
          <PaymentMethodsPanel methods={data.paymentMethods} unavailableMessage={data.error} />
        </section>
      </div>
    </AppShell>
  );
}
