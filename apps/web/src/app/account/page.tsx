import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { loadCustomerAccount } from "../../lib/account";
import { loadCurrentSession } from "../../lib/session";
import { AuthControls } from "../auth-controls";
import { CartEditor } from "./cart-editor";
import { DeliveryAddressEditor } from "./delivery-address-editor";
import { DeliveryWindowSelector } from "./delivery-window-selector";
import { PlaceOrderButton } from "./place-order-button";
import { SubscriptionActions } from "./subscription-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Account" };

function formatPrice(centavos: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(centavos / 100);
}

export default async function AccountPage() {
  const auth = await loadCurrentSession();
  if (!auth.session) redirect("/");
  if (auth.session.role !== "customer" || !auth.session.customerId) redirect("/");

  const account = await loadCustomerAccount();
  const plan = account.subscription
    ? account.plans.find((candidate) => candidate.id === account.subscription?.planId)
    : null;

  return (
    <main className="account-page">
      <header className="site-header account-header">
        <a className="wordmark" href="/" aria-label="Carbon Food Delivery home">
          <span className="wordmark-mark">C</span>
          <span>Carbon</span>
        </a>
        <nav aria-label="Account navigation">
          <a href="/">Storefront</a>
          <AuthControls signedIn />
        </nav>
      </header>

      <section className="account-intro">
        <div>
          <p className="eyebrow">Your weekly shop</p>
          <h1>Account</h1>
        </div>
        <span className="account-status">{auth.session.role}</span>
      </section>

      {account.error ? (
        <section className="account-state" role="status">
          <h2>Account temporarily unavailable</h2>
          <p>{account.error}</p>
        </section>
      ) : (
        <section className="account-grid" aria-label="Customer account summary">
          <article className="account-panel">
            <div className="account-panel-heading">
              <p className="eyebrow">Subscription</p>
              <span>{account.subscription?.status ?? "not started"}</span>
            </div>
            {account.subscription ? (
              <>
                <h2>{plan?.name ?? "Current plan"}</h2>
                <dl className="account-details">
                  <div>
                    <dt>Weekly fee</dt>
                    <dd>{plan ? formatPrice(plan.weeklyFee.centavos) : "Unavailable"}</dd>
                  </div>
                  <div>
                    <dt>Product credit</dt>
                    <dd>{plan ? formatPrice(plan.weeklyCredit.centavos) : "Unavailable"}</dd>
                  </div>
                  <div>
                    <dt>Last update</dt>
                    <dd>{new Date(account.subscription.updatedAt).toLocaleDateString("en-PH")}</dd>
                  </div>
                </dl>
                <SubscriptionActions
                  skippedCycleId={account.subscription.skippedCycleId}
                  status={account.subscription.status}
                />
              </>
            ) : (
              <div className="account-empty">
                <h2>No subscription yet</h2>
                <p>Choose a weekly plan when you are ready to begin.</p>
                <a className="button button-small" href="/#plans">
                  View plans
                </a>
              </div>
            )}
          </article>

          <article className="account-panel">
            <div className="account-panel-heading">
              <p className="eyebrow">Saved cart</p>
              <span>{account.cart.lines.length} items</span>
            </div>
            <CartEditor
              catalog={account.catalog.items.map((item) => ({
                id: item.id,
                name: item.name,
                priceCentavos: item.price.centavos,
              }))}
              initialLines={account.cart.lines.map((line) => ({
                skuId: line.skuId,
                quantity: line.quantity,
                unitPriceCentavos: line.unitPrice.centavos,
              }))}
              key={account.cart.updatedAt ?? "empty-cart"}
            />
            {account.cart.lines.length > 0 ? (
              <>
                <div className="account-total">
                  <span>Subtotal</span>
                  <strong>{formatPrice(account.cart.subtotal.centavos)}</strong>
                </div>
              </>
            ) : (
              <div className="account-empty">
                <h2>Your cart is empty</h2>
                <p>Add an available catalog item above to begin your weekly order.</p>
              </div>
            )}
            <PlaceOrderButton
              cartHasLines={account.cart.lines.length > 0}
              subscriptionActive={account.subscription?.status === "active"}
            />
          </article>
          <article className="account-panel account-panel-wide">
            <div className="account-panel-heading">
              <p className="eyebrow">Delivery address</p>
              <span>
                {account.deliveryAddress
                  ? account.deliveryAddress.serviceable
                    ? "serviceable"
                    : "unavailable"
                  : "not set"}
              </span>
            </div>
            <DeliveryAddressEditor initialAddress={account.deliveryAddress} />
          </article>
          <article className="account-panel account-panel-wide">
            <div className="account-panel-heading">
              <p className="eyebrow">Delivery window</p>
              <span>{account.deliveryWindows.selectedWindowId ? "selected" : "not selected"}</span>
            </div>
            <DeliveryWindowSelector initial={account.deliveryWindows} />
          </article>
        </section>
      )}
    </main>
  );
}
