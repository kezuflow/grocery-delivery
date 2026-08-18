import { createSubscription, type Subscription, type SubscriptionStatus } from "@carbon/domain";

import type { CatalogDatabase } from "./catalog.js";

export type SubscriptionDatabase = CatalogDatabase;

export interface SubscriptionReader {
  findByCustomerId(customerId: string): Promise<Subscription | null>;
}

export interface SubscriptionRepository extends SubscriptionReader {
  save(subscription: Subscription): Promise<void>;
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

export class D1SubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly database: SubscriptionDatabase) {}

  async findByCustomerId(customerId: string): Promise<Subscription | null> {
    const rows = await this.database
      .prepare(
        `SELECT id, customer_id, plan_id, status, skipped_cycle_id, last_action,
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
}

function subscriptionStatement(database: SubscriptionDatabase, subscription: Subscription) {
  return database
    .prepare(
      `INSERT INTO subscriptions (
           id, customer_id, plan_id, status, skipped_cycle_id, last_action, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(customer_id) DO UPDATE SET
           plan_id = excluded.plan_id,
           status = excluded.status,
           skipped_cycle_id = excluded.skipped_cycle_id,
           last_action = excluded.last_action,
           updated_at = excluded.updated_at`,
    )
    .bind(
      subscription.id,
      subscription.customerId,
      subscription.planId,
      subscription.status,
      subscription.skippedCycleId,
      subscription.lastAction,
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
  skipped_cycle_id: string | null;
  last_action: Subscription["lastAction"];
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
    skippedCycleId: row.skipped_cycle_id,
    lastAction: row.last_action,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
