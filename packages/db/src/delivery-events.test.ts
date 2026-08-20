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
        routeSequence: 1,
        recipientName: null,
        recipientPhone: null,
        deliveryAddress: null,
      },
    ]);
    const event = {
      id: "event-1",
      clientEventId: "client-1",
      assignmentId: "assignment-1",
      orderId: "order-1",
      deliverymanUserId: "driver-1",
      type: "picked_up" as const,
      occurredAt: "2026-08-22T02:00:00.000Z",
      receivedAt: "2026-08-22T02:01:00.000Z",
      note: null,
      failureReason: null,
    };
    await repository.saveEvent(event);
    await repository.saveEvent({ ...event, id: "event-2" });
    await repository.saveEvent({
      ...event,
      id: "event-3",
      clientEventId: "client-2",
      type: "arrived",
      occurredAt: "2026-08-22T03:00:00.000Z",
    });
    await repository.saveEvent({
      ...event,
      id: "event-4",
      clientEventId: "client-3",
      type: "delivered",
      occurredAt: "2026-08-22T04:00:00.000Z",
      receivedAt: "2026-08-22T04:01:00.000Z",
    });
    await expect(repository.listEvents("assignment-1", "driver-1")).resolves.toHaveLength(3);
    await expect(repository.listAssignments("driver-1", "cycle-2026-08-22")).resolves.toMatchObject(
      [{ id: "assignment-1", status: "delivered", lastEventType: "delivered" }],
    );
    await expect(repository.listAssignments("driver-2", "cycle-2026-08-22")).resolves.toHaveLength(
      0,
    );
    expect(() =>
      repository.saveEvent({
        ...event,
        id: "event-5",
        clientEventId: "client-4",
        type: "arrived",
        occurredAt: "2026-08-22T05:00:00.000Z",
      }),
    ).toThrow("terminal");
  });
});
