import { describe, expect, it } from "vitest";
import { InMemorySavedItemsRepository } from "./saved-items.js";

describe("saved items repositories", () => {
  it("keeps saved SKUs scoped to the customer and replay-safe", async () => {
    const repository = new InMemorySavedItemsRepository();
    await repository.save({
      customerId: "customer-1",
      skuId: "sku-a",
      savedAt: "2026-08-23T10:00:00.000Z",
    });
    await repository.save({
      customerId: "customer-1",
      skuId: "sku-a",
      savedAt: "2026-08-23T11:00:00.000Z",
    });
    await expect(repository.listByCustomer("customer-1")).resolves.toEqual([
      { customerId: "customer-1", skuId: "sku-a", savedAt: "2026-08-23T11:00:00.000Z" },
    ]);
    await expect(repository.listByCustomer("customer-2")).resolves.toEqual([]);
  });
});
