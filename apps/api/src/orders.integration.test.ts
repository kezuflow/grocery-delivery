import { readFile } from "node:fs/promises";
import { fileURLToPath, URL as NodeURL } from "node:url";

import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DefaultCartLockService, InMemoryOutboxPublisher } from "@carbon/application";
import { createCart, createCartLine, createPlan } from "@carbon/domain";
import { D1OrderRepository, D1OutboxPublisher } from "@carbon/db";

describe("D1 order lock integration", () => {
  let miniflare: Miniflare;
  let database: D1Database;
  let lockedOrderId: string;

  beforeAll(async () => {
    miniflare = new Miniflare({
      workers: [
        {
          config: {
            type: "worker",
            name: "api-test",
            compatibilityDate: "2026-08-18",
            manifest: {
              mainModule: "index.js",
              modules: {
                "index.js": {
                  type: "esm",
                  contents: "export default { fetch() { return new Response('ok'); } }",
                },
              },
            },
            env: { DB: { type: "d1", id: "carbon-test" } },
          },
        },
      ],
    });
    database = (await miniflare.getD1Database("DB")) as D1Database;
    for (const migration of [
      "0001_catalog.sql",
      "0002_plans_subscriptions.sql",
      "0003_orders_outbox.sql",
      "0024_order_cycle_snapshot.sql",
      "0025_promotions.sql",
      "0026_order_promotion_snapshot.sql",
      "0027_order_fulfillment_snapshots.sql",
    ]) {
      const sql = await readFile(
        fileURLToPath(new NodeURL(`../../../packages/db/migrations/${migration}`, import.meta.url)),
        "utf8",
      );
      for (const statement of sql
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)) {
        await database.prepare(statement).run();
      }
    }
    await database
      .prepare(
        `INSERT INTO catalog_categories (id, name, slug, active, created_at, updated_at)
         VALUES ('category-1', 'Produce', 'produce', 1, ?, ?)`,
      )
      .bind("2026-08-18T00:00:00.000Z", "2026-08-18T00:00:00.000Z")
      .run();
    await database
      .prepare(
        `INSERT INTO catalog_skus (
           id, category_id, name, slug, description, unit, image_url,
           current_procurement_cost_centavos, current_markup_basis_points,
           current_price_centavos, current_price_effective_at, active, created_at, updated_at
         ) VALUES ('sku-1', 'category-1', 'Rice', 'rice', 'Rice', 'kilogram', NULL,
                   40000, 0, 50000, '2026-08-18T00:00:00.000Z', 1, ?, ?)`,
      )
      .bind("2026-08-18T00:00:00.000Z", "2026-08-18T00:00:00.000Z")
      .run();
    await database
      .prepare(
        `INSERT INTO subscriptions (
           id, customer_id, plan_id, status, skipped_cycle_id, last_action, created_at, updated_at
         ) VALUES ('subscription-1', 'customer-1', 'plan-small', 'active', NULL, NULL, ?, ?)`,
      )
      .bind("2026-08-18T00:00:00.000Z", "2026-08-18T00:00:00.000Z")
      .run();
  });

  afterAll(async () => {
    await miniflare?.dispose();
  });

  it("replays a concurrent idempotent lock and publishes one durable outbox event", async () => {
    const plan = createPlan({
      id: "plan-small",
      code: "small",
      name: "Small",
      weeklyFee: { centavos: 69_900, currency: "PHP" },
      weeklyCredit: { centavos: 69_900, currency: "PHP" },
      displayOrder: 10,
      active: true,
    });
    const cart = createCart([
      createCartLine({
        skuId: "sku-1",
        quantity: 1,
        unitPrice: { centavos: 50_000, currency: "PHP" },
      }),
    ]);
    const input = {
      customerId: "customer-1",
      subscriptionId: "subscription-1",
      cycleId: "cycle-2026-08-22",
      idempotencyKey: "checkout-live-1",
      cart,
      plan,
      deliveryFee: { centavos: 5_000, currency: "PHP" } as const,
      lockedAt: "2026-08-20T10:00:00.000Z",
    };
    const first = new DefaultCartLockService(
      new D1OrderRepository(database),
      new D1OutboxPublisher(database),
      () => "order-live-1",
    );
    const second = new DefaultCartLockService(
      new D1OrderRepository(database),
      new D1OutboxPublisher(database),
      () => "order-live-2",
    );

    const [left, right] = await Promise.all([first.lock(input), second.lock(input)]);

    expect(left.id).toBe(right.id);
    lockedOrderId = left.id;
    const orders = await database
      .prepare("SELECT COUNT(*) AS count FROM orders WHERE customer_id = ? AND idempotency_key = ?")
      .bind("customer-1", "checkout-live-1")
      .first<{ count: number }>();
    const outbox = await database
      .prepare("SELECT COUNT(*) AS count FROM outbox_events WHERE aggregate_id = ?")
      .bind(left.id)
      .first<{ count: number }>();
    expect(orders?.count).toBe(1);
    expect(outbox?.count).toBe(1);
  });

  it("replays an existing lock through the real D1 repository", async () => {
    const repository = new D1OrderRepository(database);
    const existing = await repository.findByIdempotencyKey("customer-1", "checkout-live-1");
    expect(existing?.id).toBe(lockedOrderId);

    const outbox = new InMemoryOutboxPublisher();
    const service = new DefaultCartLockService(repository, outbox, () => "should-not-create");
    const replay = await service.lock({
      customerId: "customer-1",
      subscriptionId: "subscription-1",
      cycleId: existing!.cycleId,
      idempotencyKey: "checkout-live-1",
      cart: existing!.cart,
      plan: {
        id: existing!.planId,
        weeklyFee: existing!.totals.weeklyFee,
        weeklyCredit: existing!.weeklyCredit,
      },
      deliveryFee: existing!.totals.deliveryFee,
      lockedAt: existing!.lockedAt,
    });

    expect(replay.id).toBe(existing?.id);
    expect(outbox.events).toHaveLength(1);
  });
});
