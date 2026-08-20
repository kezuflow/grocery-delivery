import { describe, expect, it } from "vitest";
import type { ReconciliationInput, ReconciliationReport } from "@carbon/billing";
import { createEventProcessorHandlers } from "./event-processors.js";

const message = (eventType: string, payloadJson = "{}") => ({
  outboxEventId: "event-1",
  eventType,
  aggregateId: "aggregate-1",
  occurredAt: "2026-08-21T00:00:00.000Z",
  payloadJson,
  claimToken: "claim-1",
  correlationId: "correlation-1",
});

describe("event processor handlers", () => {
  it("dispatches notification events with a stable key", async () => {
    const calls: unknown[] = [];
    const processor = createEventProcessorHandlers({
      notificationTransport: {
        send: (event) => {
          calls.push(event);
          return Promise.resolve();
        },
      },
    });
    await processor!(
      "notification",
      message(
        "order.locked",
        JSON.stringify({
          id: "order-1",
          customerId: "customer-1",
          cycleId: "cycle-1",
          lockedAt: "2026-08-20T00:00:00.000Z",
          totals: { totalDue: { centavos: 999999, currency: "PHP" } },
        }),
      ),
    );
    expect(calls).toEqual([
      expect.objectContaining({
        idempotencyKey: "outbox:event-1",
        eventType: "order.locked",
        payloadJson: JSON.stringify({
          customerId: "customer-1",
          orderId: "order-1",
          cycleId: "cycle-1",
          lockedAt: "2026-08-20T00:00:00.000Z",
        }),
      }),
    ]);
  });

  it("runs payment reconciliation only for the supported event shape", async () => {
    const calls: unknown[] = [];
    const processor = createEventProcessorHandlers({
      paymentReconciliation: {
        run: (input: ReconciliationInput): Promise<ReconciliationReport> => {
          calls.push(input);
          return Promise.resolve({
            providerName: "paymongo",
            from: input.from,
            to: input.to,
            providerEntryCount: 0,
            discrepancyCount: 0,
            discrepancies: [],
          });
        },
      } as never,
    });
    await processor!(
      "payment",
      message(
        "payment.reconcile",
        JSON.stringify({ from: "2026-08-20T00:00:00.000Z", to: "2026-08-20T23:59:59.000Z" }),
      ),
    );
    expect(calls).toEqual([
      {
        from: "2026-08-20T00:00:00.000Z",
        to: "2026-08-20T23:59:59.000Z",
        now: "2026-08-21T00:00:00.000Z",
      },
    ]);
    await expect(processor!("payment", message("payment.unknown"))).rejects.toThrow(
      "unsupported payment event type",
    );
  });

  it("runs retention handlers and reports unavailable lanes", async () => {
    let calls = 0;
    const processor = createEventProcessorHandlers({
      retention: () => {
        calls += 1;
        return Promise.resolve({ deleted: 1 });
      },
    });
    await processor!("retention", message("retention.expire-media"));
    expect(calls).toBe(1);
    expect(createEventProcessorHandlers({})).toBeUndefined();
    const retentionOnly = createEventProcessorHandlers({ retention: () => Promise.resolve() });
    await expect(retentionOnly!("notification", message("order.locked"))).rejects.toThrow(
      "notification transport is unavailable",
    );
  });
});
