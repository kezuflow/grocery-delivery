"use client";

import { ArrowRight, Check, Leaf, Menu, PackageCheck, RefreshCw, Truck, X } from "lucide-react";
import { useState } from "react";

import styles from "./freshmarkets-landing.module.css";

const navigation = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Shop", href: "/shop" },
  { label: "Sustainability", href: "#better-choices" },
  { label: "About us", href: "#footer" },
];

const benefits = [
  { icon: "leaf", title: "Freshly sourced", copy: "From trusted local farmers and suppliers." },
  { icon: "package", title: "Packed with care", copy: "We pack every box like it is our own." },
  { icon: "truck", title: "Schedule that works", copy: "Choose your day. We handle the rest." },
  { icon: "refresh", title: "Flexible and easy", copy: "Pause, skip, or change anytime." },
];

const boxes = [
  {
    name: "Small Box",
    description: "Fresh essentials for 1 to 2 people.",
    size: "1 to 2 people",
    price: "$49.99 / delivery",
    image: "/landing/box-small.webp",
  },
  {
    name: "Medium Box",
    description: "Balanced variety for 2 to 4 people.",
    size: "2 to 4 people",
    price: "$69.99 / delivery",
    image: "/landing/box-medium.webp",
  },
  {
    name: "Family Box",
    description: "Abundant picks for 4+ people.",
    size: "4+ people",
    price: "$89.99 / delivery",
    image: "/landing/box-family.webp",
  },
];

