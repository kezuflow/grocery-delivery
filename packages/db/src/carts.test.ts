import { describe, expect, it } from "vitest";

import type { CatalogDatabase, CatalogPreparedStatement } from "./catalog.js";
import { D1CartRepository, InMemoryCartRepository } from "./carts.js";

const cart = {
  customerId: "customer-1",
  lines: [{ skuId: "sku-a", quantity: 2 }],
  updatedAt: "2026-08-19T00:00:00.000Z",
};

describe("cart repositories", () => {
  it("stores and clears a customer's draft cart", async () => {
    const repository = new InMemoryCartRepository();
    await repository.save(cart);
    await expect(repository.findByCustomerId("customer-1")).resolves.toEqual(cart);
    await repository.clear("customer-1");
    await expect(repository.findByCustomerId("customer-1")).resolves.toBeNull();
  });

  it("writes cart header and lines in one D1 batch", async () => {
    const database = new FakeCartDatabase([
      [{ customer_id: "customer-1", updated_at: cart.updatedAt }],
      [
        {
          sku_id: "sku-a",
          quantity: 2,
          unit_price_centavos: 12_500,
          substitution_preference: "refund",
        },
      ],
    ]);
    const repository = new D1CartRepository(database);
    await expect(repository.findByCustomerId("customer-1")).resolves.toEqual({
      ...cart,
      lines: [
        {
          skuId: "sku-a",
          quantity: 2,
          unitPriceCentavos: 12_500,
          substitutionPreference: "refund",
        },
      ],
    });
    await repository.save(cart);

    expect(database.batches).toHaveLength(1);
    expect(database.batches[0]).toHaveLength(3);
    expect(database.calls.at(-1)?.sql).toContain("INSERT INTO cart_lines");
  });
});

class FakeCartDatabase implements CatalogDatabase {
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
