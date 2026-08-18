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

export default function HomePage() {
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
          <a className="button button-small" href="#join">
            Join the waitlist
          </a>
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

      <footer className="site-footer">
        <span>(c) 2026 Carbon Food Delivery</span>
        <span>Built for a better weekly shop.</span>
      </footer>
    </main>
  );
}
