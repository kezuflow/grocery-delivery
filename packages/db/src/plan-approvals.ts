import {
  createAuditEvent,
  createMoney,
  createPlan,
  createPlanChangeRequest,
  type AuditEvent,
  type PlanChangeRequest,
} from "@carbon/domain";

import type { CatalogDatabase, CatalogPreparedStatement } from "./catalog.js";

export type PlanApprovalDatabase = CatalogDatabase;

export interface PlanApprovalRepository {
  findById(id: string): Promise<PlanChangeRequest | null>;
  savePending(request: PlanChangeRequest, audit: AuditEvent): Promise<void>;
  saveDecision(request: PlanChangeRequest, audit: AuditEvent): Promise<void>;
}

export class D1PlanApprovalRepository implements PlanApprovalRepository {
  constructor(private readonly database: PlanApprovalDatabase) {}

  async findById(id: string): Promise<PlanChangeRequest | null> {
    const rows = await this.database
      .prepare(
        `SELECT id, plan_id, plan_code, plan_name, weekly_fee_centavos,
                weekly_credit_centavos, display_order, active,
                proposed_by_user_id, status, decided_by_user_id,
                decision_reason, created_at, decided_at
         FROM plan_change_requests
         WHERE id = ?
         LIMIT 1`,
      )
      .bind(id)
      .all<PlanChangeRow>();
    const row = rows.results[0];
    return row ? mapRequest(row) : null;
  }

  async savePending(request: PlanChangeRequest, audit: AuditEvent): Promise<void> {
    await this.database.batch([
      requestStatement(this.database, request),
      auditStatement(this.database, audit),
    ]);
  }

  async saveDecision(request: PlanChangeRequest, audit: AuditEvent): Promise<void> {
    const statements: CatalogPreparedStatement[] = [
      this.database
        .prepare(
          `UPDATE plan_change_requests
           SET status = ?, decided_by_user_id = ?, decision_reason = ?, decided_at = ?
           WHERE id = ? AND status = 'pending'`,
        )
        .bind(
          request.status,
          request.decidedByUserId,
          request.decisionReason,
          request.decidedAt,
          request.id,
        ),
    ];
    if (request.status === "approved") {
      statements.push(
        this.database
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
            request.plan.id,
            request.plan.code,
            request.plan.name,
            request.plan.weeklyFee.centavos,
            request.plan.weeklyCredit.centavos,
            request.plan.displayOrder,
            request.plan.active ? 1 : 0,
            request.createdAt,
            request.decidedAt,
          ),
      );
      statements.push(
        this.database
          .prepare(
            `UPDATE plan_cache_state
             SET version = version + 1, updated_at = ?
             WHERE id = 'public'`,
          )
          .bind(request.decidedAt),
      );
    }
    statements.push(auditStatement(this.database, audit));
    await this.database.batch(statements);
  }
}

function requestStatement(
  database: PlanApprovalDatabase,
  request: PlanChangeRequest,
): CatalogPreparedStatement {
  return database
    .prepare(
      `INSERT INTO plan_change_requests (
         id, plan_id, plan_code, plan_name, weekly_fee_centavos,
         weekly_credit_centavos, display_order, active, proposed_by_user_id,
         status, decided_by_user_id, decision_reason, created_at, decided_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      request.id,
      request.plan.id,
      request.plan.code,
      request.plan.name,
      request.plan.weeklyFee.centavos,
      request.plan.weeklyCredit.centavos,
      request.plan.displayOrder,
      request.plan.active ? 1 : 0,
      request.proposedByUserId,
      request.status,
      request.decidedByUserId,
      request.decisionReason,
      request.createdAt,
      request.decidedAt,
    );
}

function auditStatement(
  database: PlanApprovalDatabase,
  audit: AuditEvent,
): CatalogPreparedStatement {
  const value = createAuditEvent(audit);
  return database
    .prepare(
      `INSERT INTO audit_events (
         id, actor_user_id, action, target_type, target_id, occurred_at, metadata_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      value.id,
      value.actorUserId,
      value.action,
      value.targetType,
      value.targetId,
      value.occurredAt,
      JSON.stringify(value.metadata),
    );
}

function mapRequest(row: PlanChangeRow): PlanChangeRequest {
  return createPlanChangeRequest({
    id: row.id,
    plan: createPlan({
      id: row.plan_id,
      code: row.plan_code,
      name: row.plan_name,
      weeklyFee: createMoney(row.weekly_fee_centavos),
      weeklyCredit: createMoney(row.weekly_credit_centavos),
      displayOrder: row.display_order,
      active: row.active === 1,
    }),
    proposedByUserId: row.proposed_by_user_id,
    status: row.status,
    decidedByUserId: row.decided_by_user_id,
    decisionReason: row.decision_reason,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
  });
}

type PlanChangeRow = Record<string, unknown> & {
  id: string;
  plan_id: string;
  plan_code: string;
  plan_name: string;
  weekly_fee_centavos: number;
  weekly_credit_centavos: number;
  display_order: number;
  active: number;
  proposed_by_user_id: string;
  status: "pending" | "approved" | "rejected";
  decided_by_user_id: string | null;
  decision_reason: string | null;
  created_at: string;
  decided_at: string | null;
};
