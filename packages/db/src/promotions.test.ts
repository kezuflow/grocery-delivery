import { describe, expect, it } from "vitest";

import { createMoney } from "@carbon/domain";
import type { CatalogDatabase, CatalogPreparedStatement } from "./catalog.js";
import { D1PromotionRepository } from "./promotions.js";

describe("promotion repository", () => {
  it("restores normalized campaigns and idempotent redemption snapshots", async () => {
    const database = new FakePromotionDatabase([
      [
        {
          id: "promo-1",
          code: "WELCOME10",
          version: 2,
          status: "active",
          starts_at: "2026-08-01T00:00:00.000Z",
          ends_at: "2026-09-01T00:00:00.000Z",
          discount_json: JSON.stringify({
            kind: "percentage",
            basisPoints: 1000,
            maximum: { centavos: 5000, currency: "PHP" },
          }),
          minimum_subtotal_centavos: 20_000,
          plan_ids_json: JSON.stringify(["plan-small"]),
          sku_ids_json: "[]",
          category_ids_json: "[]",
          first_order_only: 0,
          first_week_only: 0,
          total_budget_centavos: 100_000,
          total_redemptions: 10,
          per_customer_redemptions: 1,
          redeemed_amount_centavos: 5_000,
          redemption_count: 1,
          allows_stacking: 0,
        },
      ],
      [
        {
          id: "redemption-1",
          promotion_id: "promo-1",
          customer_id: "customer-1",
          idempotency_key: "coupon-1",
          request_fingerprint: "fingerprint-1",
          result_json: JSON.stringify({
            promotionId: "promo-1",
            discount: { centavos: 5000, currency: "PHP" },
            deliveryFee: { centavos: 5000, currency: "PHP" },
            reason: null,
          }),
          created_at: "2026-08-20T10:00:00.000Z",
        },
      ],
      [{ count: 1 }],
    ]);
    const repository = new D1PromotionRepository(database);

    await expect(repository.findActiveByCode(" welcome10 ")).resolves.toMatchObject({
      id: "promo-1",
      minimumSubtotal: createMoney(20_000),
      discount: { kind: "percentage", maximum: createMoney(5_000) },
    });
    await expect(repository.findRedemption("customer-1", "coupon-1")).resolves.toMatchObject({
      id: "redemption-1",
      result: { discount: createMoney(5_000) },
    });
    await expect(repository.countCustomerRedemptions("promo-1", "customer-1")).resolves.toBe(1);
  });

  it("writes redemption persistence through one batch", async () => {
    const database = new FakePromotionDatabase([
      [],
      [],
      [
        {
          id: "redemption-1",
          promotion_id: "promo-1",
          customer_id: "customer-1",
          idempotency_key: "coupon-1",
          request_fingerprint: "fingerprint-1",
          result_json: JSON.stringify({
            promotionId: "promo-1",
            discount: { centavos: 5000, currency: "PHP" },
            deliveryFee: { centavos: 5000, currency: "PHP" },
            reason: null,
          }),
          created_at: "2026-08-20T10:00:00.000Z",
        },
      ],
    ]);
    const repository = new D1PromotionRepository(database);

    await repository.saveRedemptionAndUpdatePromotion({
      id: "redemption-1",
      promotionId: "promo-1",
      customerId: "customer-1",
      idempotencyKey: "coupon-1",
      requestFingerprint: "fingerprint-1",
      result: {
        promotionId: "promo-1",
        discount: createMoney(5_000),
        deliveryFee: createMoney(5_000),
        reason: null,
      },
      createdAt: "2026-08-20T10:00:00.000Z",
    });

    expect(database.batches).toHaveLength(1);
    expect(database.batches[0]).toHaveLength(2);
    expect(database.calls[0]?.sql).toContain("INSERT OR IGNORE INTO promotion_redemptions");
  });
});

class FakePromotionDatabase implements CatalogDatabase {
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
