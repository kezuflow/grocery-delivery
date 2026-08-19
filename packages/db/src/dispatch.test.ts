import { describe, expect, it } from "vitest";
import { InMemoryDispatchRepository } from "./dispatch.js";

describe("dispatch repository", () => {
  it("scopes assignments to a cycle", async () => {
    const repository = new InMemoryDispatchRepository();
    await repository.save({
      id: "assignment-1",
      cycleId: "cycle-2026-08-22",
      orderId: "order-1",
      windowId: "window-1",
      deliverymanUserId: "driver-1",
      status: "assigned",
      assignedAt: "2026-08-19T00:00:00.000Z",
    });
    await expect(repository.list("cycle-2026-08-22")).resolves.toHaveLength(1);
    await expect(repository.list("cycle-2026-08-29")).resolves.toHaveLength(0);
  });
});
