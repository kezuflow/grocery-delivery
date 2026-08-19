import { describe, expect, it } from "vitest";
import { InMemoryProcurementRepository } from "./procurement.js";

describe("procurement repository", () => {
  it("tracks purchases, shortages, substitutions, and manifests", async () => {
    const repository = new InMemoryProcurementRepository([
      {
        cycleId: "cycle-2026-08-22",
        skuId: "sku-1",
        orderedQuantity: 3,
        purchasedQuantity: 0,
        status: "open",
      },
    ]);
    await repository.savePurchase("cycle-2026-08-22", "sku-1", 2, "2026-08-19T00:00:00.000Z");
    await repository.saveShortage({
      id: "shortage-1",
      cycleId: "cycle-2026-08-22",
      skuId: "sku-1",
      requestedQuantity: 3,
      availableQuantity: 2,
      status: "open",
      createdAt: "2026-08-19T00:00:00.000Z",
    });
    await repository.saveSubstitution({
      id: "sub-1",
      shortageId: "shortage-1",
      originalSkuId: "sku-1",
      substituteSkuId: "sku-2",
      quantity: 1,
      status: "approved",
      approvedAt: "2026-08-19T00:00:00.000Z",
    });
    await repository.saveManifest({
      id: "manifest-1",
      cycleId: "cycle-2026-08-22",
      orderId: "order-1",
      status: "pending",
      createdAt: "2026-08-19T00:00:00.000Z",
    });
    await expect(repository.listDemand("cycle-2026-08-22")).resolves.toMatchObject([
      { purchasedQuantity: 2, status: "shortage" },
    ]);
    await expect(repository.listSubstitutions("cycle-2026-08-22")).resolves.toHaveLength(1);
    await expect(repository.listManifests("cycle-2026-08-22")).resolves.toHaveLength(1);
  });
});
