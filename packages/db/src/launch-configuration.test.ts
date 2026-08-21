import { describe, expect, it } from "vitest";

import type { LaunchConfiguration, LaunchConfigurationCommand } from "@carbon/application";
import {
  createAuditEvent,
  createCatalogCategory,
  createCatalogMarkupRule,
  createCatalogPriceHistoryEntry,
  createCatalogSku,
  createDeliveryWindow,
  createMoney,
} from "@carbon/domain";

import type { CatalogDatabase, CatalogPreparedStatement } from "./catalog.js";
import { D1LaunchConfigurationRepository } from "./launch-configuration.js";

describe("launch configuration repository", () => {
  it("restores a stored idempotent command", async () => {
    const database = new FakeLaunchConfigurationDatabase([
      [
        {
          idempotency_key: "launch-1",
          fingerprint: "fingerprint-1",
          result_json: JSON.stringify(command().result),
        },
      ],
    ]);

    await expect(
      new D1LaunchConfigurationRepository(database).findCommand("launch-1"),
    ).resolves.toEqual(command());
  });

  it("atomically writes launch data, invalidation, audit, and the command marker last", async () => {
    const database = new FakeLaunchConfigurationDatabase([]);
    const repository = new D1LaunchConfigurationRepository(database);

    await repository.apply(
      configuration(),
      command(),
      createAuditEvent({
        id: "audit-1",
        actorUserId: "admin-1",
        action: "launch-configuration.applied",
        targetType: "launch-configuration",
        targetId: "launch-1",
        occurredAt: "2026-08-21T08:00:00.000Z",
        metadata: { reason: "Approved staging launch manifest" },
      }),
    );

    expect(database.batches).toHaveLength(1);
    expect(database.batches[0]).toHaveLength(8);
    expect(database.calls.map((call) => call.sql)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("INSERT INTO catalog_categories"),
        expect.stringContaining("INSERT INTO catalog_skus"),
        expect.stringContaining("INSERT INTO catalog_markup_rules"),
        expect.stringContaining("INSERT INTO catalog_price_history"),
        expect.stringContaining("INSERT INTO delivery_windows"),
        expect.stringContaining("UPDATE catalog_cache_state"),
        expect.stringContaining("INSERT INTO audit_events"),
      ]),
    );
    expect(database.calls.at(-1)?.sql).toContain("INSERT INTO launch_configuration_commands");
    expect(
      database.calls.find((call) => call.sql.includes("INSERT INTO catalog_skus"))?.values,
    ).toContain(12_500);
  });
});

function command(): LaunchConfigurationCommand {
  return {
    idempotencyKey: "launch-1",
    fingerprint: "fingerprint-1",
    result: {
      idempotencyKey: "launch-1",
      categoryCount: 1,
      skuCount: 1,
      deliveryWindowCount: 1,
      appliedAt: "2026-08-21T08:00:00.000Z",
    },
  };
}

function configuration(): LaunchConfiguration {
  const procurementCost = createMoney(10_000);
  const globalMarkup = createCatalogMarkupRule({
    id: "global-1",
    skuId: null,
    basisPoints: 0,
    effectiveAt: "2026-08-21T08:00:00.000Z",
  });
  const markupRule = createCatalogMarkupRule({
    id: "launch-markup:banana-kg",
    skuId: "banana-kg",
    basisPoints: 2_500,
    effectiveAt: "2026-08-21T08:00:00.000Z",
  });
  const price = createMoney(12_500);
  return {
    categories: [
      createCatalogCategory({ id: "fruit", name: "Fruit", slug: "fruit", active: true }),
    ],
    skus: [
      {
        sku: createCatalogSku({
          id: "banana-kg",
          categoryId: "fruit",
          name: "Bananas",
          slug: "bananas",
          description: "Fresh bananas",
          unit: "kilogram",
          imageUrl: null,
          price,
          active: true,
        }),
        procurementCost,
        markupRule,
        priceHistory: createCatalogPriceHistoryEntry(
          {
            id: "launch-price:banana-kg:2026-08-21T08:00:00.000Z",
            skuId: "banana-kg",
            procurementCost,
            markupBasisPoints: 2_500,
            price,
            effectiveAt: "2026-08-21T08:00:00.000Z",
          },
          globalMarkup,
          markupRule,
        ),
      },
    ],
    deliveryWindows: [
      createDeliveryWindow({
        id: "window-1",
        cycleId: "cycle-2026-08-22",
        label: "Saturday morning",
        startsAt: "2026-08-22T00:00:00.000Z",
        endsAt: "2026-08-22T04:00:00.000Z",
        capacity: 50,
        active: true,
        createdAt: "2026-08-21T08:00:00.000Z",
        updatedAt: "2026-08-21T08:00:00.000Z",
      }),
    ],
  };
}

class FakeLaunchConfigurationDatabase implements CatalogDatabase {
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
