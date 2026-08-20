import { describe, expect, it } from "vitest";

import { createSubscription } from "@carbon/domain";

import type { CatalogDatabase, CatalogPreparedStatement } from "./catalog.js";
import {
  D1SubscriptionIdempotencyStore,
  D1SubscriptionRepository,
  InMemorySubscriptionReader,
} from "./subscriptions.js";

const subscription = createSubscription({
  id: "subscription-1",
  customerId: "customer-1",
  planId: "plan-small",
  status: "active",
  skippedCycleId: null,
  lastAction: null,
  createdAt: "2026-08-18T00:00:00.000Z",
  updatedAt: "2026-08-18T00:00:00.000Z",
});

describe("subscription repositories", () => {
  it("reads and persists customer subscriptions in memory", async () => {
    const repository = new InMemorySubscriptionReader([subscription]);
    await expect(repository.findByCustomerId("customer-1")).resolves.toEqual(subscription);
    await expect(repository.findByCustomerId("missing")).resolves.toBeNull();
  });

  it("maps D1 rows and uses an upsert for state changes", async () => {
    const database = new FakeSubscriptionDatabase([
      [
        {
          id: "subscription-1",
          customer_id: "customer-1",
          plan_id: "plan-small",
          status: "paused",
          billing_status: "past_due",
          effective_cycle_id: "cycle-2026-08-22",
          skipped_cycle_id: null,
          last_action: "pause",
          created_at: "2026-08-18T00:00:00.000Z",
          updated_at: "2026-08-19T00:00:00.000Z",
        },
      ],
    ]);
    const repository = new D1SubscriptionRepository(database);

    await expect(repository.findByCustomerId("customer-1")).resolves.toMatchObject({
      status: "paused",
      billingStatus: "past_due",
      effectiveCycleId: "cycle-2026-08-22",
      lastAction: "pause",
    });
    await repository.save(subscription);

    expect(database.calls[0]?.values).toEqual(["customer-1"]);
    expect(database.calls[1]?.sql).toContain("ON CONFLICT(customer_id)");
    expect(database.calls[1]?.values).toContain("current");
    expect(database.batches).toHaveLength(1);
  });

  it("persists and restores subscription idempotency records", async () => {
    const fingerprint = JSON.stringify({ action: "pause" });
    const database = new FakeSubscriptionDatabase([
      [
        {
          idempotency_key: "action-1",
          fingerprint,
          result_json: JSON.stringify(subscription),
        },
      ],
    ]);
    const store = new D1SubscriptionIdempotencyStore(database);

    await expect(store.get("action-1")).resolves.toMatchObject({
      key: "action-1",
      fingerprint,
      subscription: { id: "subscription-1" },
    });
    await store.put({ key: "action-2", fingerprint, subscription });

    expect(database.calls[1]?.values).toEqual([
      "action-2",
      "customer-1",
      fingerprint,
      "subscription-1",
      JSON.stringify(subscription),
      "2026-08-18T00:00:00.000Z",
    ]);
    expect(database.batches).toHaveLength(1);
  });

  it("can persist a subscription and its idempotency result atomically", async () => {
    const database = new FakeSubscriptionDatabase([]);
    const repository = new D1SubscriptionRepository(database);
    const record = { key: "action-1", fingerprint: "fingerprint", subscription };

    await repository.saveAndRecord(subscription, record);

    expect(database.batches).toHaveLength(1);
    expect(database.batches[0]).toHaveLength(2);
    expect(database.calls[1]?.sql).toContain("subscription_idempotency");
  });
});

class FakeSubscriptionDatabase implements CatalogDatabase {
  readonly calls: Array<{ sql: string; values: unknown[] }> = [];
  readonly batches: Array<readonly CatalogPreparedStatement[]> = [];

  constructor(private readonly results: readonly (readonly Record<string, unknown>[])[]) {}

  prepare(sql: string): CatalogPreparedStatement {
    const call = { sql, values: [] as unknown[] };
    this.calls.push(call);
    const result = this.results[this.calls.length - 1] ?? [];
    const statement: CatalogPreparedStatement = {
      bind: (...values) => {
        call.values = values;
        return statement;
      },
      all: <T extends Record<string, unknown>>() =>
        Promise.resolve({ results: result as readonly T[] }),
    };
    return statement;
  }

  batch(statements: readonly CatalogPreparedStatement[]): Promise<readonly unknown[]> {
    this.batches.push(statements);
    return Promise.resolve([]);
  }
}
