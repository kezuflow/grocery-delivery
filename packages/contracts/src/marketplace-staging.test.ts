import { describe, expect, it } from "vitest";

import {
  createStagingCarbonMarketManifest,
  launchConfigurationApplyRequestSchema,
  STAGING_CARBON_MARKET_IDEMPOTENCY_KEY,
} from "./index";

describe("staging Carbon Market manifest", () => {
  it("contains the dossier categories, realistic SKU count, stable images, and weekly windows", () => {
    const manifest = createStagingCarbonMarketManifest({
      now: new Date("2026-08-21T09:00:00.000Z"),
      appliedAt: "2026-08-21T09:00:00.000Z",
    });

    expect(STAGING_CARBON_MARKET_IDEMPOTENCY_KEY).toBe("staging-carbon-market-catalog-v1");
    expect(manifest.categories).toHaveLength(2);
    expect(manifest.skus).toHaveLength(22);
    expect(new Set(manifest.skus.map((sku) => sku.categoryId)).size).toBe(2);
    expect(manifest.skus.every((sku) => sku.imageUrl?.endsWith(`${sku.slug}.webp`))).toBe(true);
    expect(manifest.skus.every((sku) => !("price" in sku))).toBe(true);
    expect(manifest.deliveryWindows).toHaveLength(4);
    expect(manifest.deliveryWindows.every((window) => window.cycleId === "cycle-2026-08-22")).toBe(
      true,
    );
    expect(manifest.deliveryWindows.map((window) => window.startsAt)).toEqual([
      "2026-08-22T00:00:00.000Z",
      "2026-08-22T05:00:00.000Z",
      "2026-08-23T00:00:00.000Z",
      "2026-08-23T05:00:00.000Z",
    ]);
    expect(launchConfigurationApplyRequestSchema.parse(manifest)).toEqual(manifest);
  });

  it("rolls to the following weekend after the Friday Manila cutoff", () => {
    const manifest = createStagingCarbonMarketManifest({
      now: new Date("2026-08-21T10:00:00.000Z"),
      appliedAt: "2026-08-21T10:00:00.000Z",
    });

    expect(manifest.deliveryWindows.every((window) => window.cycleId === "cycle-2026-08-29")).toBe(
      true,
    );
    expect(manifest.deliveryWindows[0]?.startsAt).toBe("2026-08-29T00:00:00.000Z");
  });
});
