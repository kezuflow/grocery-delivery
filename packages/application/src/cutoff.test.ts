import { describe, expect, it } from "vitest";
import { evaluateOrderCutoff } from "./cutoff.js";

describe("order cutoff", () => {
  it("allows orders before Friday cutoff", () => {
    expect(evaluateOrderCutoff(new Date("2026-08-21T09:59:59.000Z")).allowed).toBe(true);
  });
  it("rejects orders at and after Friday cutoff", () => {
    const decision = evaluateOrderCutoff(new Date("2026-08-21T10:00:00.000Z"));
    expect(decision).toMatchObject({
      allowed: false,
      cycleId: "cycle-2026-08-22",
      cutoffAt: "2026-08-21T10:00:00.000Z",
    });
  });
});
