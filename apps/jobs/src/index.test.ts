import { describe, expect, it } from "vitest";

import { createReconciliationJob } from "./index.js";

describe("reconciliation job adapter", () => {
  it("adds a deterministic job timestamp before invoking the billing runner", async () => {
    const calls: unknown[] = [];
    const job = createReconciliationJob(
      {
        run: (input) => {
          calls.push(input);
          return Promise.resolve({
            providerName: "fake",
            from: input.from,
            to: input.to,
            providerEntryCount: 0,
            discrepancyCount: 0,
            discrepancies: [],
          });
        },
      },
      () => new Date("2026-08-21T00:00:00.000Z"),
    );

    await expect(
      job({ from: "2026-08-20T00:00:00.000Z", to: "2026-08-20T23:59:59.000Z" }),
    ).resolves.toMatchObject({ providerName: "fake" });
    expect(calls).toEqual([
      {
        from: "2026-08-20T00:00:00.000Z",
        to: "2026-08-20T23:59:59.000Z",
        now: "2026-08-21T00:00:00.000Z",
      },
    ]);
  });
});
