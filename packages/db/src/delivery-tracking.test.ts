import { describe, expect, it } from "vitest";
import { InMemoryDeliveryTrackingRepository } from "./delivery-tracking.js";

describe("delivery tracking repository", () => {
  it("scopes snapshots by customer and order", async () => {
    const repository = new InMemoryDeliveryTrackingRepository([
      {
        orderId: "order-1",
        customerId: "customer-1",
        assignmentId: null,
        windowId: null,
        status: "pending",
        latestEventType: null,
        events: [],
      },
    ]);
    expect(await repository.get("order-1", "customer-2")).toBeNull();
    expect((await repository.get("order-1", "customer-1"))?.status).toBe("pending");
  });
});
