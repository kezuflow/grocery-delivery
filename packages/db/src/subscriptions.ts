import { createSubscription, type Subscription, type SubscriptionStatus } from "@carbon/domain";

import type { CatalogDatabase } from "./catalog.js";

export type SubscriptionDatabase = CatalogDatabase;

export interface SubscriptionReader {
  findByCustomerId(customerId: string): Promise<Subscription | null>;
}

export interface SubscriptionRepository extends SubscriptionReader {
  save(subscription: Subscription): Promise<void>;
}

export interface SubscriptionTrialRepository {
  hasUsedTrial(customerId: string): Promise<boolean>;
  recordTrial(
    input: Readonly<{
      customerId: string;
      subscriptionId: string;
      startedAt: string;
      endsAt: string;
    }>,
  ): Promise<void>;
}

export type SubscriptionIdempotencyRecord = Readonly<{
  key: string;
  fingerprint: string;
  subscription: Subscription;
}>;

export interface SubscriptionIdempotencyStore {
  get(key: string): Promise<SubscriptionIdempotencyRecord | null>;
  put(record: SubscriptionIdempotencyRecord): Promise<void>;
}

export class InMemorySubscriptionReader implements SubscriptionRepository {
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

export class InMemorySubscriptionTrialRepository implements SubscriptionTrialRepository {
  private readonly trials = new Set<string>();

  hasUsedTrial(customerId: string): Promise<boolean> {
    return Promise.resolve(this.trials.has(customerId));
  }

  recordTrial(
    input: Readonly<{
      customerId: string;
      subscriptionId: string;
      startedAt: string;
      endsAt: string;
    }>,
  ): Promise<void> {
    this.trials.add(input.customerId);
    return Promise.resolve();
  }
}

export class D1SubscriptionTrialRepository implements SubscriptionTrialRepository {
  constructor(private readonly database: SubscriptionDatabase) {}

  async hasUsedTrial(customerId: string): Promise<boolean> {
    const result = await this.database
      .prepare("SELECT 1 FROM customer_trials WHERE customer_id = ? LIMIT 1")
      .bind(customerId)
      .all();
    return result.results.length > 0;
  }

