import { describe, expect, it } from "vitest";

import { DomainValidationError } from "./errors.js";
import {
  applySubscriptionCommand,
  createDefaultPlans,
  createPlan,
  createSubscription,
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
});
