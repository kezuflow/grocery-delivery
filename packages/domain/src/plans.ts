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

export const PLAN_CHANGE_STATUSES = ["pending", "approved", "rejected"] as const;
export type PlanChangeStatus = (typeof PLAN_CHANGE_STATUSES)[number];

export type PlanChangeRequest = Readonly<{
  id: string;
  plan: Plan;
  proposedByUserId: string;
  status: PlanChangeStatus;
  decidedByUserId: string | null;
  decisionReason: string | null;
  createdAt: string;
  decidedAt: string | null;
}>;

export const SUBSCRIPTION_STATUSES = ["active", "paused", "canceled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export type Subscription = Readonly<{
  id: string;
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  billingStatus: SubscriptionBillingStatus;
  effectiveCycleId: string | null;
  skippedCycleId: string | null;
  lastAction: SubscriptionAction | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export const SUBSCRIPTION_BILLING_STATUSES = ["current", "past_due"] as const;
export type SubscriptionBillingStatus = (typeof SUBSCRIPTION_BILLING_STATUSES)[number];

export const SUBSCRIPTION_ACTIONS = ["pause", "resume", "skip", "cancel"] as const;
export type SubscriptionAction = (typeof SUBSCRIPTION_ACTIONS)[number];
export type SubscriptionCommandAction = SubscriptionAction | "change-plan";

export type SubscriptionCommand = Readonly<{
  action: SubscriptionCommandAction;
  planId?: string;
  cycleId: string;
  cutoffAt: string;
  now: string;
}>;

export type SubscriptionBillingCommand = Readonly<{
  billingStatus: SubscriptionBillingStatus;
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

export function createPlanChangeRequest(input: PlanChangeRequest): PlanChangeRequest {
  assertText(input.id, "plan change request id");
  const plan = createPlan(input.plan);
  assertText(input.proposedByUserId, "plan change proposer");
  assertPlanChangeStatus(input.status);
  if (input.decidedByUserId !== null) {
    assertText(input.decidedByUserId, "plan change decision maker");
  }
  if (input.decisionReason !== null) {
    assertText(input.decisionReason, "plan change decision reason");
  }
  assertIsoTimestamp(input.createdAt, "plan change createdAt");
  if (input.decidedAt !== null) {
    assertIsoTimestamp(input.decidedAt, "plan change decidedAt");
  }
  if (input.status === "pending" && (input.decidedByUserId !== null || input.decidedAt !== null)) {
    throw new DomainValidationError(
      "INVALID_PLAN_CHANGE_STATE",
      "pending plan changes cannot have a decision",
    );
  }
  if (input.status !== "pending" && (input.decidedByUserId === null || input.decidedAt === null)) {
    throw new DomainValidationError(
      "INVALID_PLAN_CHANGE_STATE",
      "decided plan changes require a decision maker and timestamp",
    );
  }
  return Object.freeze({
    ...input,
    plan,
    decisionReason: input.decisionReason?.trim() || null,
  });
}

export function decidePlanChangeRequest(
  request: PlanChangeRequest,
  decision: Readonly<{
    approved: boolean;
    decidedByUserId: string;
    reason?: string;
    decidedAt: string;
  }>,
): PlanChangeRequest {
  if (request.status !== "pending") {
    throw new DomainValidationError(
      "PLAN_CHANGE_ALREADY_DECIDED",
      "plan change request has already been decided",
    );
  }
  assertText(decision.decidedByUserId, "plan change decision maker");
  if (decision.decidedByUserId === request.proposedByUserId) {
    throw new DomainValidationError(
      "PLAN_CHANGE_SELF_APPROVAL",
      "the proposer cannot decide their own plan change",
    );
  }
  assertIsoTimestamp(decision.decidedAt, "plan change decidedAt");
  const reason = decision.reason?.trim() || null;
  if (!decision.approved && !reason) {
    throw new DomainValidationError(
      "PLAN_CHANGE_REASON_REQUIRED",
      "rejected plan changes require a reason",
    );
  }
  return createPlanChangeRequest({
    ...request,
    status: decision.approved ? "approved" : "rejected",
    decidedByUserId: decision.decidedByUserId,
    decisionReason: reason,
    decidedAt: decision.decidedAt,
  });
}

export function createSubscription(
  input: Omit<
    Subscription,
    "billingStatus" | "effectiveCycleId" | "trialStartedAt" | "trialEndsAt"
  > &
    Partial<
      Pick<Subscription, "billingStatus" | "effectiveCycleId" | "trialStartedAt" | "trialEndsAt">
    >,
): Subscription {
  assertText(input.id, "subscription id");
  assertText(input.customerId, "subscription customer id");
  assertText(input.planId, "subscription plan id");
  assertStatus(input.status);
  const billingStatus = input.billingStatus ?? "current";
  assertBillingStatus(billingStatus);
  const effectiveCycleId = input.effectiveCycleId ?? null;
  if (effectiveCycleId !== null) {
    assertText(effectiveCycleId, "subscription effective cycle id");
  }
  if (input.skippedCycleId !== null) {
    assertText(input.skippedCycleId, "subscription skipped cycle id");
  }
  const trialStartedAt = input.trialStartedAt ?? null;
  const trialEndsAt = input.trialEndsAt ?? null;
  if ((trialStartedAt === null) !== (trialEndsAt === null)) {
    throw new DomainValidationError(
      "INVALID_SUBSCRIPTION_TRIAL",
      "trial dates must be provided together",
    );
  }
  if (trialStartedAt !== null) {
    assertIsoTimestamp(trialStartedAt, "subscription trialStartedAt");
    assertIsoTimestamp(trialEndsAt as string, "subscription trialEndsAt");
    if ((trialEndsAt as string) <= trialStartedAt) {
      throw new DomainValidationError(
        "INVALID_SUBSCRIPTION_TRIAL",
        "trial end must be after trial start",
      );
    }
  }
  assertIsoTimestamp(input.createdAt, "subscription createdAt");
  assertIsoTimestamp(input.updatedAt, "subscription updatedAt");

  return Object.freeze({ ...input, billingStatus, effectiveCycleId, trialStartedAt, trialEndsAt });
}

export function isSubscriptionTrialActive(subscription: Subscription, now: string): boolean {
  assertIsoTimestamp(now, "subscription trial check time");
  return subscription.trialEndsAt !== null && now < subscription.trialEndsAt;
}

export function applySubscriptionCommand(
  subscription: Subscription,
  command: SubscriptionCommand,
): Subscription {
  assertCommandAction(command.action);
  assertText(command.cycleId, "subscription cycle id");
  assertIsoTimestamp(command.cutoffAt, "subscription cutoffAt");
  assertIsoTimestamp(command.now, "subscription now");
  if (command.now >= command.cutoffAt) {
    throw new DomainValidationError(
      "SUBSCRIPTION_CUTOFF_PASSED",
      "subscription changes are closed after the weekly cutoff",
    );
  }

  if (command.action === "change-plan") {
    requireMutableSubscription(subscription);
    if (!command.planId?.trim()) {
      throw new DomainValidationError(
        "INVALID_SUBSCRIPTION_PLAN",
        "subscription plan id must not be empty",
      );
    }
    if (subscription.planId === command.planId) {
      throw new DomainValidationError(
        "SUBSCRIPTION_PLAN_UNCHANGED",
        "subscription already uses the selected plan",
      );
    }
    return createSubscription({
      ...subscription,
      planId: command.planId,
      effectiveCycleId: command.cycleId,
      updatedAt: command.now,
    });
  }

  if (command.action !== "cancel") {
    requireCurrentBilling(subscription);
  }

  if (command.action === "pause") {
    requireStatus(subscription, "active", "SUBSCRIPTION_NOT_ACTIVE");
    return createSubscription({
      ...subscription,
      status: "paused",
      effectiveCycleId: command.cycleId,
      lastAction: "pause",
      updatedAt: command.now,
    });
  }

  if (command.action === "resume") {
    requireStatus(subscription, "paused", "SUBSCRIPTION_NOT_PAUSED");
    return createSubscription({
      ...subscription,
      status: "active",
      effectiveCycleId: command.cycleId,
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
      effectiveCycleId: command.cycleId,
      lastAction: "skip",
      updatedAt: command.now,
    });
  }

  if (subscription.status === "canceled") {
    throw new DomainValidationError(
      "SUBSCRIPTION_ALREADY_CANCELED",
      "subscription is already canceled",
    );
  }
  return createSubscription({
    ...subscription,
    status: "canceled",
    effectiveCycleId: command.cycleId,
    lastAction: "cancel",
    updatedAt: command.now,
  });
}

export function applySubscriptionBillingCommand(
  subscription: Subscription,
  command: SubscriptionBillingCommand,
): Subscription {
  assertBillingStatus(command.billingStatus);
  assertIsoTimestamp(command.now, "subscription billing command time");
  if (subscription.status === "canceled") {
    throw new DomainValidationError(
      "SUBSCRIPTION_CANCELED",
      "canceled subscriptions cannot change billing status",
    );
  }
  if (subscription.billingStatus === command.billingStatus) {
    return subscription;
  }
  return createSubscription({
    ...subscription,
    billingStatus: command.billingStatus,
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

function requireMutableSubscription(subscription: Subscription): void {
  if (subscription.status === "canceled") {
    throw new DomainValidationError(
      "SUBSCRIPTION_CANCELED",
      "canceled subscriptions cannot change plans",
    );
  }
  requireCurrentBilling(subscription);
}

function requireCurrentBilling(subscription: Subscription): void {
  if (subscription.billingStatus !== "current") {
    throw new DomainValidationError(
      "SUBSCRIPTION_PAST_DUE",
      "past-due subscriptions must resolve billing before this change",
    );
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

function assertCommandAction(value: string): asserts value is SubscriptionCommand["action"] {
  if (value !== "change-plan") assertAction(value);
}

function assertBillingStatus(value: string): asserts value is SubscriptionBillingStatus {
  if (!SUBSCRIPTION_BILLING_STATUSES.includes(value as SubscriptionBillingStatus)) {
    throw new DomainValidationError(
      "INVALID_SUBSCRIPTION_BILLING_STATUS",
      `unsupported billing status: ${value}`,
    );
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

function assertPlanChangeStatus(value: string): asserts value is PlanChangeStatus {
  if (!PLAN_CHANGE_STATUSES.includes(value as PlanChangeStatus)) {
    throw new DomainValidationError("INVALID_PLAN_CHANGE_STATUS", `unsupported status: ${value}`);
  }
}

function assertIsoTimestamp(value: string, field: string): void {
  if (Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new DomainValidationError("INVALID_TIMESTAMP", `${field} must be an ISO timestamp`);
  }
}