  async recordTrial(
    input: Readonly<{
      customerId: string;
      subscriptionId: string;
      startedAt: string;
      endsAt: string;
    }>,
  ): Promise<void> {
    await this.database.batch([
      this.database
        .prepare(
          "INSERT INTO customer_trials (customer_id, subscription_id, started_at, ends_at, created_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(
          input.customerId,
          input.subscriptionId,
          input.startedAt,
          input.endsAt,
          input.startedAt,
        ),
    ]);
  }
}

export class D1SubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly database: SubscriptionDatabase) {}

  async findByCustomerId(customerId: string): Promise<Subscription | null> {
    const rows = await this.database
      .prepare(
        `SELECT id, customer_id, plan_id, status, billing_status, effective_cycle_id,
                skipped_cycle_id, last_action, trial_started_at, trial_ends_at,
                created_at, updated_at
         FROM subscriptions
         WHERE customer_id = ?
         LIMIT 1`,
      )
      .bind(customerId)
      .all<SubscriptionRow>();
    const row = rows.results[0];
    return row ? mapSubscription(row) : null;
  }

  async save(subscription: Subscription): Promise<void> {
    await this.database.batch([subscriptionStatement(this.database, subscription)]);
  }

  async saveAndRecord(
    subscription: Subscription,
    record: SubscriptionIdempotencyRecord,
  ): Promise<void> {
    await this.database.batch([
      subscriptionStatement(this.database, subscription),
      this.database
        .prepare(
          `INSERT INTO subscription_idempotency (
             idempotency_key, customer_id, fingerprint, subscription_id, result_json, created_at
           ) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          record.key,
          record.subscription.customerId,
          record.fingerprint,
          record.subscription.id,
          JSON.stringify(record.subscription),
          record.subscription.updatedAt,
        ),
    ]);
  }

  async saveTrialAndRecord(
    subscription: Subscription,
    record: SubscriptionIdempotencyRecord,
    trial: Readonly<{
      customerId: string;
      subscriptionId: string;
      startedAt: string;
      endsAt: string;
    }>,
  ): Promise<void> {
    await this.database.batch([
      subscriptionStatement(this.database, subscription),
      subscriptionIdempotencyStatement(this.database, record),
      this.database
        .prepare(
          "INSERT INTO customer_trials (customer_id, subscription_id, started_at, ends_at, created_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(
          trial.customerId,
          trial.subscriptionId,
          trial.startedAt,
          trial.endsAt,
          trial.startedAt,
        ),
    ]);
  }
}

function subscriptionIdempotencyStatement(
  database: SubscriptionDatabase,
  record: SubscriptionIdempotencyRecord,
) {
  return database
    .prepare(
      `INSERT INTO subscription_idempotency (
         idempotency_key, customer_id, fingerprint, subscription_id, result_json, created_at
       ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      record.key,
      record.subscription.customerId,
      record.fingerprint,
      record.subscription.id,
      JSON.stringify(record.subscription),
      record.subscription.updatedAt,
    );
}

function subscriptionStatement(database: SubscriptionDatabase, subscription: Subscription) {
  return database
    .prepare(
      `INSERT INTO subscriptions (
           id, customer_id, plan_id, status, billing_status, effective_cycle_id,
           skipped_cycle_id, last_action, trial_started_at, trial_ends_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(customer_id) DO UPDATE SET
           plan_id = excluded.plan_id,
           status = excluded.status,
           billing_status = excluded.billing_status,
           effective_cycle_id = excluded.effective_cycle_id,
           skipped_cycle_id = excluded.skipped_cycle_id,
           last_action = excluded.last_action,
           trial_started_at = excluded.trial_started_at,
           trial_ends_at = excluded.trial_ends_at,
           updated_at = excluded.updated_at`,
    )
    .bind(
      subscription.id,
      subscription.customerId,
      subscription.planId,
      subscription.status,
      subscription.billingStatus,
      subscription.effectiveCycleId,
      subscription.skippedCycleId,
      subscription.lastAction,
      subscription.trialStartedAt,
      subscription.trialEndsAt,
      subscription.createdAt,
      subscription.updatedAt,
    );
}

export class D1SubscriptionIdempotencyStore implements SubscriptionIdempotencyStore {
  constructor(private readonly database: SubscriptionDatabase) {}

  async get(key: string): Promise<SubscriptionIdempotencyRecord | null> {
    const rows = await this.database
      .prepare(
        `SELECT idempotency_key, fingerprint, result_json
         FROM subscription_idempotency
         WHERE idempotency_key = ?
         LIMIT 1`,
      )
      .bind(key)
      .all<SubscriptionIdempotencyRow>();
    const row = rows.results[0];
    if (!row) {
      return null;
    }
    return {
      key: row.idempotency_key,
      fingerprint: row.fingerprint,
      subscription: createSubscription(JSON.parse(row.result_json) as Subscription),
    };
  }

  async put(record: SubscriptionIdempotencyRecord): Promise<void> {
    const statement = this.database
      .prepare(
        `INSERT INTO subscription_idempotency (
           idempotency_key, customer_id, fingerprint, subscription_id, result_json, created_at
         ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        record.key,
        record.subscription.customerId,
        record.fingerprint,
        record.subscription.id,
        JSON.stringify(record.subscription),
        record.subscription.updatedAt,
      );
    await this.database.batch([statement]);
  }
}

type SubscriptionRow = Record<string, unknown> & {
  id: string;
  customer_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  billing_status: Subscription["billingStatus"];
  effective_cycle_id: string | null;
  skipped_cycle_id: string | null;
  last_action: Subscription["lastAction"];
  trial_started_at: string | null;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
};

type SubscriptionIdempotencyRow = Record<string, unknown> & {
  idempotency_key: string;
  fingerprint: string;
  result_json: string;
};

function mapSubscription(row: SubscriptionRow): Subscription {
  return createSubscription({
    id: row.id,
    customerId: row.customer_id,
    planId: row.plan_id,
    status: row.status,
    billingStatus: row.billing_status,
    effectiveCycleId: row.effective_cycle_id,
    skippedCycleId: row.skipped_cycle_id,
    lastAction: row.last_action,
    trialStartedAt: row.trial_started_at,
    trialEndsAt: row.trial_ends_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
