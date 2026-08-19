import { describe, expect, it } from "vitest";
import { InMemoryDeliveryEventRepository } from "./delivery-events.js";

describe("delivery event repository", () => {
  it("deduplicates offline retries and scopes assignments", async () => {
    const repository = new InMemoryDeliveryEventRepository([
      {
        id: "assignment-1",
        cycleId: "cycle-2026-08-22",
        orderId: "order-1",
        windowId: "window-1",
        deliverymanUserId: "driver-1",
        status: "assigned",
        assignedAt: "2026-08-19T00:00:00.000Z",
        lastEventType: null,
      },
    ]);
    const event = {
      id: "event-1",
      clientEventId: "client-1",
      assignmentId: "assignment-1",
      orderId: "order-1",
      deliverymanUserId: "driver-1",
      type: "delivered" as const,
      occurredAt: "2026-08-22T04:00:00.000Z",
      receivedAt: "2026-08-22T04:01:00.000Z",
      note: null,
    };
    await repository.saveEvent(event);
    await repository.saveEvent({ ...event, id: "event-2" });
    await expect(repository.listEvents("assignment-1", "driver-1")).resolves.toHaveLength(1);
    await expect(repository.listAssignments("driver-2", "cycle-2026-08-22")).resolves.toHaveLength(
      0,
    );
  });
});
