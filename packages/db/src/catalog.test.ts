import { describe, expect, it } from "vitest";

import {
  D1CatalogReader,
  D1CatalogPricingRepository,
  InMemoryCatalogReader,
  type CatalogDatabase,
  type CatalogPreparedStatement,
} from "./catalog.js";
import { createMoney, type CatalogPriceHistoryEntry } from "@carbon/domain";

describe("catalog repositories", () => {
  it("returns no items for an unknown category", async () => {
    const reader = new InMemoryCatalogReader({
      categories: [{ id: "produce", name: "Produce", slug: "produce", active: true }],
      items: [],
    });

    await expect(reader.listPublic({ categorySlug: "missing", limit: 20 })).resolves.toMatchObject({
      items: [],
      nextAfterId: null,
    });
  });

  it("keeps cursors monotonic when the referenced item is absent", async () => {
    const reader = new InMemoryCatalogReader({
      categories: [{ id: "produce", name: "Produce", slug: "produce", active: true }],
      items: [
        {
          id: "sku-a",
          categoryId: "produce",
          name: "Apples",
          slug: "apples",
          description: "Crisp apples",
          unit: "kilogram",
          imageUrl: null,
          price: { centavos: 15_000, currency: "PHP" },
          active: true,
        },
      ],
    });

    await expect(reader.listPublic({ afterId: "sku-a0", limit: 20 })).resolves.toMatchObject({
      items: [],
      nextAfterId: null,
    });
  });

  it("maps D1 rows and requests one extra item for cursor pagination", async () => {
    const database = new FakeCatalogDatabase([
      [{ id: "produce", name: "Produce", slug: "produce", active: 1 }],
      [
        {
          id: "sku-a",
          category_id: "produce",
          name: "Apples",
          slug: "apples",
          description: "Crisp apples",
          unit: "kilogram",
          image_url: null,
          current_price_centavos: 15_000,
          active: 1,
        },
        {
          id: "sku-b",
          category_id: "produce",
          name: "Bananas",
          slug: "bananas",
          description: "Sweet bananas",
          unit: "kilogram",
          image_url: null,
          current_price_centavos: 12_500,
          active: 1,
        },
      ],
      [{ version: 7 }],
    ]);
    const reader = new D1CatalogReader(database);

    const page = await reader.listPublic({ categorySlug: "produce", limit: 1 });

    expect(page.items.map((item) => item.id)).toEqual(["sku-a"]);
    expect(page.cacheVersion).toBe("7");
    expect(page.nextAfterId).toBe("sku-a");
    expect(database.calls[1]?.values).toEqual(["produce", null, null, 2]);
  });

  it("reads effective markup candidates and records a price atomically", async () => {
    const database = new FakeCatalogDatabase([
      [
        {
          id: "markup-global",
          sku_id: null,
          basis_points: 2_500,
          effective_at: "2026-08-18T00:00:00.000Z",
        },
      ],
    ]);
    const repository = new D1CatalogPricingRepository(database);
    const rules = await repository.listMarkupCandidates("sku-a", "2026-08-18T00:00:00.000Z");
    const entry: CatalogPriceHistoryEntry = {
      id: "price-a",
      skuId: "sku-a",
      procurementCost: createMoney(10_000),
      markupBasisPoints: 2_500,
      price: createMoney(12_500),
      effectiveAt: "2026-08-18T00:00:00.000Z",
    };

    await repository.recordPrice(entry);

    expect(rules[0]?.basisPoints).toBe(2_500);
    expect(database.batches).toHaveLength(1);
    expect(database.calls.at(-3)?.values).toContain("price-a");
    expect(database.calls.at(-2)?.values).toContain("sku-a");
    expect(database.calls.at(-1)?.sql).toContain("catalog_cache_state");
  });
});

class FakeCatalogDatabase implements CatalogDatabase {
  readonly calls: Array<{ sql: string; values: unknown[] }> = [];
  readonly batches: Array<readonly CatalogPreparedStatement[]> = [];

  constructor(private readonly results: Array<readonly Record<string, unknown>[]>) {}

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
