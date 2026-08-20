import {
  calculateCartTotals,
  createLockedOrder,
  type Cart,
  type AppliedPromotionSnapshot,
  type LockedOrder,
  type Money,
  type Plan,
} from "@carbon/domain";

export type OrderRepository = Readonly<{
  findById(id: string): Promise<LockedOrder | null>;
  findByIdempotencyKey(customerId: string, idempotencyKey: string): Promise<LockedOrder | null>;
  save(order: LockedOrder): Promise<void>;
}>;

export type AtomicOrderRepository = OrderRepository &
  Readonly<{
    saveAndPublish(order: LockedOrder, event: OutboxEvent): Promise<void>;
  }>;

export type OutboxEvent = Readonly<{
  id: string;
  type: "order.locked";
  aggregateId: string;
  occurredAt: string;
  payload: LockedOrder;
}>;

export type OutboxPublisher = Readonly<{
  publish(event: OutboxEvent): Promise<void>;
}>;

export type CartLockService = Readonly<{
  lock(input: {
    customerId: string;
    subscriptionId: string;
    cycleId: string;
    idempotencyKey: string;
    cart: Cart;
    plan: Pick<Plan, "id" | "weeklyFee" | "weeklyCredit">;
    deliveryFee: Money;
    promotion?: AppliedPromotionSnapshot;
    lockedAt: string;
  }): Promise<LockedOrder>;
}>;

export class InMemoryOrderRepository implements OrderRepository {
  private readonly orders = new Map<string, LockedOrder>();

  findByIdempotencyKey(customerId: string, idempotencyKey: string): Promise<LockedOrder | null> {
    return Promise.resolve(this.orders.get(`${customerId}:${idempotencyKey}`) ?? null);
  }

  findById(id: string): Promise<LockedOrder | null> {
    return Promise.resolve([...this.orders.values()].find((order) => order.id === id) ?? null);
  }

  save(order: LockedOrder): Promise<void> {
    this.orders.set(`${order.customerId}:${order.idempotencyKey}`, order);
    return Promise.resolve();
  }
}

export class InMemoryOutboxPublisher implements OutboxPublisher {
  readonly events: OutboxEvent[] = [];

  publish(event: OutboxEvent): Promise<void> {
    if (!this.events.some((existing) => existing.id === event.id)) {
      this.events.push(event);
    }
    return Promise.resolve();
  }
}

export class DefaultCartLockService implements CartLockService {
  private readonly inFlight = new Map<string, Promise<LockedOrder>>();

  constructor(
    private readonly orders: OrderRepository,
    private readonly outbox: OutboxPublisher,
    private readonly generateOrderId: () => string = () => crypto.randomUUID(),
  ) {}

  async lock(input: {
    customerId: string;
    subscriptionId: string;
    cycleId: string;
    idempotencyKey: string;
    cart: Cart;
    plan: Pick<Plan, "id" | "weeklyFee" | "weeklyCredit">;
    deliveryFee: Money;
    promotion?: AppliedPromotionSnapshot;
    lockedAt: string;
  }): Promise<LockedOrder> {
    const key = input.idempotencyKey.trim();
    if (!key || key.length > 128) {
      throw new Error("idempotency key must be between 1 and 128 characters");
    }
    const operationKey = `${input.customerId}:${key}`;
    const pending = this.inFlight.get(operationKey);
    if (pending) {
      return pending;
    }

    const operation = this.lockOnce(input, key);
    this.inFlight.set(operationKey, operation);
    try {
      return await operation;
    } finally {
      this.inFlight.delete(operationKey);
    }
  }

  private async lockOnce(
    input: {
      customerId: string;
      subscriptionId: string;
      cycleId: string;
      idempotencyKey: string;
      cart: Cart;
      plan: Pick<Plan, "id" | "weeklyFee" | "weeklyCredit">;
      deliveryFee: Money;
      promotion?: AppliedPromotionSnapshot;
      lockedAt: string;
    },
    key: string,
  ): Promise<LockedOrder> {
    const fingerprint = JSON.stringify({
      customerId: input.customerId,
      subscriptionId: input.subscriptionId,
      cycleId: input.cycleId,
      cart: input.cart,
      plan: {
        id: input.plan.id,
        weeklyFee: input.plan.weeklyFee,
        weeklyCredit: input.plan.weeklyCredit,
      },
      deliveryFee: input.deliveryFee,
      promotion: input.promotion,
    });
    const existing = await this.orders.findByIdempotencyKey(input.customerId, key);
    if (existing) {
      if (existing.requestFingerprint !== fingerprint) {
        throw new Error("idempotency key was already used for a different order");
      }
      await this.outbox.publish({
        id: `order-locked:${existing.id}`,
        type: "order.locked",
        aggregateId: existing.id,
        occurredAt: existing.lockedAt,
        payload: existing,
      });
      return existing;
    }

    const totals = calculateCartTotals({
      cart: input.cart,
      plan: input.plan,
      deliveryFee: input.deliveryFee,
      ...(input.promotion ? { discount: input.promotion.discount } : {}),
    });
    const order = createLockedOrder({
      id: this.generateOrderId(),
      customerId: input.customerId,
      subscriptionId: input.subscriptionId,
      planId: input.plan.id,
      cycleId: input.cycleId,
      idempotencyKey: key,
      requestFingerprint: fingerprint,
      cart: input.cart,
      weeklyCredit: input.plan.weeklyCredit,
      totals,
      appliedPromotion: input.promotion ?? null,
      status: "locked",
      lockedAt: input.lockedAt,
    });
    const event = {
      id: `order-locked:${order.id}`,
      type: "order.locked",
      aggregateId: order.id,
      occurredAt: input.lockedAt,
      payload: order,
    } as const;
    const atomicRepository = this.orders as Partial<AtomicOrderRepository>;
    try {
      if (atomicRepository.saveAndPublish) {
        await atomicRepository.saveAndPublish(order, event);
      } else {
        await this.orders.save(order);
        await this.outbox.publish(event);
      }
    } catch (error) {
      // A concurrent request may have won the unique idempotency constraint.
      const raced = await this.orders.findByIdempotencyKey(input.customerId, key);
      if (raced?.requestFingerprint === fingerprint) {
        await this.outbox.publish({
          id: `order-locked:${raced.id}`,
          type: "order.locked",
          aggregateId: raced.id,
          occurredAt: raced.lockedAt,
          payload: raced,
        });
        return raced;
      }
      throw error;
    }
    return order;
  }
}
