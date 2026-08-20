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
  findById(id: string): Promise<LockedOrder | null>;
  findByIdempotencyKey(customerId: string, idempotencyKey: string): Promise<LockedOrder | null>;
  save(order: LockedOrder): Promise<void>;
  saveAndPublish(order: LockedOrder, event: OrderOutboxEvent): Promise<void>;
  updatePaymentState(
    orderId: string,
    paymentState: NonNullable<LockedOrder["paymentState"]>,
  ): Promise<void>;
}

export interface OutboxPublisher {
  publish(event: OrderOutboxEvent): Promise<void>;
}

export class D1OrderRepository implements OrderRepository {
  constructor(private readonly database: OrderDatabase) {}

  async findById(id: string): Promise<LockedOrder | null> {
    const orders = await this.database
      .prepare(
        `SELECT id, customer_id, subscription_id, plan_id, cycle_id, idempotency_key,
                request_fingerprint, weekly_credit_centavos, subtotal_centavos,
                discount_centavos, weekly_fee_centavos, included_credit_centavos, overage_centavos,
                delivery_fee_centavos, total_due_centavos, applied_promotion_json,
                delivery_address_json, delivery_window_json, payment_state, locked_at
         FROM orders
         WHERE id = ? AND status = 'locked'
         LIMIT 1`,
      )
      .bind(id)
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

  async findByIdempotencyKey(
    customerId: string,
    idempotencyKey: string,
  ): Promise<LockedOrder | null> {
    const orders = await this.database
      .prepare(
        `SELECT id, customer_id, subscription_id, plan_id, cycle_id, idempotency_key,
                request_fingerprint, weekly_credit_centavos, subtotal_centavos,
                discount_centavos, weekly_fee_centavos, included_credit_centavos, overage_centavos,
                delivery_fee_centavos, total_due_centavos, applied_promotion_json,
                delivery_address_json, delivery_window_json, payment_state, locked_at
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
    await this.database.batch([
      ...promotionStatements(this.database, order),
      ...orderStatements(this.database, order),
    ]);
  }

  async saveAndPublish(order: LockedOrder, event: OrderOutboxEvent): Promise<void> {
    await this.database.batch([
      ...promotionStatements(this.database, order),
      ...orderStatements(this.database, order),
      outboxStatement(this.database, event),
    ]);
  }

  async updatePaymentState(
    orderId: string,
    paymentState: NonNullable<LockedOrder["paymentState"]>,
  ): Promise<void> {
    await this.database.batch([
      this.database
        .prepare(`UPDATE orders SET payment_state = ? WHERE id = ? AND status = 'locked'`)
        .bind(paymentState, orderId),
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
         id, customer_id, subscription_id, plan_id, cycle_id, idempotency_key, request_fingerprint,
         weekly_credit_centavos, subtotal_centavos, weekly_fee_centavos,
         discount_centavos, included_credit_centavos, overage_centavos, delivery_fee_centavos,
         total_due_centavos, applied_promotion_json, delivery_address_json,
         delivery_window_json, payment_state, status, locked_at, created_at
       )
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'locked', ?, ?
       WHERE ? IS NULL OR EXISTS (
         SELECT 1 FROM promotion_redemptions WHERE id = ?
       )`,
    )
    .bind(
      order.id,
      order.customerId,
      order.subscriptionId,
      order.planId,
      order.cycleId,
      order.idempotencyKey,
      order.requestFingerprint,
      order.weeklyCredit.centavos,
      order.totals.subtotal.centavos,
      order.totals.weeklyFee.centavos,
      order.totals.discount?.centavos ?? 0,
      order.totals.includedCredit.centavos,
      order.totals.overage.centavos,
      order.totals.deliveryFee.centavos,
      order.totals.totalDue.centavos,
      order.appliedPromotion ? JSON.stringify(order.appliedPromotion) : null,
      order.deliveryAddress ? JSON.stringify(order.deliveryAddress) : null,
      order.deliveryWindow ? JSON.stringify(order.deliveryWindow) : null,
      order.paymentState ?? "unpaid",
      order.lockedAt,
      order.lockedAt,
      order.appliedPromotion?.id ?? null,
      order.appliedPromotion ? `redemption:${order.id}` : null,
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
    cycleId: order.cycle_id,
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
      discount: createMoney(order.discount_centavos ?? 0),
      weeklyFee: createMoney(order.weekly_fee_centavos),
      includedCredit: createMoney(order.included_credit_centavos),
      overage: createMoney(order.overage_centavos),
      deliveryFee: createMoney(order.delivery_fee_centavos),
      totalDue: createMoney(order.total_due_centavos),
    },
    appliedPromotion: order.applied_promotion_json
      ? JSON.parse(order.applied_promotion_json)
      : null,
    deliveryAddress: order.delivery_address_json ? JSON.parse(order.delivery_address_json) : null,
    deliveryWindow: order.delivery_window_json ? JSON.parse(order.delivery_window_json) : null,
    paymentState: order.payment_state ?? "unpaid",
    status: "locked",
    lockedAt: order.locked_at,
  });
}

