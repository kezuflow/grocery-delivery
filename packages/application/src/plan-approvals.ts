import {
  createPlanChangeRequest,
  decidePlanChangeRequest,
  type AuditEvent,
  type Plan,
  type PlanChangeRequest,
} from "@carbon/domain";

export type PlanApprovalRepository = Readonly<{
  findById(id: string): Promise<PlanChangeRequest | null>;
  savePending(request: PlanChangeRequest, audit: AuditEvent): Promise<void>;
  saveDecision(request: PlanChangeRequest, audit: AuditEvent): Promise<void>;
}>;

export type PlanApprovalService = Readonly<{
  propose(input: {
    plan: Plan;
    proposedByUserId: string;
    createdAt: string;
    requestId?: string;
  }): Promise<PlanChangeRequest>;
  decide(input: {
    requestId: string;
    approved: boolean;
    decidedByUserId: string;
    decidedAt: string;
    reason?: string;
  }): Promise<PlanChangeRequest>;
}>;

export class DefaultPlanApprovalService implements PlanApprovalService {
  constructor(
    private readonly repository: PlanApprovalRepository,
    private readonly generateId: () => string = () => crypto.randomUUID(),
  ) {}

  async propose(input: {
    plan: Plan;
    proposedByUserId: string;
    createdAt: string;
    requestId?: string;
  }): Promise<PlanChangeRequest> {
    const request = createPlanChangeRequest({
      id: input.requestId ?? this.generateId(),
      plan: input.plan,
      proposedByUserId: input.proposedByUserId,
      status: "pending",
      decidedByUserId: null,
      decisionReason: null,
      createdAt: input.createdAt,
      decidedAt: null,
    });
    await this.repository.savePending(request, createAudit(request, "plan.change-requested"));
    return request;
  }

  async decide(input: {
    requestId: string;
    approved: boolean;
    decidedByUserId: string;
    decidedAt: string;
    reason?: string;
  }): Promise<PlanChangeRequest> {
    const current = await this.repository.findById(input.requestId);
    if (!current) {
      throw new Error("plan change request was not found");
    }
    const request = decidePlanChangeRequest(current, input);
    await this.repository.saveDecision(request, createAudit(request, "plan.change-decided"));
    return request;
  }
}

export class InMemoryPlanApprovalRepository implements PlanApprovalRepository {
  private readonly requests = new Map<string, PlanChangeRequest>();
  readonly audits: AuditEvent[] = [];

  findById(id: string): Promise<PlanChangeRequest | null> {
    return Promise.resolve(this.requests.get(id) ?? null);
  }

  savePending(request: PlanChangeRequest, audit: AuditEvent): Promise<void> {
    this.requests.set(request.id, request);
    this.audits.push(audit);
    return Promise.resolve();
  }

  saveDecision(request: PlanChangeRequest, audit: AuditEvent): Promise<void> {
    this.requests.set(request.id, request);
    this.audits.push(audit);
    return Promise.resolve();
  }
}

function createAudit(request: PlanChangeRequest, action: string): AuditEvent {
  return {
    id: `audit:${request.id}:${action}`,
    actorUserId:
      action === "plan.change-requested" ? request.proposedByUserId : request.decidedByUserId,
    action,
    targetType: "plan-change-request",
    targetId: request.id,
    occurredAt: request.decidedAt ?? request.createdAt,
    metadata: {
      planId: request.plan.id,
      planCode: request.plan.code,
      status: request.status,
      ...(request.decisionReason ? { reason: request.decisionReason } : {}),
    },
  };
}
