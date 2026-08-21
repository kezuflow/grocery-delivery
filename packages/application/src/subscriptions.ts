import {
  applySubscriptionBillingCommand,
  applySubscriptionCommand,
  createSubscription,
  type Subscription,
  type SubscriptionCommand,
  type SubscriptionBillingStatus,
} from "@carbon/domain";

export type SubscriptionRepository = Readonly<{
  findByCustomerId(customerId: string): Promise<Subscription | null>;
  save(subscription: Subscription): Promise<void>;
}>;

export type AtomicSubscriptionRepository = SubscriptionRepository &
  Readonly<{
    saveAndRecord(subscription: Subscription, record: IdempotencyRecord): Promise<void>;
    saveTrialAndRecord?(
      subscription: Subscription,
      record: IdempotencyRecord,
      trial: Readonly<{
        customerId: string;
        subscriptionId: string;
        startedAt: string;
        endsAt: string;
      }>,
    ): Promise<void>;
  }>;

export type IdempotencyRecord = Readonly<{
  key: string;
  fingerprint: string;
  subscription: Subscription;
}>;

export type IdempotencyStore = Readonly<{
  get(key: string): Promise<IdempotencyRecord | null>;
  put(record: IdempotencyRecord): Promise<void>;
}>;

export type SubscriptionCommandService = Readonly<{
  execute(input: {
    customerId: string;
    command: SubscriptionCommand;
    idempotencyKey: string;
  }): Promise<Subscription>;
}>;

export type SubscriptionCreationService = Readonly<{
  execute(input: {
    customerId: string;
    planId: string;
    idempotencyKey: string;
    now: string;
    cycleId?: string;
  }): Promise<Subscription>;
}>;

export type SubscriptionTrialStore = Readonly<{
  hasUsedTrial(customerId: string): Promise<boolean>;
  recordTrial(
    input: Readonly<{
      customerId: string;
      subscriptionId: string;
      startedAt: string;
      endsAt: string;
    }>,
  ): Promise<void>;
}>;

export type SubscriptionTrialService = Readonly<{
  execute(input: {
    customerId: string;
    planId: string;
    idempotencyKey: string;
    now: string;
    cycleId?: string;
  }): Promise<Subscription>;
}>;

export type SubscriptionBillingService = Readonly<{
  execute(input: {
    customerId: string;
    billingStatus: SubscriptionBillingStatus;
    idempotencyKey: string;
    now: string;
  }): Promise<Subscription>;
}>;

export type SubscriptionPlanLookup = Readonly<{
  findActiveById(planId: string): Promise<Readonly<{ id: string }> | null>;
}>;

export class InMemorySubscriptionRepository implements SubscriptionRepository {
  private readonly subscriptions = new Map<string, Subscription>();

  constructor(initial: readonly Subscription[] = []) {
    for (const subscription of initial) {
      this.subscriptions.set(subscription.customerId, createSubscription(subscription));
    }
  }

  findByCustomerId(customerId: string): Promise<Subscription | null> {
    return Promise.resolve(this.subscriptions.get(customerId) ?? null);
  }

  save(subscription: Subscription): Promise<void> {
    this.subscriptions.set(subscription.customerId, createSubscription(subscription));
    return Promise.resolve();
  }
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly records = new Map<string, IdempotencyRecord>();

  get(key: string): Promise<IdempotencyRecord | null> {
    return Promise.resolve(this.records.get(key) ?? null);
  }

  put(record: IdempotencyRecord): Promise<void> {
    this.records.set(record.key, record);
    return Promise.resolve();
  }
}

export class DefaultSubscriptionCommandService implements SubscriptionCommandService {
  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly idempotency: IdempotencyStore,
    private readonly plans?: SubscriptionPlanLookup,
  ) {}

  async execute(input: {
    customerId: string;
    command: SubscriptionCommand;
    idempotencyKey: string;
  }): Promise<Subscription> {
    const key = input.idempotencyKey.trim();
    if (!key || key.length > 128) {
      throw new Error("idempotency key must be between 1 and 128 characters");
    }

    const fingerprint = JSON.stringify({ customerId: input.customerId, command: input.command });
    const existing = await this.idempotency.get(key);
    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        throw new Error("idempotency key was already used for a different command");
      }
      return existing.subscription;
    }

    const current = await this.subscriptions.findByCustomerId(input.customerId);
    if (!current) {
      throw new Error("subscription was not found");
    }
    const command =
      input.command.action === "change-plan"
        ? {
            ...input.command,
            planId: await this.resolvePlanId(input.command.planId),
          }
        : input.command;
    const updated = applySubscriptionCommand(current, command);
    const record = { key, fingerprint, subscription: updated };
    const atomicRepository = this.subscriptions as Partial<AtomicSubscriptionRepository>;
    if (atomicRepository.saveAndRecord) {
      await atomicRepository.saveAndRecord(updated, record);
    } else {
      await this.subscriptions.save(updated);
      await this.idempotency.put(record);
    }
    return updated;
  }

  private async resolvePlanId(planId: string | undefined): Promise<string> {
    if (!planId || !this.plans) {
      throw new Error("selected plan is unavailable");
    }
    const plan = await this.plans.findActiveById(planId);
    if (!plan) {
      throw new Error("selected plan is unavailable");
    }
    return plan.id;
  }
}

