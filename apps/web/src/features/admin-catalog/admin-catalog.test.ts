import { describe, expect, it } from "vitest";

import { percentToBasisPoints, pesosToCentavos } from "./admin-catalog";

describe("admin catalog form conversions", () => {
  it("converts familiar pesos and percent values to server units", () => {
    expect(pesosToCentavos("125.50")).toBe(12_550);
    expect(percentToBasisPoints("12.5")).toBe(1_250);
  });

  it("rejects negative and non-numeric values", () => {
    expect(pesosToCentavos("-1")).toBeNull();
    expect(percentToBasisPoints("markup")).toBeNull();
  });
});
