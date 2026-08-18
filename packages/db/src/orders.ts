import {
  createCart,
  createCartLine,
  createLockedOrder,
  createMoney,
  type LockedOrder,
} from "@carbon/domain";

import type { CatalogDatabase, CatalogPreparedStatement } from "./catalog.js";

export type OrderDatabase = CatalogDatabase;

export type OrderOutboxEvent = Readonly<{
  id: string;
  type: "order.locked";
  aggregateId: string;
  occurredAt: string;
  payload: LockedOrder;
}>;

export interface OrderRepository {
  findByIdempotencyKey(customerId: string, idempotencyKey: string): Promise<LockedOrder | null>;
  save(order: LockedOrder): Promise<void>;
  saveAndPublish(order: LockedOrder, event: OrderOutboxEvent): Promise<void>;
}

export interface OutboxPublisher {
  publish(event: OrderOutboxEvent): Promise<void>;
}

export class D1OrderRepository implements OrderRepository {
  constructor(private readonly database: OrderDatabase) {}

  async findByIdempotencyKey(
    customerId: string,
    idempotencyKey: string,
  ): Promise<LockedOrder | null> {
    const orders = await this.database
      .prepare(
        `SELECT id, customer_id, subscription_id, plan_id, idempotency_key,
                request_fingerprint, weekly_credit_centavos, subtotal_centavos,
                weekly_fee_centavos, included_credit_centavos, overage_centavos,
                delivery_fee_centavos, total_due_centavos, locked_at
         FROM orders
         WHERE customer_id = ? AND idempotency_key = ? AND status = 'locked'
         LIMIT 1`,
      )
      .bind(customerId, idempotencyKey)
      .all<OrderRow>();
    const order = orders.results[0];
    if (!order) {
      return null;
    }
    const lines = await this.database
      .prepare(
        `SELECT sku_id, quantity, unit_price_centavos
         FROM order_lines
         WHERE order_id = ?
         ORDER BY line_number ASC`,
      )
      .bind(order.id)
      .all<OrderLineRow>();

    return mapOrder(order, lines.results);
  }

  async save(order: LockedOrder): Promise<void> {
    await this.database.batch(orderStatements(this.database, order));
  }

  async saveAndPublish(order: LockedOrder, event: OrderOutboxEvent): Promise<void> {
    await this.database.batch([
      ...orderStatements(this.database, order),
      outboxStatement(this.database, event),
    ]);
  }
}

export class D1OutboxPublisher implements OutboxPublisher {
  constructor(private readonly database: OrderDatabase) {}

  async publish(event: OrderOutboxEvent): Promise<void> {
    await this.database.batch([outboxStatement(this.database, event)]);
  }
}

function orderStatements(
  database: OrderDatabase,
  order: LockedOrder,
): readonly CatalogPreparedStatement[] {
  const orderStatement = database
    .prepare(
      `INSERT INTO orders (
         id, customer_id, subscription_id, plan_id, idempotency_key, request_fingerprint,
         weekly_credit_centavos, subtotal_centavos, weekly_fee_centavos,
         included_credit_centavos, overage_centavos, delivery_fee_centavos,
         total_due_centavos, status, locked_at, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'locked', ?, ?)`,
    )
    .bind(
      order.id,
      order.customerId,
      order.subscriptionId,
      order.planId,
      order.idempotencyKey,
      order.requestFingerprint,
      order.weeklyCredit.centavos,
      order.totals.subtotal.centavos,
      order.totals.weeklyFee.centavos,
      order.totals.includedCredit.centavos,
      order.totals.overage.centavos,
      order.totals.deliveryFee.centavos,
      order.totals.totalDue.centavos,
      order.lockedAt,
      order.lockedAt,
    );
  const lineStatements = order.cart.lines.map((line, index) =>
    database
      .prepare(
        `INSERT INTO order_lines (
           order_id, line_number, sku_id, quantity, unit_price_centavos
         ) VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(order.id, index + 1, line.skuId, line.quantity, line.unitPrice.centavos),
  );
  return [orderStatement, ...lineStatements];
}

function outboxStatement(
  database: OrderDatabase,
  event: OrderOutboxEvent,
): CatalogPreparedStatement {
  return database
    .prepare(
      `INSERT OR IGNORE INTO outbox_events (
         id, event_type, aggregate_id, occurred_at, payload_json, attempts, published_at
       ) VALUES (?, ?, ?, ?, ?, 0, NULL)`,
    )
    .bind(event.id, event.type, event.aggregateId, event.occurredAt, JSON.stringify(event.payload));
}

function mapOrder(order: OrderRow, lines: readonly OrderLineRow[]): LockedOrder {
  return createLockedOrder({
    id: order.id,
    customerId: order.customer_id,
    subscriptionId: order.subscription_id,
    planId: order.plan_id,
    idempotencyKey: order.idempotency_key,
    requestFingerprint: order.request_fingerprint,
    cart: createCart(
      lines.map((line) =>
        createCartLine({
          skuId: line.sku_id,
          quantity: line.quantity,
          unitPrice: createMoney(line.unit_price_centavos),
        }),
      ),
    ),
    weeklyCredit: createMoney(order.weekly_credit_centavos),
    totals: {
      subtotal: createMoney(order.subtotal_centavos),
      weeklyFee: createMoney(order.weekly_fee_centavos),
      includedCredit: createMoney(order.included_credit_centavos),
      overage: createMoney(order.overage_centavos),
      deliveryFee: createMoney(order.delivery_fee_centavos),
      totalDue: createMoney(order.total_due_centavos),
    },
    status: "locked",
    lockedAt: order.locked_at,
  });
}

type OrderRow = Record<string, unknown> & {
  id: string;
  customer_id: string;
  subscription_id: string;
  plan_id: string;
  idempotency_key: string;
  request_fingerprint: string;
  weekly_credit_centavos: number;
  subtotal_centavos: number;
  weekly_fee_centavos: number;
  included_credit_centavos: number;
  overage_centavos: number;
  delivery_fee_centavos: number;
  total_due_centavos: number;
  locked_at: string;
};

type OrderLineRow = Record<string, unknown> & {
  sku_id: string;
  quantity: number;
  unit_price_centavos: number;
};
