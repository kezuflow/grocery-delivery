import {
  applySubscriptionCommand,
  createSubscription,
  type Subscription,
  type SubscriptionCommand,
} from "@carbon/domain";

export type SubscriptionRepository = Readonly<{
  findByCustomerId(customerId: string): Promise<Subscription | null>;
  save(subscription: Subscription): Promise<void>;
}>;

export type AtomicSubscriptionRepository = SubscriptionRepository &
  Readonly<{
    saveAndRecord(subscription: Subscription, record: IdempotencyRecord): Promise<void>;
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
    const updated = applySubscriptionCommand(current, input.command);
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
