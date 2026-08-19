import { describe, expect, it } from "vitest";
import { InMemoryDeliveryWindowRepository } from "./delivery-windows.js";

const window = {
  id: "window-1",
  cycleId: "cycle-2026-08-22",
  label: "Saturday morning",
  startsAt: "2026-08-22T00:00:00.000Z",
  endsAt: "2026-08-22T04:00:00.000Z",
  capacity: 1,
  active: true,
  createdAt: "2026-08-19T00:00:00.000Z",
  updatedAt: "2026-08-19T00:00:00.000Z",
} as const;

describe("delivery window repository", () => {
  it("enforces capacity while allowing a customer to replace their selection", async () => {
    const repository = new InMemoryDeliveryWindowRepository([window]);
    await repository.select({
      customerId: "customer-1",
      cycleId: window.cycleId,
      windowId: window.id,
      selectedAt: window.updatedAt,
    });
    await expect(
      repository.select({
        customerId: "customer-2",
        cycleId: window.cycleId,
        windowId: window.id,
        selectedAt: window.updatedAt,
      }),
    ).rejects.toThrow("full");
    await expect(repository.listForCycle(window.cycleId)).resolves.toMatchObject([
      { reserved: 1, remaining: 0 },
    ]);
  });
});
