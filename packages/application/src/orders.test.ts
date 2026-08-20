import { describe, expect, it } from "vitest";

import { createCart, createCartLine, createDefaultPlans, createMoney } from "@carbon/domain";
import {
  DefaultCartLockService,
  InMemoryOrderRepository,
  InMemoryOutboxPublisher,
} from "./orders.js";

describe("cart locking", () => {
  const input = {
    customerId: "customer-1",
    subscriptionId: "subscription-1",
    cycleId: "cycle-2026-08-22",
    idempotencyKey: "checkout-1",
    cart: createCart([
      createCartLine({ skuId: "sku-a", quantity: 2, unitPrice: createMoney(50_000) }),
    ]),
    plan: createDefaultPlans()[0]!,
    deliveryFee: createMoney(5_000),
    lockedAt: "2026-08-18T00:00:00.000Z",
  };

  it("locks an immutable order and publishes one outbox event", async () => {
    const outbox = new InMemoryOutboxPublisher();
    const service = new DefaultCartLockService(
      new InMemoryOrderRepository(),
      outbox,
      () => "order-1",
    );

    const order = await service.lock(input);

    expect(order.cycleId).toBe("cycle-2026-08-22");
    expect(order.totals).toMatchObject({
      subtotal: { centavos: 100_000 },
      overage: { centavos: 30_100 },
      deliveryFee: { centavos: 5_000 },
      totalDue: { centavos: 105_000 },
    });
    expect(Object.isFrozen(order.cart.lines[0]?.unitPrice)).toBe(true);
    expect(outbox.events).toHaveLength(1);
    expect(outbox.events[0]).toMatchObject({ type: "order.locked", aggregateId: "order-1" });
  });

  it("locks the validated promotion snapshot and discounted totals", async () => {
    const service = new DefaultCartLockService(
      new InMemoryOrderRepository(),
      new InMemoryOutboxPublisher(),
      () => "order-promoted",
    );

    const order = await service.lock({
      ...input,
      promotion: {
        id: "promotion-1",
        code: "WELCOME10",
        version: 2,
        discount: createMoney(5_000),
        deliveryFee: createMoney(5_000),
      },
    });

    expect(order.appliedPromotion).toMatchObject({ id: "promotion-1", version: 2 });
    expect(order.totals.discount?.centavos).toBe(5_000);
    expect(order.totals.totalDue.centavos).toBe(100_000);
  });

  it("replays the same order without publishing another event", async () => {
    const outbox = new InMemoryOutboxPublisher();
    let sequence = 0;
    const service = new DefaultCartLockService(
      new InMemoryOrderRepository(),
      outbox,
      () => `order-${++sequence}`,
    );

    const first = await service.lock(input);
    const replay = await service.lock(input);

    expect(replay.id).toBe(first.id);
    expect(sequence).toBe(1);
    expect(outbox.events).toHaveLength(1);
  });

  it("replays when non-commerce plan metadata is omitted", async () => {
    const outbox = new InMemoryOutboxPublisher();
    const service = new DefaultCartLockService(
      new InMemoryOrderRepository(),
      outbox,
      () => "order-1",
    );

    const first = await service.lock(input);
    const replay = await service.lock({
      ...input,
      plan: {
        id: input.plan.id,
        weeklyFee: input.plan.weeklyFee,
        weeklyCredit: input.plan.weeklyCredit,
      },
    });

    expect(replay.id).toBe(first.id);
    expect(outbox.events).toHaveLength(1);
  });

  it("rejects reuse of a lock key for different cart contents", async () => {
    const service = new DefaultCartLockService(
      new InMemoryOrderRepository(),
      new InMemoryOutboxPublisher(),
      () => "order-1",
    );
    await service.lock(input);

    await expect(
      service.lock({
        ...input,
        cart: createCart([
          createCartLine({ skuId: "sku-a", quantity: 3, unitPrice: createMoney(50_000) }),
        ]),
      }),
    ).rejects.toThrow("different order");
  });
});
