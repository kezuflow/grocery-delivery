import { describe, expect, it } from "vitest";

import { createAuditEvent, createDefaultPlans, createPlanChangeRequest } from "@carbon/domain";

import type { CatalogDatabase, CatalogPreparedStatement } from "./catalog.js";
import { D1PlanApprovalRepository } from "./plan-approvals.js";

describe("plan approval repository", () => {
  it("restores pending requests and atomically records approval side effects", async () => {
    const database = new FakePlanApprovalDatabase([
      [
        {
          id: "change-1",
          plan_id: "plan-small",
          plan_code: "small",
          plan_name: "Small",
          weekly_fee_centavos: 69_900,
          weekly_credit_centavos: 69_900,
          display_order: 10,
          active: 1,
          proposed_by_user_id: "pricing-1",
          status: "pending",
          decided_by_user_id: null,
          decision_reason: null,
          created_at: "2026-08-18T00:00:00.000Z",
          decided_at: null,
        },
      ],
    ]);
    const repository = new D1PlanApprovalRepository(database);
    const request = await repository.findById("change-1");

    expect(request?.plan.code).toBe("small");
    await repository.saveDecision(
      createPlanChangeRequest({
        id: "change-1",
        plan: createDefaultPlans()[0]!,
        proposedByUserId: "pricing-1",
        status: "approved",
        decidedByUserId: "finance-1",
        decisionReason: null,
        createdAt: "2026-08-18T00:00:00.000Z",
        decidedAt: "2026-08-18T01:00:00.000Z",
      }),
      createAuditEvent({
        id: "audit-1",
        actorUserId: "finance-1",
        action: "plan.change-decided",
        targetType: "plan-change-request",
        targetId: "change-1",
        occurredAt: "2026-08-18T01:00:00.000Z",
        metadata: { status: "approved" },
      }),
    );

    expect(database.batches[0]?.length).toBe(4);
    expect(database.calls.map((call) => call.sql)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("UPDATE plan_change_requests"),
        expect.stringContaining("INSERT INTO plans"),
        expect.stringContaining("plan_cache_state"),
        expect.stringContaining("audit_events"),
      ]),
    );
  });
});

class FakePlanApprovalDatabase implements CatalogDatabase {
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