export function FreshMarketsLanding() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="hero-heading">
        <header className={styles.navbar}>
          <nav className={styles.desktopNav} aria-label="Primary navigation">
            {navigation.slice(0, 2).map((item) => (
              <a href={item.href} key={item.label}>
                {item.label}
              </a>
            ))}
          </nav>
          <a className={styles.wordmark} href="/" aria-label="FreshMarkets home">
            freshmarkets
          </a>
          <div className={styles.navRight}>
            <nav className={styles.desktopNav} aria-label="Secondary navigation">
              {navigation.slice(2).map((item) => (
                <a href={item.href} key={item.label}>
                  {item.label}
                </a>
              ))}
            </nav>
            <a className={styles.login} href="/account">
              Log in
            </a>
            <a className={styles.navCta} href="/shop">
              Start free trial
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
            Log in
          </a>
        </div>

        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Groceries, delivered differently</p>
            <h1 id="hero-heading">
              Groceries that <span>fit</span> your life.
            </h1>
            <p className={styles.heroLead}>
              Market-fresh produce, everyday essentials, and local favorites packed in a box and
              delivered on your schedule.
            </p>
            <a className={styles.primaryButton} href="/shop">
              Start your free trial <ArrowRight size={17} aria-hidden="true" />
            </a>
            <p className={styles.noCommitment}>
              <Check size={15} aria-hidden="true" /> No commitment during trial
            </p>
            <p className={styles.proof}>
              Loved by 10,000+ households <span aria-label="4.9 out of 5 stars">★★★★★</span>{" "}
              <strong>4.9/5</strong>
            </p>
          </div>
          <div className={styles.heroVisual}>
            <img
              src="/landing/hero-box.webp"
              alt="A FreshMarkets box filled with fresh groceries"
              width="1200"
              height="900"
              fetchPriority="high"
            />
          </div>
        </div>
      </section>

      <section className={styles.benefits} aria-label="FreshMarkets benefits">
        {benefits.map(({ icon, title, copy }) => (
          <article className={styles.benefit} key={title}>
            {icon === "leaf" ? <Leaf size={32} strokeWidth={1.5} aria-hidden="true" /> : null}
            {icon === "package" ? (
              <PackageCheck size={32} strokeWidth={1.5} aria-hidden="true" />
            ) : null}
            {icon === "truck" ? <Truck size={32} strokeWidth={1.5} aria-hidden="true" /> : null}
            {icon === "refresh" ? (
              <RefreshCw size={32} strokeWidth={1.5} aria-hidden="true" />
            ) : null}
            <div>
              <h2>{title}</h2>
              <p>{copy}</p>
            </div>
          </article>
        ))}
      </section>

      <section className={styles.boxSection} id="boxes" aria-labelledby="box-heading">
        <div className={styles.sectionHeading}>
          <h2 id="box-heading">Find your perfect box</h2>
          <p>
            Choose a size that matches your household. Every box is packed with what is best right
            now.
          </p>
        </div>
        <div className={styles.boxGrid}>
          {boxes.map((box) => (
            <article className={styles.boxCard} key={box.name}>
              <div className={styles.boxImage}>
                <img
                  src={box.image}
                  alt={`${box.name} filled with fresh groceries`}
                  width="600"
                  height="480"
                  loading="lazy"
                />
              </div>
              <div className={styles.boxInfo}>
                <h3>{box.name}</h3>
                <p>{box.description}</p>
                <div className={styles.boxMeta}>
                  <span>{box.size}</span>
                  <strong>{box.price}</strong>
                </div>
                <a href="/shop">
                  Choose {box.name.replace(" Box", "")} <ArrowRight size={15} aria-hidden="true" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.choices} id="better-choices" aria-labelledby="choices-heading">
        <div className={styles.choicesCopy}>
          <h2 id="choices-heading">Better food starts with better choices.</h2>
          <p>
            We partner with trusted farms and makers who grow and produce with care. Every item is
            chosen for freshness, quality, and flavor.
          </p>
          <div className={styles.choiceProof}>
            <span>
              <Leaf size={20} aria-hidden="true" /> Sourced from trusted farms
            </span>
            <span>
              <PackageCheck size={20} aria-hidden="true" /> Picked at peak freshness
            </span>
            <span>
              <Check size={20} aria-hidden="true" /> Better for you and the planet
            </span>
          </div>
        </div>
        <div className={styles.choicesImage}>
          <img
            src="/landing/farm-story.webp"
            alt="A farmer tending rows of vegetables in a field"
            width="1200"
            height="720"
            loading="lazy"
          />
        </div>
      </section>

      <section className={styles.trial} id="how-it-works" aria-labelledby="trial-heading">
        <div className={styles.trialCopy}>
          <p className={styles.eyebrow}>Try risk-free</p>
          <h2 id="trial-heading">
            Start your <span>free trial</span> today.
          </h2>
          <ul>
            <li>
              <Check size={16} aria-hidden="true" /> 7-day free trial
            </li>
            <li>
              <Check size={16} aria-hidden="true" /> Free delivery on your first box
            </li>
            <li>
              <Check size={16} aria-hidden="true" /> Pause, skip, or cancel anytime
            </li>
            <li>
              <Check size={16} aria-hidden="true" /> No commitments
            </li>
          </ul>
          <a className={styles.darkButton} href="/shop">
            Start your free trial <ArrowRight size={17} aria-hidden="true" />
          </a>
          <small>No commitment during trial</small>
        </div>
        <div className={styles.trialImage}>
          <img
            src="/landing/trial-meal.webp"
            alt="A colorful fresh salad made with seasonal produce"
            width="900"
            height="900"
            loading="lazy"
          />
          <div className={styles.trialBadge}>
            <strong>7-day</strong>
            <span>free trial</span>
          </div>
        </div>
      </section>

      <footer className={styles.footer} id="footer">
        <div className={styles.footerBrand}>
          <a className={styles.wordmark} href="/" aria-label="FreshMarkets home">
            freshmarkets
          </a>
          <p>Good food. Real convenience.</p>
        </div>
        <div className={styles.footerLinks}>
          <div>
            <h2>Shop</h2>
            <a href="/shop">Shop boxes</a>
            <a href="/shop">Fresh produce</a>
            <a href="/shop">Pantry</a>
          </div>
          <div>
            <h2>Support</h2>
            <a href="#how-it-works">How it works</a>
            <a href="/account">Your account</a>
            <a href="/account/support">Help center</a>
          </div>
          <div>
            <h2>About</h2>
            <a href="#better-choices">Sustainability</a>
            <a href="#footer">Our story</a>
            <a href="#footer">Contact us</a>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© 2026 FreshMarkets</span>
          <span>Fresh food for better weeks.</span>
        </div>
      </footer>
    </main>
  );
}
