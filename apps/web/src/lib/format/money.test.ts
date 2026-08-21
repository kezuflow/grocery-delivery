import { describe, expect, it } from "vitest";

import { formatPhp } from "./money";

describe("PHP money formatting", () => {
  it("formats integer centavos without changing their value", () => {
    expect(formatPhp(12_550)).toContain("125.50");
  });
});
