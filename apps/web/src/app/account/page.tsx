import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { loadCustomerAccount } from "../../lib/account";
import { loadCurrentSession } from "../../lib/session";
import { AuthControls } from "../auth-controls";

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
  const catalogById = new Map(account.catalog.items.map((item) => [item.id, item]));

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
            {account.cart.lines.length > 0 ? (
              <>
                <ul className="account-cart-lines">
                  {account.cart.lines.map((line) => {
                    const item = catalogById.get(line.skuId);
                    return (
                      <li key={line.skuId}>
                        <div>
                          <strong>{item?.name ?? "Unavailable item"}</strong>
                          <span>Quantity {line.quantity}</span>
                        </div>
                        <span>{formatPrice(line.unitPrice.centavos * line.quantity)}</span>
                      </li>
                    );
                  })}
                </ul>
                <div className="account-total">
                  <span>Subtotal</span>
                  <strong>{formatPrice(account.cart.subtotal.centavos)}</strong>
                </div>
              </>
            ) : (
              <div className="account-empty">
                <h2>Your cart is empty</h2>
                <p>
                  Browse this week&apos;s catalog and return here when you have made a selection.
                </p>
                <a className="button button-small" href="/#storefront-heading">
                  Browse catalog
                </a>
              </div>
            )}
          </article>
        </section>
      )}
    </main>
  );
}
