import { describe, expect, it } from "vitest";

import { DomainValidationError } from "./errors.js";
import {
  applySubscriptionCommand,
  applySubscriptionBillingCommand,
  createDefaultPlans,
  createPlan,
  createPlanChangeRequest,
  createSubscription,
  decidePlanChangeRequest,
} from "./plans.js";

describe("plans and subscriptions", () => {
  const subscription = createSubscription({
    id: "subscription-1",
    customerId: "customer-1",
    planId: "plan-small",
    status: "active",
    skippedCycleId: null,
    lastAction: null,
    createdAt: "2026-08-18T00:00:00.000Z",
    updatedAt: "2026-08-18T00:00:00.000Z",
  });
  const command = {
    cycleId: "cycle-2026-08-22",
    cutoffAt: "2026-08-21T10:00:00.000Z",
    now: "2026-08-20T10:00:00.000Z",
  } as const;

  it("provides three active plans with PHP fee and credit budgets", () => {
    const plans = createDefaultPlans();
    expect(plans.map((plan) => plan.code)).toEqual(["small", "medium", "large"]);
    expect(plans.map((plan) => plan.weeklyFee.centavos)).toEqual([69_900, 99_900, 139_900]);
    expect(plans.map((plan) => plan.weeklyCredit.centavos)).toEqual([69_900, 99_900, 139_900]);
    expect(
      createDefaultPlans().every((plan) => plan.active && plan.weeklyFee.currency === "PHP"),
    ).toBe(true);
  });

  it("accepts administrator-defined plan codes and prices", () => {
    expect(
      createPlan({
        id: "plan-family",
        code: "family-box",
        name: "Family Box",
        weeklyFee: { centavos: 199_900, currency: "PHP" },
        weeklyCredit: { centavos: 210_000, currency: "PHP" },
        displayOrder: 5,
        active: true,
      }),
    ).toMatchObject({ code: "family-box", weeklyCredit: { centavos: 210_000 } });
  });

  it("requires independent approval for plan changes", () => {
    const pending = createPlanChangeRequest({
      id: "change-1",
      plan: createDefaultPlans()[0]!,
      proposedByUserId: "pricing-1",
      status: "pending",
      decidedByUserId: null,
      decisionReason: null,
      createdAt: "2026-08-18T00:00:00.000Z",
      decidedAt: null,
    });

    expect(() =>
      decidePlanChangeRequest(pending, {
        approved: true,
        decidedByUserId: "pricing-1",
        decidedAt: "2026-08-18T01:00:00.000Z",
      }),
    ).toThrow("proposer cannot decide");
    expect(
      decidePlanChangeRequest(pending, {
        approved: false,
        decidedByUserId: "finance-1",
        reason: "Needs margin review",
        decidedAt: "2026-08-18T01:00:00.000Z",
      }).status,
    ).toBe("rejected");
  });

  it("supports pause, resume, skip, and cancel before cutoff", () => {
    const paused = applySubscriptionCommand(subscription, { ...command, action: "pause" });
    expect(paused.status).toBe("paused");
    const resumed = applySubscriptionCommand(paused, { ...command, action: "resume" });
    expect(resumed.status).toBe("active");
    const skipped = applySubscriptionCommand(resumed, { ...command, action: "skip" });
    expect(skipped.skippedCycleId).toBe(command.cycleId);
    expect(applySubscriptionCommand(resumed, { ...command, action: "cancel" }).status).toBe(
      "canceled",
    );
  });

  it("rejects changes at or after the cutoff and invalid transitions", () => {
    expect(() =>
      applySubscriptionCommand(subscription, {
        ...command,
        action: "pause",
        now: command.cutoffAt,
      }),
    ).toThrow(DomainValidationError);
    expect(() =>
      applySubscriptionCommand(
        { ...subscription, status: "paused" },
        { ...command, action: "pause" },
      ),
    ).toThrow(DomainValidationError);
  });

  it("applies plan and lifecycle changes to the assigned upcoming cycle", () => {
    const changed = applySubscriptionCommand(subscription, {
      ...command,
      action: "change-plan",
      planId: "plan-medium",
    });
    const paused = applySubscriptionCommand(changed, { ...command, action: "pause" });

    expect(changed).toMatchObject({
      planId: "plan-medium",
      effectiveCycleId: command.cycleId,
      lastAction: null,
    });
    expect(paused).toMatchObject({ status: "paused", effectiveCycleId: command.cycleId });
    expect(() =>
      applySubscriptionCommand(changed, {
        ...command,
        action: "change-plan",
        planId: "plan-medium",
      }),
    ).toThrow("already uses");
  });

  it("keeps past-due billing separate from customer lifecycle status", () => {
    const pastDue = applySubscriptionBillingCommand(subscription, {
      billingStatus: "past_due",
      now: command.now,
    });

    expect(pastDue).toMatchObject({ status: "active", billingStatus: "past_due" });
    expect(() => applySubscriptionCommand(pastDue, { ...command, action: "pause" })).toThrow(
      "resolve billing",
    );
    expect(
      applySubscriptionBillingCommand(pastDue, {
        billingStatus: "current",
        now: "2026-08-20T11:00:00.000Z",
      }),
    ).toMatchObject({ status: "active", billingStatus: "current" });
    expect(
      applySubscriptionCommand({ ...pastDue, status: "paused" }, { ...command, action: "cancel" }),
    ).toMatchObject({ status: "canceled", effectiveCycleId: command.cycleId });
  });
});
