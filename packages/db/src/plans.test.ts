import { describe, expect, it } from "vitest";

import type { CatalogDatabase, CatalogPreparedStatement } from "./catalog.js";
import { D1PlanReader, InMemoryPlanReader } from "./plans.js";

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
});

class FakePlanDatabase implements CatalogDatabase {
  readonly calls: Array<{ sql: string; values: unknown[] }> = [];

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

  batch(): Promise<readonly unknown[]> {
    return Promise.resolve([]);
  }
}
