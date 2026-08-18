import { describe, expect, it } from "vitest";

import type { CatalogDatabase, CatalogPreparedStatement } from "./catalog.js";
import { D1PlanReader, D1PlanRepository, InMemoryPlanReader } from "./plans.js";

describe("plan repositories", () => {
  it("filters inactive plans and accepts admin-defined plan codes", async () => {
    const reader = new InMemoryPlanReader([
      {
        id: "plan-family",
        code: "family-box",
        name: "Family Box",
        weeklyFee: { centavos: 199_900, currency: "PHP" },
        weeklyCredit: { centavos: 199_900, currency: "PHP" },
        displayOrder: 10,
        active: true,
      },
      {
        id: "plan-retired",
        code: "retired",
        name: "Retired",
        weeklyFee: { centavos: 1, currency: "PHP" },
        weeklyCredit: { centavos: 1, currency: "PHP" },
        displayOrder: 20,
        active: false,
      },
    ]);

    await expect(reader.listPublic()).resolves.toMatchObject([{ code: "family-box" }]);
  });

  it("maps active plan settings from D1", async () => {
    const database = new FakePlanDatabase([
      {
        id: "plan-family",
        code: "family-box",
        name: "Family Box",
        weekly_fee_centavos: 199_900,
        weekly_credit_centavos: 210_000,
        display_order: 5,
        active: 1,
      },
    ]);

    const plans = await new D1PlanReader(database).listPublic();

    expect(plans[0]).toMatchObject({
      code: "family-box",
      weeklyFee: { centavos: 199_900 },
      weeklyCredit: { centavos: 210_000 },
    });
    expect(database.calls[0]?.sql).toContain("WHERE active = 1");
  });

  it("upserts plan settings and invalidates the D1 cache version", async () => {
    const database = new FakePlanDatabase([{}]);
    const repository = new D1PlanRepository(database);

    await repository.save(
      {
        id: "plan-family",
        code: "family-box",
        name: "Family Box",
        weeklyFee: { centavos: 199_900, currency: "PHP" },
        weeklyCredit: { centavos: 210_000, currency: "PHP" },
        displayOrder: 5,
        active: true,
      },
      "2026-08-18T01:00:00.000Z",
    );

    expect(database.batches).toHaveLength(1);
    expect(database.batches[0]).toHaveLength(2);
    expect(database.calls[0]?.sql).toContain("ON CONFLICT(id)");
    expect(database.calls[1]?.sql).toContain("plan_cache_state");
  });
});

class FakePlanDatabase implements CatalogDatabase {
  readonly calls: Array<{ sql: string; values: unknown[] }> = [];
  readonly batches: Array<readonly CatalogPreparedStatement[]> = [];

  constructor(private readonly results: readonly Record<string, unknown>[]) {}

  prepare(sql: string): CatalogPreparedStatement {
    const call = { sql, values: [] as unknown[] };
    this.calls.push(call);
    const statement: CatalogPreparedStatement = {
      bind: (...values) => {
        call.values = values;
        return statement;
      },
      all: <T extends Record<string, unknown>>() =>
        Promise.resolve({ results: this.results as readonly T[] }),
    };
    return statement;
  }

  batch(statements: readonly CatalogPreparedStatement[]): Promise<readonly unknown[]> {
    this.batches.push(statements);
    return Promise.resolve([]);
  }
}
