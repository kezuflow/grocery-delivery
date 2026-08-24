import { ArrowRight, ArrowUpRight, Check } from "lucide-react";

import { LinkButton } from "../../components/ui";
import type { SessionSummary } from "../../lib/permissions";
import type { StorefrontData } from "../../lib/storefront";
import { storefrontMedia } from "./storefront-media";

export function StorefrontHero({
  banner,
  session,
}: Readonly<{
  banner: StorefrontData["banners"][number] | undefined;
  session: SessionSummary | null;
}>) {
  const customerDestination = "/shop";
  const promotion = getHeroPromotion(banner);

  return (
    <section className="relative isolate min-h-[690px] overflow-hidden bg-deep text-white sm:min-h-[760px]">
      <picture>
        <source media="(max-width: 640px)" srcSet={storefrontMedia.hero.mobile} />
        <img
          alt={storefrontMedia.hero.alt}
          className="absolute inset-0 -z-20 size-full object-cover object-[62%_center] sm:object-center"
          decoding="async"
          fetchPriority="high"
          src={storefrontMedia.hero.desktop}
        />
      </picture>
      <div className="absolute inset-0 -z-10 bg-linear-to-r from-deep via-deep/90 to-deep/10" />
      <div className="absolute inset-0 -z-10 bg-linear-to-t from-deep/65 via-transparent to-deep/15" />

      <div className="mx-auto flex min-h-[690px] max-w-[1240px] items-end px-4 pb-12 pt-24 sm:min-h-[760px] sm:px-6 sm:pb-16 lg:px-8">
        <div className="max-w-[760px]">
          <p className="mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-sun sm:text-sm">
            <span aria-hidden="true" className="h-px w-8 bg-sun" />
            Fresh from Carbon Market
          </p>
          <h1 className="storefront-display max-w-[740px] text-[clamp(3.5rem,7.3vw,6.8rem)] leading-[0.91] tracking-[-0.055em] text-white">
            Market mornings, delivered to your week.
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-white/80 sm:text-lg sm:leading-8">
            Build one flexible weekly basket, choose an available delivery window, and follow your
            groceries from market packing to your door.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href={customerDestination} size="lg" tone="accent">
              {session?.role === "customer" ? "Open your market" : "Shop this week"}
              <ArrowRight aria-hidden="true" size={18} />
            </LinkButton>
            <LinkButton
              className="border-white/60 text-white hover:bg-white/10"
              href="#plans"
              size="lg"
              tone="secondary"
            >
              See weekly plans
            </LinkButton>
          </div>
          <ul className="mt-10 grid max-w-2xl gap-3 border-t border-white/25 pt-6 text-sm font-bold text-white/90 sm:grid-cols-3">
            {["Server-confirmed prices", "One-month free trial", "One tracked weekly order"].map(
              (item) => (
                <li className="flex items-center gap-2" key={item}>
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-sun text-ink">
                    <Check aria-hidden="true" size={14} strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ),
            )}
          </ul>
          {promotion ? (
            <a
              className="mt-7 grid max-w-xl grid-cols-[1fr_auto] items-center gap-4 border-l-2 border-sun bg-deep/75 px-4 py-3 backdrop-blur-sm transition-colors hover:bg-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sun"
              href={promotion.destination}
            >
              <span className="grid gap-1">
                <span className="text-[0.66rem] font-bold uppercase tracking-[0.16em] text-sun">
                  This week&apos;s note
                </span>
                <strong className="text-sm text-white">{promotion.title}</strong>
                <span className="line-clamp-1 text-xs text-white/70">{promotion.copy}</span>
              </span>
              <span className="flex items-center gap-2 text-xs font-bold text-white">
                <span className="hidden sm:inline">{promotion.ctaLabel}</span>
                <ArrowUpRight aria-hidden="true" size={18} />
              </span>
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function getHeroPromotion(banner: StorefrontData["banners"][number] | undefined) {
  if (!banner) return null;
  return {
    title: banner.title,
    copy: banner.copy,
    ctaLabel: banner.ctaLabel,
    destination: banner.ctaDestination,
  } as const;
}
