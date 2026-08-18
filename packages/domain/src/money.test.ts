import { describe, expect, it } from "vitest";

import { DomainValidationError } from "./errors.js";
import { addMoney, createMoney, multiplyMoney, subtractMoney } from "./money.js";

describe("money", () => {
  it("stores PHP amounts as integer centavos", () => {
    expect(createMoney(12_345)).toEqual({ centavos: 12_345, currency: "PHP" });
  });

  it("supports signed arithmetic for charges and adjustments", () => {
    expect(addMoney(createMoney(10_000), createMoney(2_500)).centavos).toBe(12_500);
    expect(subtractMoney(createMoney(10_000), createMoney(12_500)).centavos).toBe(-2_500);
  });

  it("multiplies only by a non-negative integer quantity", () => {
    expect(multiplyMoney(createMoney(1_250), 3).centavos).toBe(3_750);
    expect(() => multiplyMoney(createMoney(1_250), -1)).toThrow(DomainValidationError);
  });

  it("rejects fractional and unsafe amounts", () => {
    expect(() => createMoney(1.5)).toThrow(DomainValidationError);
    expect(() => createMoney(Number.MAX_SAFE_INTEGER + 1)).toThrow(DomainValidationError);
  });
});
