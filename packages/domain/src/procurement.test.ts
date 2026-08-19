import { describe, expect, it } from "vitest";
import { createProcurementShortage } from "./procurement.js";

describe("procurement rules", () => {
  it("requires a real shortage", () => {
    expect(() =>
      createProcurementShortage({
        id: "s",
        cycleId: "cycle-2026-08-22",
        skuId: "sku",
        requestedQuantity: 2,
        availableQuantity: 2,
        status: "open",
        createdAt: "2026-08-19T00:00:00.000Z",
      }),
    ).toThrow("below requested");
  });
});
