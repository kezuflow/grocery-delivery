import { describe, expect, it } from "vitest";

import { createCart, createCartLine, createLockedOrder, createMoney } from "@carbon/domain";

import type { CatalogDatabase, CatalogPreparedStatement } from "./catalog.js";
import { D1OrderRepository, D1OutboxPublisher } from "./orders.js";

const order = createLockedOrder({
  id: "order-1",
  customerId: "customer-1",
  subscriptionId: "subscription-1",
  planId: "plan-small",
  idempotencyKey: "checkout-1",
  requestFingerprint: "fingerprint-1",
  cart: createCart([
    createCartLine({ skuId: "sku-a", quantity: 2, unitPrice: createMoney(50_000) }),
  ]),
  weeklyCredit: createMoney(69_900),
  totals: {
    subtotal: createMoney(100_000),
    weeklyFee: createMoney(69_900),
    includedCredit: createMoney(69_900),
    overage: createMoney(30_100),
    deliveryFee: createMoney(5_000),
    totalDue: createMoney(105_000),
  },
  status: "locked",
  lockedAt: "2026-08-18T00:00:00.000Z",
});
const event = {
  id: "order-locked:order-1",
  type: "order.locked" as const,
  aggregateId: "order-1",
  occurredAt: order.lockedAt,
  payload: order,
};

describe("order repositories", () => {
  it("restores immutable order and line price snapshots", async () => {
    const database = new FakeOrderDatabase([
      [
        {
          id: "order-1",
          customer_id: "customer-1",
          subscription_id: "subscription-1",
          plan_id: "plan-small",
          idempotency_key: "checkout-1",
          request_fingerprint: "fingerprint-1",
          weekly_credit_centavos: 69_900,
          subtotal_centavos: 100_000,
          weekly_fee_centavos: 69_900,
          included_credit_centavos: 69_900,
          overage_centavos: 30_100,
          delivery_fee_centavos: 5_000,
          total_due_centavos: 105_000,
          locked_at: "2026-08-18T00:00:00.000Z",
        },
      ],
      [{ sku_id: "sku-a", quantity: 2, unit_price_centavos: 50_000 }],
    ]);

    await expect(
      new D1OrderRepository(database).findByIdempotencyKey("customer-1", "checkout-1"),
    ).resolves.toEqual(order);
  });

  it("persists the order, lines, and outbox event in one D1 batch", async () => {
    const database = new FakeOrderDatabase([]);
    await new D1OrderRepository(database).saveAndPublish(order, event);

    expect(database.batches).toHaveLength(1);
    expect(database.batches[0]).toHaveLength(3);
    expect(database.calls[0]?.sql).toContain("INSERT INTO orders");
    expect(database.calls[1]?.sql).toContain("INSERT INTO order_lines");
    expect(database.calls[2]?.sql).toContain("INSERT OR IGNORE INTO outbox_events");
  });

  it("publishes replayed outbox events idempotently", async () => {
    const database = new FakeOrderDatabase([]);
    await new D1OutboxPublisher(database).publish(event);

    expect(database.batches).toHaveLength(1);
    expect(database.calls[0]?.values).toContain("order-locked:order-1");
  });
});

class FakeOrderDatabase implements CatalogDatabase {
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
