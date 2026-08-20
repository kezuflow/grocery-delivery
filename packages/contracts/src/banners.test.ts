import { describe, expect, it } from "vitest";
import {
  promotionBannerUpsertRequestSchema,
  promotionMediaUploadRequestSchema,
} from "./banners.js";

describe("promotion banner contracts", () => {
  it("rejects unsafe destinations and delivery-media object paths", () => {
    const result = promotionBannerUpsertRequestSchema.safeParse({
      placement: "home-hero",
      title: "Offer",
      copy: "Save this week",
      ctaLabel: "Open",
      ctaDestination: "javascript:alert(1)",
      altText: "Offer",
      priority: 1,
      startsAt: "2026-08-20T00:00:00.000Z",
      endsAt: "2026-08-21T00:00:00.000Z",
      desktopObjectKey: "orders/order-1/image",
      mobileObjectKey: "promotions/banner-1/mobile/image.webp",
    });
    expect(result.success).toBe(false);
  });

  it("bounds promotional media type, size, and dimensions", () => {
    expect(
      promotionMediaUploadRequestSchema.safeParse({
        bannerId: "banner-1",
        variant: "desktop",
        contentType: "image/svg+xml",
        sizeBytes: 100,
        width: 1200,
        height: 600,
      }).success,
    ).toBe(false);
    expect(
      promotionMediaUploadRequestSchema.safeParse({
        bannerId: "banner-1",
        variant: "desktop",
        contentType: "image/webp",
        sizeBytes: 6_000_000,
        width: 1200,
        height: 600,
      }).success,
    ).toBe(false);
  });
});
