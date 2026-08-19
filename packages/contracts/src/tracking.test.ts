import { describe, expect, it } from "vitest";
import { deliveryTrackingResponseSchema } from "./tracking";

describe("tracking contracts", () => {
  it("accepts an unassigned order snapshot", () => {
    expect(
      deliveryTrackingResponseSchema.parse({
        data: {
          orderId: "order-1",
          assignmentId: null,
          windowId: null,
          status: "pending",
          latestEventType: null,
          events: [],
        },
        meta: { correlationId: "request-1" },
      }).data.status,
    ).toBe("pending");
  });
});
