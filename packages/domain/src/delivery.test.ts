import { describe, expect, it } from "vitest";

import { createDeliveryAddress } from "./delivery.js";

const address = {
  customerId: "customer-1",
  recipientName: "Maria Santos",
  phone: "+639171234567",
  line1: "12 Green Street",
  line2: null,
  barangay: "Bagong Pagasa",
  city: "Quezon City",
  province: "Metro Manila",
  postalCode: "1105",
  instructions: null,
  createdAt: "2026-08-19T00:00:00.000Z",
  updatedAt: "2026-08-19T00:00:00.000Z",
} as const;

describe("delivery address rules", () => {
  it("accepts a normalized Philippine address", () => {
    expect(createDeliveryAddress(address)).toMatchObject(address);
  });

  it("rejects malformed postal codes and phone numbers", () => {
    expect(() => createDeliveryAddress({ ...address, postalCode: "110" })).toThrow("postal code");
    expect(() => createDeliveryAddress({ ...address, phone: "abc" })).toThrow("phone");
  });
});
