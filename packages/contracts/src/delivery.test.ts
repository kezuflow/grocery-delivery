import { describe, expect, it } from "vitest";

import { deliveryAddressInputSchema } from "./delivery.js";

describe("delivery address contracts", () => {
  it("normalizes optional address fields", () => {
    expect(
      deliveryAddressInputSchema.parse({
        recipientName: " Maria Santos ",
        phone: "+639171234567",
        line1: "12 Green Street",
        line2: "",
        barangay: "Bagong Pagasa",
        city: "Quezon City",
        province: "Metro Manila",
        postalCode: "1105",
        instructions: "",
      }),
    ).toMatchObject({ recipientName: "Maria Santos", line2: null, instructions: null });
  });

  it("rejects non-Philippine postal-code shapes", () => {
    expect(() =>
      deliveryAddressInputSchema.parse({
        recipientName: "Maria Santos",
        phone: "+639171234567",
        line1: "12 Green Street",
        barangay: "Bagong Pagasa",
        city: "Quezon City",
        province: "Metro Manila",
        postalCode: "ABC",
      }),
    ).toThrow();
  });
});
