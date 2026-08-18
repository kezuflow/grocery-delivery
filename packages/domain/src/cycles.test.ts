import { describe, expect, it } from "vitest";

import { assignWeeklyCycle } from "./cycles.js";

describe("weekly cycles", () => {
  it("assigns Friday before cutoff to the next Saturday", () => {
    const cycle = assignWeeklyCycle(new Date("2026-08-21T09:59:59.000Z"));

    expect(cycle.id).toBe("cycle-2026-08-22");
    expect(cycle.cutoffAt).toBe("2026-08-21T10:00:00.000Z");
    expect(cycle.timeZone).toBe("Asia/Manila");
  });

  it("moves Friday at or after cutoff to the following Saturday", () => {
    expect(assignWeeklyCycle(new Date("2026-08-21T10:00:00.000Z")).id).toBe("cycle-2026-08-29");
    expect(assignWeeklyCycle(new Date("2026-08-23T00:00:00.000Z")).id).toBe("cycle-2026-08-29");
  });

  it("supports a fake cutoff hour for deterministic tests", () => {
    expect(assignWeeklyCycle(new Date("2026-08-21T07:59:59.000Z"), 16).id).toBe("cycle-2026-08-22");
    expect(assignWeeklyCycle(new Date("2026-08-21T08:00:00.000Z"), 8).id).toBe("cycle-2026-08-29");
  });
});
