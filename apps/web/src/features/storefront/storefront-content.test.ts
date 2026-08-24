import { describe, expect, it } from "vitest";

import type { StorefrontData } from "../../lib/storefront";
import { getProductHref } from "./storefront-catalog";
import { getSessionErrorMessage } from "./storefront-content";
import { getHeroPromotion } from "./storefront-hero";
import { storefrontMedia } from "./storefront-media";

describe("storefront session notices", () => {
  it("renders a structured API error as text instead of a React child", () => {
    expect(getSessionErrorMessage({ code: "UNAUTHENTICATED", message: "sign in required" })).toBe(
      "sign in required",
    );
  });

  it("keeps unknown failures renderable", () => {
    expect(getSessionErrorMessage({ code: "UNKNOWN" })).toBe(
      "We could not verify your session. Please try again shortly.",
    );
  });
});

describe("storefront landing content", () => {
  it("uses the project-local cinematic hero and preserves active promotion copy", () => {
    const banner: StorefrontData["banners"][number] = {
      id: "weekend-offer",
      placement: "home-hero",
      title: "A better basket for the weekend",
      copy: "Explore this week's active market.",
      ctaLabel: "See the offer",
      ctaDestination: "/shop#promotions",
      altText: "A basket of vegetables",
      priority: 10,
      startsAt: "2026-08-20T00:00:00.000Z",
      endsAt: "2026-08-31T00:00:00.000Z",
      status: "active",
      cacheVersion: 1,
      createdAt: "2026-08-20T00:00:00.000Z",
      updatedAt: "2026-08-20T00:00:00.000Z",
      desktopUrl: "https://assets.example.com/banner-desktop.webp",
      mobileUrl: "https://assets.example.com/banner-mobile.webp",
    };

    expect(storefrontMedia.hero.desktop).toBe("/landing/carbon-market-dawn.webp");
    expect(getHeroPromotion(banner)).toEqual({
      title: "A better basket for the weekend",
      copy: "Explore this week's active market.",
      ctaLabel: "See the offer",
      destination: "/shop#promotions",
    });
  });

  it("links featured server-priced items to their product details", () => {
    expect(getProductHref("tomatoes")).toBe("/shop/tomatoes");
    expect(getProductHref("specials/weekly")).toBe("/shop/specials%2Fweekly");
  });
});
