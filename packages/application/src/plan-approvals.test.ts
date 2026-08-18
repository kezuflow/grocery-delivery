import { describe, expect, it } from "vitest";

import { createDefaultPlans } from "@carbon/domain";

import { DefaultPlanApprovalService, InMemoryPlanApprovalRepository } from "./plan-approvals.js";

describe("plan approval application", () => {
  it("records a pending proposal and requires a separate approver", async () => {
    const repository = new InMemoryPlanApprovalRepository();
    const service = new DefaultPlanApprovalService(repository, () => "change-1");
    const proposal = await service.propose({
      plan: createDefaultPlans()[0]!,
      proposedByUserId: "pricing-1",
      createdAt: "2026-08-18T00:00:00.000Z",
    });

    expect(proposal.status).toBe("pending");
    await expect(
      service.decide({
        requestId: proposal.id,
        approved: true,
        decidedByUserId: "finance-1",
        decidedAt: "2026-08-18T01:00:00.000Z",
      }),
    ).resolves.toMatchObject({ status: "approved", decidedByUserId: "finance-1" });
    expect(repository.audits).toHaveLength(2);
  });
});
