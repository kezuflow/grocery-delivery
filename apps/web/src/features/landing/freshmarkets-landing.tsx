"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight, Menu, X } from "lucide-react";
import { useState } from "react";

import styles from "./freshmarkets-landing.module.css";

const navigation = [
  { label: "Shop the market", href: "/shop" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Membership", href: "#membership" },
];

const produce = [
  {
    name: "Sun-ripened tomatoes",
    detail: "Picked for the week ahead",
    image: "/marketplace/tomatoes.webp",
  },
  {
    name: "Crisp greens",
    detail: "Washed, bright, ready to cook",
    image: "/marketplace/lettuce.webp",
  },
  {
    name: "Build-your-box",
    detail: "Your staples, your way",
    image: "/marketplace/build-your-box-campaign.webp",
  },
];

export function FreshMarketsLanding() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className={styles.page}>
      <div className={styles.announcement}>
        <span>Fresh this week</span>
        <span>Free delivery on your first basket</span>
        <a href="/shop">
          Shop now <ArrowRight aria-hidden="true" size={14} />
        </a>
      </div>

      <section className={styles.hero} aria-labelledby="hero-heading">
        <header className={styles.navbar}>
          <a className={styles.wordmark} href="/" aria-label="FreshMarkets home">
            <span className={styles.wordmarkMark} aria-hidden="true">
              <span />
            </span>
            <span>freshmarkets</span>
          </a>
          <nav className={styles.desktopNav} aria-label="Primary navigation">
            {navigation.map((item) => (
              <a href={item.href} key={item.label}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className={styles.navActions}>
            <a className={styles.signIn} href="/account">
              Sign in
            </a>
            <a className={styles.navCta} href="/shop">
              Start shopping <ArrowRight aria-hidden="true" size={15} />
            </a>
            <button
              className={styles.menuButton}
              type="button"
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </header>

        <div
          className={`${styles.mobileNav} ${menuOpen ? styles.mobileNavOpen : ""}`}
          id="mobile-navigation"
        >
          {navigation.map((item) => (
            <a href={item.href} key={item.label} onClick={() => setMenuOpen(false)}>
              {item.label}
            </a>
          ))}
          <a href="/account" onClick={() => setMenuOpen(false)}>
            Sign in
          </a>
        </div>

        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Premium groceries, made easy</p>
            <h1 id="hero-heading">
              Good food.
              <br />
              <em>Better value.</em>
            </h1>
            <p className={styles.heroLead}>
              A curated market of fresh produce and everyday staples, delivered to your door for
              less than the supermarket run.
            </p>
            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="/shop">
                Build your basket <ArrowRight aria-hidden="true" size={17} />
              </a>
              <a className={styles.textButton} href="#how-it-works">
                See how it works <ArrowDownRight aria-hidden="true" size={17} />
              </a>
            </div>
            <p className={styles.heroProof}>
              <span>4.9/5</span> from fresh-market regulars, delivered on your schedule
            </p>
          </div>
          <div
            className={styles.heroVisual}
            aria-label="A colorful selection of fresh vegetables"
            role="img"
          >
            <div className={styles.heroGlow} />
            <img
              className={styles.heroProduce}
              src="/landing/background.webp"
              alt=""
              width="1672"
              height="941"
              fetchPriority="high"
            />
            <img
              className={styles.heroPerson}
              src="/marketplace/market-fresh-campaign.webp"
              alt="A FreshMarkets market host holding a box of produce"
              width="1024"
              height="1024"
            />
            <span className={`${styles.sticker} ${styles.stickerTop}`}>picked for now</span>
            <span className={`${styles.sticker} ${styles.stickerBottom}`}>zero guesswork</span>
          </div>
        </div>
      </section>

      <section className={styles.marquee} aria-label="FreshMarkets benefits">
        <div>real food</div>
        <div>real people</div>
        <div>real easy</div>
        <div>real fresh</div>
      </section>

      <section className={styles.storySection} id="how-it-works">
        <div className={styles.sectionIntro}>
          <p className={styles.kicker}>The FreshMarkets difference</p>
          <h2>Make the premium choice the easy choice.</h2>
          <p>
            We take the friction out of eating well. Pick what looks good, set your rhythm, and let
            a real person bring it to your door at a price that respects your week.
          </p>
        </div>
        <div className={styles.storyGrid}>
          <article className={`${styles.storyCard} ${styles.storyCardTall}`}>
            <img
              src="/marketplace/build-your-box-campaign.webp"
              alt="Hands arranging colorful produce inside a FreshMarkets box"
              width="1024"
              height="1024"
              loading="lazy"
            />
            <div>
              <h3>Choose your kind of fresh</h3>
              <p>
                Shop the market or start with a box that already knows what a good week tastes like.
                No aisle wandering required.
              </p>
            </div>
          </article>
          <article className={`${styles.storyCard} ${styles.storyCardGreen}`}>
            <div className={styles.numberLockup}>
              <span>Curated for you</span>
              <ArrowDownRight aria-hidden="true" size={28} />
            </div>
            <h3>We pack it like it matters</h3>
            <p>
              Produce is checked, packed, and sent out on a schedule that keeps it at its best.
              Premium handling, without the premium markup.
            </p>
            <a href="/shop">
              Meet the market <ArrowRight aria-hidden="true" size={16} />
            </a>
          </article>
          <article className={`${styles.storyCard} ${styles.storyCardWide}`}>
            <div>
              <h3>Your fridge gets a reset</h3>
              <p>More color on the counter. More options at dinner. Less last-minute takeout.</p>
            </div>
            <img
              src="/marketplace/weekend-delivery-campaign.webp"
              alt="A FreshMarkets courier ready to deliver a produce box"
              width="1024"
              height="1024"
              loading="lazy"
            />
          </article>
        </div>
      </section>

      <section className={styles.marketSection} id="market">
        <div className={styles.marketHeading}>
          <div>
            <p className={styles.kicker}>Inside this week</p>
            <h2>Food with a point of view.</h2>
          </div>
          <a className={styles.textButtonDark} href="/shop">
            Explore the full market <ArrowRight aria-hidden="true" size={17} />
          </a>
        </div>
        <div className={styles.produceRail}>
          {produce.map((item) => (
            <a href="/shop" className={styles.produceItem} key={item.name}>
              <div className={styles.produceImage}>
                <img src={item.image} alt="" width="1024" height="1024" loading="lazy" />
              </div>
              <div>
                <h3>{item.name}</h3>
                <p>{item.detail}</p>
              </div>
              <ArrowUpRight aria-hidden="true" size={18} />
            </a>
          ))}
        </div>
      </section>

      <section className={styles.membershipSection} id="membership">
        <div className={styles.membershipImage}>
          <img
            src="/marketplace/first-order-campaign.webp"
            alt="A shopper celebrating with a box of fresh produce"
            width="1024"
            height="1024"
            loading="lazy"
          />
        </div>
        <div className={styles.membershipCopy}>
          <p className={styles.kicker}>FreshMarkets membership</p>
          <h2>Keep good food in your plans.</h2>
          <p>
            Make weekly shopping feel less like a chore and more like a small ritual you look
            forward to. Pause anytime. Add what you need. Keep your favorites close while spending
            less than a typical supermarket basket.
          </p>
          <ul>
            <li>
              <span>✓</span> Flexible weekly delivery windows
            </li>
            <li>
              <span>✓</span> Member-only market drops
            </li>
            <li>
              <span>✓</span> No wasteful surprise boxes
            </li>
          </ul>
          <a className={styles.primaryButton} href="/account/subscribe">
            Find your rhythm <ArrowRight aria-hidden="true" size={17} />
          </a>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div>
          <p className={styles.kicker}>Your next good meal starts here</p>
          <h2>
            Bring home
            <br />
            <em>something better.</em>
          </h2>
        </div>
        <div className={styles.finalCtaAction}>
          <p>Fresh food, chosen with care, delivered on your time, and priced for real life.</p>
          <a className={styles.darkButton} href="/shop">
            Shop FreshMarkets <ArrowRight aria-hidden="true" size={17} />
          </a>
        </div>
      </section>

      <footer className={styles.footer}>
        <a className={styles.wordmark} href="/" aria-label="FreshMarkets home">
          <span className={styles.wordmarkMark} aria-hidden="true">
            <span />
          </span>
          <span>freshmarkets</span>
        </a>
        <p>Fresh choices for better weeks.</p>
        <div>
          <a href="/shop">Shop</a>
          <a href="/account">Account</a>
          <a href="#how-it-works">How it works</a>
        </div>
      </footer>
    </main>
  );
}
