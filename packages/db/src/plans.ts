import { createDefaultPlans, createPlan, type Plan } from "@carbon/domain";

import type { CatalogDatabase } from "./catalog.js";

export type PlanDatabase = CatalogDatabase;

export interface PlanReader {
  listPublic(): Promise<readonly Plan[]>;
}

export class InMemoryPlanReader implements PlanReader {
  private readonly plans: readonly Plan[];

  constructor(plans: readonly Plan[] = createDefaultPlans()) {
    this.plans = plans
      .map(createPlan)
      .sort(
        (left, right) =>
          left.displayOrder - right.displayOrder || left.code.localeCompare(right.code),
      );
  }

  listPublic(): Promise<readonly Plan[]> {
    return Promise.resolve(this.plans.filter((plan) => plan.active));
  }
}

export class D1PlanReader implements PlanReader {
  constructor(private readonly database: PlanDatabase) {}

  async listPublic(): Promise<readonly Plan[]> {
    const rows = await this.database
      .prepare(
        `SELECT id, code, name, weekly_fee_centavos, weekly_credit_centavos, display_order, active
         FROM plans
         WHERE active = 1
         ORDER BY display_order ASC, code ASC`,
      )
      .bind()
      .all<PlanRow>();

    return rows.results.map((row) =>
      createPlan({
        id: row.id,
        code: row.code,
        name: row.name,
        weeklyFee: { centavos: row.weekly_fee_centavos, currency: "PHP" },
        weeklyCredit: { centavos: row.weekly_credit_centavos, currency: "PHP" },
        displayOrder: row.display_order,
        active: row.active === 1,
      }),
    );
  }
}

type PlanRow = Record<string, unknown> & {
  id: string;
  code: string;
  name: string;
  weekly_fee_centavos: number;
  weekly_credit_centavos: number;
  display_order: number;
  active: number;
};

export function createDefaultPlanReader(): PlanReader {
  return new InMemoryPlanReader();
}
