import { describe, expect, it } from "vitest";
import { InMemoryPromotionBannerAnalyticsRepository } from "./promotion-banner-analytics.js";

describe("promotion banner analytics repository", () => {
  it("accepts active banner events once and ignores inactive banners", async () => {
    const repository = new InMemoryPromotionBannerAnalyticsRepository(new Set(["banner-1"]));
    const event = {
      eventId: "event-1",
      bannerId: "banner-1",
      event: "impression" as const,
      occurredAt: "2026-08-20T00:00:00.000Z",
    };
    await expect(repository.saveIfActive(event)).resolves.toBe("saved");
    await expect(repository.saveIfActive(event)).resolves.toBe("duplicate");
    await expect(
      repository.saveIfActive({ ...event, eventId: "event-2", bannerId: "inactive" }),
    ).resolves.toBe("ignored");
  });
});
