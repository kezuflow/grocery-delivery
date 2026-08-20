import { describe, expect, it } from "vitest";
import { InMemoryPromotionBannerRepository, type PromotionBanner } from "./promotion-banners.js";

const banner: PromotionBanner = {
  id: "banner-1",
  placement: "home-hero",
  title: "Fresh week",
  copy: "Seasonal produce",
  ctaLabel: "Shop",
  ctaDestination: "https://carbon.example/#plans",
  altText: "Fresh vegetables",
  priority: 10,
  startsAt: "2026-08-20T00:00:00.000Z",
  endsAt: "2026-08-30T00:00:00.000Z",
  desktopObjectKey: "promotions/banner-1/desktop/image.webp",
  mobileObjectKey: "promotions/banner-1/mobile/image.webp",
  status: "active",
  cacheVersion: 1,
  createdByUserId: "admin-1",
  createdAt: "2026-08-19T00:00:00.000Z",
  updatedAt: "2026-08-19T00:00:00.000Z",
};

describe("promotion banner repository", () => {
  it("filters public banners by placement, status, and schedule", async () => {
    const repository = new InMemoryPromotionBannerRepository([
      banner,
      { ...banner, id: "banner-paused", status: "paused" },
    ]);
    await expect(
      repository.listActive("home-hero", "2026-08-22T00:00:00.000Z"),
    ).resolves.toMatchObject([{ id: "banner-1" }]);
    await expect(
      repository.listActive("account-banner", "2026-08-22T00:00:00.000Z"),
    ).resolves.toEqual([]);
  });

  it("increments the cache version when publishing state changes", async () => {
    const repository = new InMemoryPromotionBannerRepository([{ ...banner, status: "draft" }]);
    await repository.updateStatus("banner-1", "active", "2026-08-20T01:00:00.000Z");
    await expect(repository.list()).resolves.toMatchObject([{ status: "active", cacheVersion: 2 }]);
  });
});
