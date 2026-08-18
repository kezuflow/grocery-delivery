import { DomainValidationError } from "./errors.js";
import { createMoney, type Money } from "./money.js";

/** Seeded plan codes are defaults only; administrators may define additional slugs. */
export const PLAN_CODES = ["small", "medium", "large"] as const;
export type PlanCode = string;

export type Plan = Readonly<{
  id: string;
  code: PlanCode;
  name: string;
  weeklyFee: Money;
  weeklyCredit: Money;
  displayOrder: number;
  active: boolean;
}>;

export const SUBSCRIPTION_STATUSES = ["active", "paused", "canceled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export type Subscription = Readonly<{
  id: string;
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  skippedCycleId: string | null;
  lastAction: SubscriptionAction | null;
  createdAt: string;
  updatedAt: string;
}>;

export const SUBSCRIPTION_ACTIONS = ["pause", "resume", "skip", "cancel"] as const;
export type SubscriptionAction = (typeof SUBSCRIPTION_ACTIONS)[number];

export type SubscriptionCommand = Readonly<{
  action: SubscriptionAction;
  cycleId: string;
  cutoffAt: string;
  now: string;
}>;

export function createPlan(input: Omit<Plan, "displayOrder"> & { displayOrder?: number }): Plan {
  assertText(input.id, "plan id");
  assertText(input.name, "plan name");
  assertCode(input.code);
  assertMoney(input.weeklyFee, "weekly fee");
  assertMoney(input.weeklyCredit, "weekly credit");
  const displayOrder = input.displayOrder ?? 0;
  if (!Number.isSafeInteger(displayOrder) || displayOrder < 0) {
    throw new DomainValidationError(
      "INVALID_PLAN_DISPLAY_ORDER",
      "plan display order must be a non-negative safe integer",
    );
  }
  if (typeof input.active !== "boolean") {
    throw new DomainValidationError("INVALID_PLAN_ACTIVE", "plan active must be a boolean");
  }

  return Object.freeze({
    ...input,
    displayOrder,
    weeklyFee: Object.freeze({ ...input.weeklyFee }),
    weeklyCredit: Object.freeze({ ...input.weeklyCredit }),
  });
}

export function createSubscription(input: Subscription): Subscription {
  assertText(input.id, "subscription id");
  assertText(input.customerId, "subscription customer id");
  assertText(input.planId, "subscription plan id");
  assertStatus(input.status);
  if (input.skippedCycleId !== null) {
    assertText(input.skippedCycleId, "subscription skipped cycle id");
  }
  assertIsoTimestamp(input.createdAt, "subscription createdAt");
  assertIsoTimestamp(input.updatedAt, "subscription updatedAt");

  return Object.freeze({ ...input });
}

export function applySubscriptionCommand(
  subscription: Subscription,
  command: SubscriptionCommand,
): Subscription {
  assertAction(command.action);
  assertText(command.cycleId, "subscription cycle id");
  assertIsoTimestamp(command.cutoffAt, "subscription cutoffAt");
  assertIsoTimestamp(command.now, "subscription now");
  if (command.now >= command.cutoffAt) {
    throw new DomainValidationError(
      "SUBSCRIPTION_CUTOFF_PASSED",
      "subscription changes are closed after the weekly cutoff",
    );
  }

  if (command.action === "pause") {
    requireStatus(subscription, "active", "SUBSCRIPTION_NOT_ACTIVE");
    return createSubscription({
      ...subscription,
      status: "paused",
      lastAction: "pause",
      updatedAt: command.now,
    });
  }

  if (command.action === "resume") {
    requireStatus(subscription, "paused", "SUBSCRIPTION_NOT_PAUSED");
    return createSubscription({
      ...subscription,
      status: "active",
      lastAction: "resume",
      updatedAt: command.now,
    });
  }

  if (command.action === "skip") {
    requireStatus(subscription, "active", "SUBSCRIPTION_NOT_ACTIVE");
    if (subscription.skippedCycleId === command.cycleId) {
      throw new DomainValidationError("SUBSCRIPTION_ALREADY_SKIPPED", "cycle is already skipped");
    }
    return createSubscription({
      ...subscription,
      skippedCycleId: command.cycleId,
      lastAction: "skip",
      updatedAt: command.now,
    });
  }

  requireStatus(subscription, "active", "SUBSCRIPTION_ALREADY_CANCELED");
  return createSubscription({
    ...subscription,
    status: "canceled",
    lastAction: "cancel",
    updatedAt: command.now,
  });
}

export function createDefaultPlans(): readonly Plan[] {
  return [
    createPlan({
      id: "plan-small",
      code: "small",
      name: "Small",
      weeklyFee: createMoney(69_900),
      weeklyCredit: createMoney(69_900),
      displayOrder: 10,
      active: true,
    }),
    createPlan({
      id: "plan-medium",
      code: "medium",
      name: "Medium",
      weeklyFee: createMoney(99_900),
      weeklyCredit: createMoney(99_900),
      displayOrder: 20,
      active: true,
    }),
    createPlan({
      id: "plan-large",
      code: "large",
      name: "Large",
      weeklyFee: createMoney(139_900),
      weeklyCredit: createMoney(139_900),
      displayOrder: 30,
      active: true,
    }),
  ];
}

function requireStatus(
  subscription: Subscription,
  expected: SubscriptionStatus,
  code: string,
): void {
  if (subscription.status !== expected) {
    throw new DomainValidationError(code, `subscription must be ${expected}`);
  }
}

function assertMoney(value: Money, field: string): void {
  if (value.currency !== "PHP" || !Number.isSafeInteger(value.centavos) || value.centavos < 0) {
    throw new DomainValidationError(
      "INVALID_PLAN_MONEY",
      `${field} must be a non-negative PHP amount`,
    );
  }
}

function assertStatus(value: string): asserts value is SubscriptionStatus {
  if (!SUBSCRIPTION_STATUSES.includes(value as SubscriptionStatus)) {
    throw new DomainValidationError("INVALID_SUBSCRIPTION_STATUS", `unsupported status: ${value}`);
  }
}

function assertAction(value: string): asserts value is SubscriptionAction {
  if (!SUBSCRIPTION_ACTIONS.includes(value as SubscriptionAction)) {
    throw new DomainValidationError("INVALID_SUBSCRIPTION_ACTION", `unsupported action: ${value}`);
  }
}

function assertText(value: string, field: string): void {
  if (!value.trim()) {
    throw new DomainValidationError("INVALID_PLAN_TEXT", `${field} must not be empty`);
  }
}

function assertCode(value: string): asserts value is PlanCode {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new DomainValidationError("INVALID_PLAN_CODE", "plan code must be a lowercase slug");
  }
}

function assertIsoTimestamp(value: string, field: string): void {
  if (Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new DomainValidationError("INVALID_TIMESTAMP", `${field} must be an ISO timestamp`);
  }
}
