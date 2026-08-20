import { describe, expect, it } from "vitest";

import { createWeeklyOperationsScheduler } from "./scheduler.js";

describe("weekly operations scheduler", () => {
  it("starts one idempotent workflow for the cycle closed by the Friday cutoff", async () => {
    const batches: unknown[] = [];
    const schedule = createWeeklyOperationsScheduler({
      createBatch: (batch) => {
        batches.push(batch);
        return Promise.resolve([]);
      },
    });

    await schedule(Date.parse("2026-08-21T10:05:00.000Z"));

    expect(batches).toEqual([
      [
        {
          id: "weekly-operations-cycle-2026-08-22",
          params: {
            cycleId: "cycle-2026-08-22",
            correlationId: "weekly-operations:cycle-2026-08-22",
          },
        },
      ],
    ]);
  });
});
