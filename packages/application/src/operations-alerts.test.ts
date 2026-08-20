import { describe, expect, it } from "vitest";

import { createOperationalAlerts } from "./operations-alerts.js";

const projection = {
  cycleId: "cycle-1",
  generatedAt: "2026-08-20T10:00:00.000Z",
  outbox: { pendingCount: 0, oldestPendingAt: null, deadLetteredCount: 0 },
  delivery: { failed: 0 },
  procurement: { openShortages: 0, exceptionalManifests: 0 },
};

describe("operational alerts", () => {
  it("returns no alerts for a healthy projection", () => {
    expect(createOperationalAlerts(projection)).toEqual([]);
  });

  it("creates deterministic alerts for each configured threshold", () => {
    expect(
      createOperationalAlerts(
        {
          ...projection,
          outbox: {
            pendingCount: 3,
            oldestPendingAt: "2026-08-20T09:40:00.000Z",
            deadLetteredCount: 1,
          },
          delivery: { failed: 2 },
          procurement: { openShortages: 1, exceptionalManifests: 1 },
        },
        {
          pendingOutboxCount: 3,
          pendingOutboxAgeSeconds: 1_200,
          deadLetteredOutboxCount: 1,
          failedDeliveryCount: 2,
          openShortageCount: 1,
          exceptionalManifestCount: 1,
        },
      ),
    ).toEqual([
      expect.objectContaining({ id: "cycle-1:outbox-dead-lettered", severity: "critical" }),
      expect.objectContaining({ id: "cycle-1:outbox-backlog", observedValue: 3 }),
      expect.objectContaining({ id: "cycle-1:outbox-stale", observedValue: 1_200 }),
      expect.objectContaining({ id: "cycle-1:delivery-failures", severity: "critical" }),
      expect.objectContaining({ id: "cycle-1:procurement-shortages" }),
      expect.objectContaining({ id: "cycle-1:packing-exceptions", severity: "critical" }),
    ]);
  });

  it("rejects invalid operational thresholds", () => {
    expect(() => createOperationalAlerts(projection, { failedDeliveryCount: 0 })).toThrow(
      "operational alert thresholds must be positive integers",
    );
  });
});
