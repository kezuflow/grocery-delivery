import { describe, expect, it, vi } from "vitest";

import { createDeliveryEvent, formatAddress, getNextDeliveryEvents } from "./delivery-utils";

const assignment = {
  id: "assignment-1",
  cycleId: "cycle-1",
  orderId: "order-1",
  windowId: "window-1",
  deliverymanUserId: "driver-1",
  status: "assigned" as const,
  assignedAt: "2026-08-22T00:00:00.000Z",
  lastEventType: null,
  routeSequence: 2,
  recipientName: "Ada Customer",
  recipientPhone: "+639171234567",
  deliveryAddress: {
    line1: "10 Market Street",
    line2: null,
    barangay: "San Antonio",
    city: "Makati",
    province: "Metro Manila",
    postalCode: "1203",
    instructions: null,
  },
};

describe("delivery event progression", () => {
  it("exposes only the next valid server event transition", () => {
    expect(getNextDeliveryEvents(null)).toEqual(["picked_up"]);
    expect(getNextDeliveryEvents("picked_up")).toEqual(["arrived"]);
    expect(getNextDeliveryEvents("arrived")).toEqual(["delivered", "failed"]);
    expect(getNextDeliveryEvents("delivered")).toEqual([]);
  });

  it("creates a retry-stable contract payload without customer or route ownership", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "event-1" });
    expect(createDeliveryEvent(assignment, "failed", "customer_unavailable")).toMatchObject({
      clientEventId: "event-1",
      assignmentId: "assignment-1",
      orderId: "order-1",
      type: "failed",
      failureReason: "customer_unavailable",
    });
  });

  it("formats a complete address without empty segments", () => {
    expect(formatAddress(assignment.deliveryAddress)).toBe(
      "10 Market Street, San Antonio, Makati, Metro Manila, 1203",
    );
  });
});
