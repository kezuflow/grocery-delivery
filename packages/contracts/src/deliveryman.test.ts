import { describe, expect, it } from "vitest";
import { deliveryEventRequestSchema } from "./deliveryman.js";

describe("deliveryman contracts", () => {
  it("normalizes an optional event note", () => {
    expect(
      deliveryEventRequestSchema.parse({
        clientEventId: "client-1",
        assignmentId: "a",
        orderId: "o",
        type: "arrived",
        occurredAt: "2026-08-22T04:00:00.000Z",
      }).note,
    ).toBeNull();
  });
});