export class DefaultSubscriptionCreationService implements SubscriptionCreationService {
  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly idempotency: IdempotencyStore,
    private readonly plans: SubscriptionPlanLookup,
    private readonly generateId: () => string = () => crypto.randomUUID(),
  ) {}

  async execute(input: {
    customerId: string;
    planId: string;
    idempotencyKey: string;
    now: string;
    cycleId?: string;
  }): Promise<Subscription> {
    const key = input.idempotencyKey.trim();
    if (!key || key.length > 128) {
      throw new Error("idempotency key must be between 1 and 128 characters");
    }
    const fingerprint = JSON.stringify({ customerId: input.customerId, planId: input.planId });
    const existing = await this.idempotency.get(key);
    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        throw new Error("idempotency key was already used for a different command");
      }
      return existing.subscription;
    }
    const plan = await this.plans.findActiveById(input.planId);
    if (!plan) {
      throw new Error("selected plan is unavailable");
    }
    if (await this.subscriptions.findByCustomerId(input.customerId)) {
      throw new Error("customer already has a subscription");
    }
    const subscription = createSubscription({
      id: this.generateId(),
      customerId: input.customerId,
      planId: plan.id,
      status: "active",
      billingStatus: "current",
      effectiveCycleId: input.cycleId ?? null,
      skippedCycleId: null,
      lastAction: null,
      createdAt: input.now,
      updatedAt: input.now,
    });
    const record = { key, fingerprint, subscription };
    const atomicRepository = this.subscriptions as Partial<AtomicSubscriptionRepository>;
    if (atomicRepository.saveAndRecord) {
      await atomicRepository.saveAndRecord(subscription, record);
    } else {
      await this.subscriptions.save(subscription);
      await this.idempotency.put(record);
    }
    return subscription;
  }
}

export class DefaultSubscriptionTrialService implements SubscriptionTrialService {
  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly idempotency: IdempotencyStore,
    private readonly plans: SubscriptionPlanLookup,
    private readonly trials: SubscriptionTrialStore,
    private readonly generateId: () => string = () => crypto.randomUUID(),
  ) {}

  async execute(input: {
    customerId: string;
    planId: string;
    idempotencyKey: string;
    now: string;
    cycleId?: string;
  }): Promise<Subscription> {
    const key = input.idempotencyKey.trim();
    if (!key || key.length > 128) {
      throw new Error("idempotency key must be between 1 and 128 characters");
    }
    const fingerprint = JSON.stringify({
      customerId: input.customerId,
      planId: input.planId,
      trial: true,
    });
    const existing = await this.idempotency.get(key);
    if (existing) {
      if (existing.fingerprint !== fingerprint)
        throw new Error("idempotency key was already used for a different command");
      return existing.subscription;
    }
    if (await this.trials.hasUsedTrial(input.customerId))
      throw new Error("customer already used the free trial");
    if (await this.subscriptions.findByCustomerId(input.customerId))
      throw new Error("customer already has a subscription");
    const plan = await this.plans.findActiveById(input.planId);
    if (!plan) throw new Error("selected plan is unavailable");

    const trialEndsAt = addCalendarMonth(input.now);
    const subscription = createSubscription({
      id: this.generateId(),
      customerId: input.customerId,
      planId: plan.id,
      status: "active",
      billingStatus: "current",
      effectiveCycleId: input.cycleId ?? null,
      skippedCycleId: null,
      lastAction: null,
      trialStartedAt: input.now,
      trialEndsAt,
      createdAt: input.now,
      updatedAt: input.now,
    });
    const record = { key, fingerprint, subscription };
    const trial = {
      customerId: input.customerId,
      subscriptionId: subscription.id,
      startedAt: input.now,
      endsAt: trialEndsAt,
    };
    const atomicRepository = this.subscriptions as Partial<AtomicSubscriptionRepository>;
    if (atomicRepository.saveTrialAndRecord) {
      await atomicRepository.saveTrialAndRecord(subscription, record, trial);
    } else {
      await this.subscriptions.save(subscription);
      await this.idempotency.put(record);
      await this.trials.recordTrial(trial);
    }
    return subscription;
  }
}

function addCalendarMonth(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) throw new Error("trial start must be an ISO timestamp");
  const day = date.getUTCDate();
  const targetYear = date.getUTCFullYear() + (date.getUTCMonth() === 11 ? 1 : 0);
  const targetMonth = (date.getUTCMonth() + 1) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  date.setUTCFullYear(targetYear, targetMonth, Math.min(day, lastDay));
  return date.toISOString();
}

export class DefaultSubscriptionBillingService implements SubscriptionBillingService {
  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly idempotency: IdempotencyStore,
  ) {}

  async execute(input: {
    customerId: string;
    billingStatus: SubscriptionBillingStatus;
    idempotencyKey: string;
    now: string;
  }): Promise<Subscription> {
    const key = input.idempotencyKey.trim();
    if (!key || key.length > 128) {
      throw new Error("idempotency key must be between 1 and 128 characters");
    }
    const fingerprint = JSON.stringify({
      customerId: input.customerId,
      billingStatus: input.billingStatus,
    });
    const existing = await this.idempotency.get(key);
    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        throw new Error("idempotency key was already used for a different command");
      }
      return existing.subscription;
    }
    const current = await this.subscriptions.findByCustomerId(input.customerId);
    if (!current) {
      throw new Error("subscription was not found");
    }
    const updated = applySubscriptionBillingCommand(current, {
      billingStatus: input.billingStatus,
      now: input.now,
    });
    const record = { key, fingerprint, subscription: updated };
    const atomicRepository = this.subscriptions as Partial<AtomicSubscriptionRepository>;
    if (atomicRepository.saveAndRecord) {
      await atomicRepository.saveAndRecord(updated, record);
    } else {
      await this.subscriptions.save(updated);
      await this.idempotency.put(record);
    }
    return updated;
  }
}
