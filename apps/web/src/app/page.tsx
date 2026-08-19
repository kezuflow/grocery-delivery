import { loadStorefront } from "../lib/storefront";
import { loadCurrentSession } from "../lib/session";
import { AuthControls } from "./auth-controls";

export const dynamic = "force-dynamic";

const highlights = [
  {
    title: "Weekly, not wasteful",
    description:
      "Choose a plan that matches your household and adjust it before the weekly cutoff.",
  },
  {
    title: "Demand-driven sourcing",
    description:
      "Your order helps us buy what is needed, so good food spends less time in storage.",
  },
  {
    title: "Delivered together",
    description: "Planned delivery windows make each route count and keep unnecessary trips down.",
  },
];

function formatPrice(centavos: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(centavos / 100);
}

export default async function HomePage() {
  const [storefront, auth] = await Promise.all([loadStorefront(), loadCurrentSession()]);

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="Carbon Food Delivery home">
          <span className="wordmark-mark">C</span>
          <span>Carbon</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#plans">Plans</a>
          {auth.session?.role === "customer" ? <a href="/account">Account</a> : null}
          <AuthControls signedIn={auth.session !== null} />
        </nav>
      </header>

      <section className="hero" id="join">
        <div className="hero-shade" />
        <div className="hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">A better weekly shop</p>
            <h1>Carbon Food Delivery</h1>
            <p className="lede">
              Practical weekly groceries, thoughtful sourcing, and delivery routes that use less.
            </p>
            <div className="hero-actions">
              <a className="button" href="#plans">
                Explore plans <span aria-hidden="true">-&gt;</span>
              </a>
              <a className="text-link" href="#how-it-works">
                See how it works
              </a>
            </div>
          </div>
        </div>
      </section>

      {auth.session ? (
        <section className="signed-in-banner" aria-label="Account status">
          You&apos;re signed in to your {auth.session.role} account.
        </section>
      ) : auth.error ? (
        <section className="signed-in-banner signed-in-banner-error" role="status">
          {auth.error}
        </section>
      ) : null}

      <section className="section" id="how-it-works">
        <div className="section-heading">
          <p className="eyebrow">Designed around real life</p>
          <h2>A weekly rhythm that makes sense.</h2>
        </div>
        <div className="highlight-grid">
          {highlights.map((highlight, index) => (
            <article className="highlight" key={highlight.title}>
              <span className="highlight-number">0{index + 1}</span>
              <h3>{highlight.title}</h3>
              <p>{highlight.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="plan-banner" id="plans">
        <div className="plan-inner">
          <div>
            <p className="eyebrow">Start with a plan</p>
            <h2>More of what you need. Less of what you don&apos;t.</h2>
          </div>
          <a className="button button-light" href="#join">
            Get early access <span aria-hidden="true">-&gt;</span>
          </a>
        </div>
      </section>

      <section className="section storefront" aria-labelledby="storefront-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Available this week</p>
            <h2 id="storefront-heading">Plans and produce, from the API.</h2>
          </div>
          <p className="section-note">
            Prices and availability come from the server-owned catalog. Nothing here is calculated
            from client input.
          </p>
        </div>

        {storefront.error ? (
          <div className="storefront-state" role="status">
            <h3>Storefront temporarily unavailable</h3>
            <p>{storefront.error}</p>
          </div>
        ) : (
          <>
            <div className="plan-grid">
              {storefront.plans.map((plan) => (
                <article className="plan-card" key={plan.id}>
                  <p className="plan-card-code">{plan.code}</p>
                  <h3>{plan.name}</h3>
                  <strong>{formatPrice(plan.weeklyFee.centavos)} / week</strong>
                  <p>
                    Includes {formatPrice(plan.weeklyCredit.centavos)} in weekly product credit.
                  </p>
                </article>
              ))}
            </div>

            <div className="catalog-heading">
              <h3>Catalog preview</h3>
              <span>{storefront.catalog.items.length} items</span>
            </div>
            <div className="catalog-grid">
              {storefront.catalog.items.map((item) => (
                <article className="catalog-item" key={item.id}>
                  <div>
                    <p className="catalog-category">
                      {storefront.catalog.categories.find(
                        (category) => category.id === item.categoryId,
                      )?.name ?? "Catalog"}
                    </p>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                  </div>
                  <strong>{formatPrice(item.price.centavos)}</strong>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <footer className="site-footer">
        <span>(c) 2026 Carbon Food Delivery</span>
        <span>Built for a better weekly shop.</span>
      </footer>
    </main>
  );
}
