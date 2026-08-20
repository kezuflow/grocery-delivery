import {
  createDeliveryEvent,
  createDeliveryTracking,
  type DeliveryEvent,
  type DeliveryTracking,
} from "@carbon/domain";
import type { CatalogDatabase } from "./catalog.js";

export interface DeliveryTrackingRepository {
  get(orderId: string, customerId: string): Promise<DeliveryTracking | null>;
  findCustomerId(orderId: string): Promise<string | null>;
}

export class InMemoryDeliveryTrackingRepository implements DeliveryTrackingRepository {
  private readonly values = new Map<string, DeliveryTracking>();

  constructor(values: readonly DeliveryTracking[] = []) {
    for (const value of values) {
      const normalized = createDeliveryTracking(value);
      this.values.set(`${normalized.customerId}:${normalized.orderId}`, normalized);
    }
  }

  get(orderId: string, customerId: string) {
    return Promise.resolve(this.values.get(`${customerId}:${orderId}`) ?? null);
  }

  findCustomerId(orderId: string) {
    return Promise.resolve(
      [...this.values.values()].find((value) => value.orderId === orderId)?.customerId ?? null,
    );
  }
}

export class D1DeliveryTrackingRepository implements DeliveryTrackingRepository {
  constructor(private readonly database: CatalogDatabase) {}

  async get(orderId: string, customerId: string) {
    const order = await this.database
      .prepare(
        `SELECT o.id, o.customer_id, a.id AS assignment_id, a.window_id, a.status
         FROM orders o LEFT JOIN dispatch_assignments a ON a.order_id = o.id
         WHERE o.id = ? AND o.customer_id = ? AND o.status = 'locked' LIMIT 1`,
      )
      .bind(orderId, customerId)
      .all<TrackingRow>();
    const row = order.results[0];
    if (!row) return null;
    const eventRows = row.assignment_id
      ? await this.database
          .prepare(
            `SELECT id, client_event_id, assignment_id, order_id, deliveryman_user_id, type, occurred_at, received_at, note, failure_reason
             FROM delivery_events WHERE assignment_id = ? ORDER BY occurred_at ASC`,
          )
          .bind(row.assignment_id)
          .all<EventRow>()
      : { results: [] as EventRow[] };
    const events = eventRows.results.map((event) =>
      createDeliveryEvent({
        id: event.id,
        clientEventId: event.client_event_id,
        assignmentId: event.assignment_id,
        orderId: event.order_id,
        deliverymanUserId: event.deliveryman_user_id,
        type: event.type,
        occurredAt: event.occurred_at,
        receivedAt: event.received_at,
        note: event.note,
        failureReason: event.failure_reason,
      }),
    );
    return createDeliveryTracking({
      orderId: row.id,
      customerId: row.customer_id,
      assignmentId: row.assignment_id,
      windowId: row.window_id,
      status: row.status ?? "pending",
      latestEventType: events.at(-1)?.type ?? null,
      events,
    });
  }

  async findCustomerId(orderId: string) {
    const rows = await this.database
      .prepare("SELECT customer_id FROM orders WHERE id = ? AND status = 'locked' LIMIT 1")
      .bind(orderId)
      .all<{ customer_id: string }>();
    return rows.results[0]?.customer_id ?? null;
  }
}

type TrackingRow = {
  id: string;
  customer_id: string;
  assignment_id: string | null;
  window_id: string | null;
  status: DeliveryTracking["status"] | null;
};
type EventRow = Pick<DeliveryEvent, "id" | "type" | "note"> & {
  client_event_id: string;
  assignment_id: string;
  order_id: string;
  deliveryman_user_id: string;
  occurred_at: string;
  received_at: string;
  failure_reason: DeliveryEvent["failureReason"];
};
