import { describe, expect, it } from "vitest";

import { InMemoryOperationalProjectionRepository } from "./operations.js";

describe("operational projections", () => {
  it("returns a stable server-owned snapshot without duplicating source records", async () => {
    const repository = new InMemoryOperationalProjectionRepository({
      outbox: {
        pendingCount: 2,
        oldestPendingAt: "2026-08-22T04:00:00.000Z",
        deadLetteredCount: 1,
      },
      delivery: { totalAssignments: 4, assigned: 1, outForDelivery: 1, delivered: 1, failed: 1 },
      procurement: { openShortages: 2, exceptionalManifests: 1 },
    });

    await expect(repository.get("cycle-2026-08-29", "2026-08-22T05:00:00.000Z")).resolves.toEqual({
      cycleId: "cycle-2026-08-29",
      generatedAt: "2026-08-22T05:00:00.000Z",
      outbox: {
        pendingCount: 2,
        oldestPendingAt: "2026-08-22T04:00:00.000Z",
        deadLetteredCount: 1,
      },
      delivery: { totalAssignments: 4, assigned: 1, outForDelivery: 1, delivered: 1, failed: 1 },
      procurement: { openShortages: 2, exceptionalManifests: 1 },
    });
  });
});
