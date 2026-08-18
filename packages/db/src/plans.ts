import { createDefaultPlans, createPlan, type Plan } from "@carbon/domain";

import type { CatalogDatabase } from "./catalog.js";

export type PlanDatabase = CatalogDatabase;

export interface PlanReader {
  listPublic(): Promise<readonly Plan[]>;
  getCacheVersion?(): Promise<string>;
}

export interface PlanLookup {
  findActiveById(planId: string): Promise<Plan | null>;
}

export interface PlanWriter {
  save(plan: Plan, updatedAt: string): Promise<void>;
}

export interface PlanRepository extends PlanReader, PlanWriter {}

export class InMemoryPlanReader implements PlanRepository, PlanLookup {
  private plans: readonly Plan[];
  private cacheVersion = "fixture-1";

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

  getCacheVersion(): Promise<string> {
    return Promise.resolve(this.cacheVersion);
  }

  findActiveById(planId: string): Promise<Plan | null> {
    const plan = this.plans.find((candidate) => candidate.id === planId && candidate.active);
    return Promise.resolve(plan ?? null);
  }

  save(plan: Plan): Promise<void> {
    const next = createPlan(plan);
    this.plans = [...this.plans.filter((candidate) => candidate.id !== next.id), next].sort(
      (left, right) =>
        left.displayOrder - right.displayOrder || left.code.localeCompare(right.code),
    );
    this.cacheVersion = `fixture-${Number(this.cacheVersion.split("-")[1] ?? 1) + 1}`;
    return Promise.resolve();
  }
}

export class D1PlanReader implements PlanReader, PlanLookup {
  constructor(protected readonly database: PlanDatabase) {}

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

  async getCacheVersion(): Promise<string> {
    const rows = await this.database
      .prepare(`SELECT version FROM plan_cache_state WHERE id = 'public'`)
      .bind()
      .all<PlanCacheRow>();
    return String(rows.results[0]?.version ?? 1);
  }

  async findActiveById(planId: string): Promise<Plan | null> {
    const rows = await this.database
      .prepare(
        `SELECT id, code, name, weekly_fee_centavos, weekly_credit_centavos, display_order, active
         FROM plans
         WHERE id = ? AND active = 1
         LIMIT 1`,
      )
      .bind(planId)
      .all<PlanRow>();
    const row = rows.results[0];
    return row
      ? createPlan({
          id: row.id,
          code: row.code,
          name: row.name,
          weeklyFee: { centavos: row.weekly_fee_centavos, currency: "PHP" },
          weeklyCredit: { centavos: row.weekly_credit_centavos, currency: "PHP" },
          displayOrder: row.display_order,
          active: row.active === 1,
        })
      : null;
  }
}

export class D1PlanRepository extends D1PlanReader implements PlanRepository {
  constructor(database: PlanDatabase) {
    super(database);
  }

  async save(plan: Plan, updatedAt: string): Promise<void> {
    const statement = this.database
      .prepare(
        `INSERT INTO plans (
           id, code, name, weekly_fee_centavos, weekly_credit_centavos,
           display_order, active, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           code = excluded.code,
           name = excluded.name,
           weekly_fee_centavos = excluded.weekly_fee_centavos,
           weekly_credit_centavos = excluded.weekly_credit_centavos,
           display_order = excluded.display_order,
           active = excluded.active,
           updated_at = excluded.updated_at`,
      )
      .bind(
        plan.id,
        plan.code,
        plan.name,
        plan.weeklyFee.centavos,
        plan.weeklyCredit.centavos,
        plan.displayOrder,
        plan.active ? 1 : 0,
        updatedAt,
        updatedAt,
      );
    const invalidateCache = this.database
      .prepare(
        `UPDATE plan_cache_state
         SET version = version + 1, updated_at = ?
         WHERE id = 'public'`,
      )
      .bind(updatedAt);
    await this.database.batch([statement, invalidateCache]);
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

type PlanCacheRow = Record<string, unknown> & { version: number };

export function createDefaultPlanReader(): InMemoryPlanReader {
  return new InMemoryPlanReader();
}