type OrderRow = Record<string, unknown> & {
  id: string;
  customer_id: string;
  subscription_id: string;
  plan_id: string;
  cycle_id: string;
  idempotency_key: string;
  request_fingerprint: string;
  weekly_credit_centavos: number;
  subtotal_centavos: number;
  discount_centavos: number;
  weekly_fee_centavos: number;
  included_credit_centavos: number;
  overage_centavos: number;
  delivery_fee_centavos: number;
  total_due_centavos: number;
  applied_promotion_json: string | null;
  delivery_address_json: string | null;
  delivery_window_json: string | null;
  payment_state: LockedOrder["paymentState"];
  locked_at: string;
};

function promotionStatements(
  database: OrderDatabase,
  order: LockedOrder,
): readonly CatalogPreparedStatement[] {
  const promotion = order.appliedPromotion;
  if (!promotion) return [];
  const result = JSON.stringify({
    promotionId: promotion.id,
    discount: promotion.discount,
    deliveryFee: promotion.deliveryFee,
    reason: null,
  });
  return [
    database
      .prepare(
        `INSERT INTO promotion_redemptions (
           id, promotion_id, customer_id, idempotency_key,
           request_fingerprint, result_json, created_at
         )
         SELECT ?, ?, ?, ?, ?, ?, ?
         FROM promotions
         WHERE id = ? AND code = ? AND version = ? AND status = 'active'
           AND starts_at <= ? AND ends_at > ?
           AND (total_budget_centavos IS NULL OR redeemed_amount_centavos + ? <= total_budget_centavos)
           AND (total_redemptions IS NULL OR redemption_count < total_redemptions)
           AND (
             per_customer_redemptions IS NULL OR
             (SELECT COUNT(*) FROM promotion_redemptions
              WHERE promotion_id = ? AND customer_id = ? AND json_extract(result_json, '$.reason') IS NULL)
             < per_customer_redemptions
           )
         ON CONFLICT(customer_id, idempotency_key) DO NOTHING`,
      )
      .bind(
        `redemption:${order.id}`,
        promotion.id,
        order.customerId,
        order.idempotencyKey,
        order.requestFingerprint,
        result,
        order.lockedAt,
        promotion.id,
        promotion.code,
        promotion.version,
        order.lockedAt,
        order.lockedAt,
        promotion.discount.centavos,
        promotion.id,
        order.customerId,
      ),
    database
      .prepare(
        `UPDATE promotions
         SET redeemed_amount_centavos = redeemed_amount_centavos + ?,
             redemption_count = redemption_count + 1,
             updated_at = ?
         WHERE id = ?
           AND EXISTS (SELECT 1 FROM promotion_redemptions WHERE id = ?)
           AND (total_budget_centavos IS NULL OR redeemed_amount_centavos + ? <= total_budget_centavos)
           AND (total_redemptions IS NULL OR redemption_count < total_redemptions)`,
      )
      .bind(
        promotion.discount.centavos,
        order.lockedAt,
        promotion.id,
        `redemption:${order.id}`,
        promotion.discount.centavos,
      ),
  ];
}

type OrderLineRow = Record<string, unknown> & {
  sku_id: string;
  quantity: number;
  unit_price_centavos: number;
};
