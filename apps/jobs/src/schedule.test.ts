import { describe, expect, it } from "vitest";
import { InMemoryOutboxRepository } from "@carbon/db";
import { createOperationalEventScheduler } from "./schedule.js";

describe("operational event scheduler", () => {
  it("schedules previous-day payment reconciliation and media retention once", async () => {
    const repository = new InMemoryOutboxRepository();
    const schedule = createOperationalEventScheduler(() => new Date("2026-08-21T04:00:00.000Z"));
    await schedule(repository);
    await schedule(repository);
    const claimed = await repository.claimPending({
      now: "2026-08-21T04:00:01.000Z",
      limit: 10,
      leaseSeconds: 300,
      claimToken: "claim-1",
    });
    expect(claimed.map((event) => event.id).sort()).toEqual([
      "payment-reconcile:2026-08-20",
      "retention-expire-media:2026-08-20",
    ]);
    expect(JSON.parse(claimed[0]!.payloadJson)).toEqual({
      from: "2026-08-20T00:00:00.000Z",
      to: "2026-08-20T23:59:59.999Z",
    });
  });
});
