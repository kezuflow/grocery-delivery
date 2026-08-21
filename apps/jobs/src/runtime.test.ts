import { describe, expect, it } from "vitest";
import { createEventProcessor } from "./runtime.js";

describe("jobs runtime composition", () => {
  it("returns an internal 429 immediately", async () => {
    const waits: number[] = [];
    let calls = 0;
    const processor = createEventProcessor(
      {
        EVENT_PROCESSOR: {
          fetch: (input, init) => {
            calls += 1;
            if (calls === 1) {
              expect(
                typeof input === "string"
                  ? input
                  : input instanceof URL
                    ? input.toString()
                    : input.url,
              ).toBe("https://event-processor.internal/internal/events/outbox");
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
    await expect(
      processor({
        outboxEventId: "outbox-1",
        eventType: "order.locked",
        aggregateId: "order-1",
        occurredAt: "2026-08-20T00:00:00.000Z",
        payloadJson: "{}",
        claimToken: "claim-1",
        correlationId: "correlation-1",
      }),
    ).rejects.toThrow("status 429");
    expect(calls).toBe(1);
    expect(waits).toEqual([]);
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

  it("preserves the bounded API error message for retry evidence", async () => {
    const processor = createEventProcessor({
      EVENT_PROCESSOR: {
        fetch: () =>
          Promise.resolve(
            Response.json(
              { error: { message: "PayMongo request failed with status 401" } },
              { status: 500 },
            ),
          ),
      },
    });

    await expect(
      processor({
        outboxEventId: "outbox-1",
        eventType: "payment.reconcile",
        aggregateId: "2026-08-20",
        occurredAt: "2026-08-21T00:00:00.000Z",
        payloadJson: '{"from":"2026-08-20T00:00:00.000Z","to":"2026-08-20T23:59:59.999Z"}',
        claimToken: "claim-1",
        correlationId: "correlation-1",
      }),
    ).rejects.toThrow(
      "event processor failed with status 500: PayMongo request failed with status 401",
    );
  });
});
