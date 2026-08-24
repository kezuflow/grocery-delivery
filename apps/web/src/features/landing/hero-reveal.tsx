"use client";

import { useRef, type PointerEvent } from "react";

import styles from "./hero-reveal.module.css";

export function HeroReveal() {
  const frameRef = useRef<HTMLDivElement>(null);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const frame = frameRef.current;
    if (!frame || event.pointerType === "touch") return;

    const bounds = frame.getBoundingClientRect();
    frame.style.setProperty("--reveal-x", `${event.clientX - bounds.left}px`);
    frame.style.setProperty("--reveal-y", `${event.clientY - bounds.top}px`);
  }

  function resetReveal() {
    const frame = frameRef.current;
    if (!frame) return;

    frame.style.setProperty("--reveal-x", "50%");
    frame.style.setProperty("--reveal-y", "50%");
  }

  return (
    <main className={styles.hero}>
      <div
        className={styles.heroFrame}
        ref={frameRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetReveal}
      >
        <img
          className={styles.heroImage}
          src="/landing/real.webp"
          alt="A sculptural arrangement of fresh green vegetables"
          fetchPriority="high"
        />
        <img
          className={`${styles.heroImage} ${styles.heroHoverImage}`}
          src="/landing/real-hover.webp"
          alt=""
          aria-hidden="true"
        />
        <div className={styles.heroShade} aria-hidden="true" />

        <header className={styles.heroHeader}>
          <a className={styles.wordmark} href="/" aria-label="Carbon Food Delivery home">
            <span className={styles.wordmarkMark}>C</span>
            <span>Carbon</span>
          </a>
          <a className={styles.headerLink} href="/shop">
            Browse the market <span aria-hidden="true">↗</span>
          </a>
        </header>

        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>A better kind of grocery run</p>
          <h1>Good food, in its best light.</h1>
          <p className={styles.heroCopy}>
            Fresh produce, thoughtfully packed and delivered on your rhythm.
          </p>
          <a className={styles.heroAction} href="/shop">
            Shop this week <span aria-hidden="true">↗</span>
          </a>
        </div>

        <p className={styles.heroHint} aria-hidden="true">
          Move across the harvest
        </p>
      </div>
    </main>
  );
}
