import { describe, expect, it } from "vitest";
import { createEventProcessor } from "./runtime.js";

describe("jobs runtime composition", () => {
  it("retries an internal 429 after five seconds", async () => {
    const waits: number[] = [];
    let calls = 0;
    const processor = createEventProcessor(
      {
        EVENT_PROCESSOR: {
          fetch: (_input, init) => {
            calls += 1;
            if (calls === 1) {
              expect(new Headers(init?.headers).get("x-event-processor")).toBe("notification");
            }
            return Promise.resolve(new Response(null, { status: calls === 1 ? 429 : 204 }));
          },
        },
      },
      {
        sleep: (milliseconds) => {
          waits.push(milliseconds);
          return Promise.resolve();
        },
      },
    );
    await processor({
      outboxEventId: "outbox-1",
      eventType: "order.locked",
      aggregateId: "order-1",
      occurredAt: "2026-08-20T00:00:00.000Z",
      payloadJson: "{}",
      claimToken: "claim-1",
      correlationId: "correlation-1",
    });
    expect(calls).toBe(2);
    expect(waits).toEqual([5000]);
  });

  it("forwards the configured internal processor token", async () => {
    const processor = createEventProcessor({
      EVENT_PROCESSOR_TOKEN: "processor-token",
      EVENT_PROCESSOR: {
        fetch: (_input, init) => {
          expect(new Headers(init?.headers).get("x-event-processor-token")).toBe("processor-token");
          return Promise.resolve(new Response(null, { status: 202 }));
        },
      },
    });

    await processor({
      outboxEventId: "outbox-1",
      eventType: "order.locked",
      aggregateId: "order-1",
      occurredAt: "2026-08-20T00:00:00.000Z",
      payloadJson: "{}",
      claimToken: "claim-1",
      correlationId: "correlation-1",
    });
  });
});
