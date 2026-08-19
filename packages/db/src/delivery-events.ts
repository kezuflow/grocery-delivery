import { createDeliveryEvent, type DeliveryEvent, type DeliveryEventType } from "@carbon/domain";
import type { CatalogDatabase } from "./catalog.js";

export type DeliverymanAssignment = Readonly<{
  id: string;
  cycleId: string;
  orderId: string;
  windowId: string;
  deliverymanUserId: string;
  status: "assigned" | "out_for_delivery" | "delivered" | "failed";
  assignedAt: string;
  lastEventType: DeliveryEventType | null;
}>;

export interface DeliveryEventRepository {
  listAssignments(
    deliverymanUserId: string,
    cycleId: string,
  ): Promise<readonly DeliverymanAssignment[]>;
  saveEvent(event: DeliveryEvent): Promise<DeliveryEvent>;
  listEvents(assignmentId: string, deliverymanUserId: string): Promise<readonly DeliveryEvent[]>;
}

export class InMemoryDeliveryEventRepository implements DeliveryEventRepository {
  private readonly assignments = new Map<string, DeliverymanAssignment>();
  private readonly events = new Map<string, DeliveryEvent>();

  constructor(assignments: readonly DeliverymanAssignment[] = []) {
    for (const assignment of assignments) this.assignments.set(assignment.id, assignment);
  }

  listAssignments(deliverymanUserId: string, cycleId: string) {
    return Promise.resolve(
      [...this.assignments.values()].filter(
        (assignment) =>
          assignment.deliverymanUserId === deliverymanUserId && assignment.cycleId === cycleId,
      ),
    );
  }

  saveEvent(event: DeliveryEvent): Promise<DeliveryEvent> {
    const normalized = createDeliveryEvent(event);
    const existing = this.events.get(normalized.clientEventId);
    if (existing) return Promise.resolve(existing);
    const assignment = this.assignments.get(normalized.assignmentId);
    if (
      !assignment ||
      assignment.orderId !== normalized.orderId ||
      assignment.deliverymanUserId !== normalized.deliverymanUserId
    ) {
      return Promise.reject(new Error("delivery assignment was not found"));
    }
    this.events.set(normalized.clientEventId, normalized);
    const latestEvent = [...this.events.values()]
      .filter((item) => item.assignmentId === normalized.assignmentId)
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
      .at(-1);
    if (!latestEvent) return Promise.resolve(normalized);
    this.assignments.set(normalized.assignmentId, {
      ...assignment,
      status: statusForEvent(latestEvent.type),
      lastEventType: latestEvent.type,
    });
    return Promise.resolve(normalized);
  }

  listEvents(assignmentId: string, deliverymanUserId: string) {
    return Promise.resolve(
      [...this.events.values()].filter(
        (event) =>
          event.assignmentId === assignmentId && event.deliverymanUserId === deliverymanUserId,
      ),
    );
  }
}

export class D1DeliveryEventRepository implements DeliveryEventRepository {
  constructor(private readonly database: CatalogDatabase) {}

  async listAssignments(deliverymanUserId: string, cycleId: string) {
    const rows = await this.database
      .prepare(
        `SELECT a.id, a.cycle_id, a.order_id, a.window_id, a.deliveryman_user_id,
                a.status, a.assigned_at,
                (SELECT e.type FROM delivery_events e
                 WHERE e.assignment_id = a.id ORDER BY e.occurred_at DESC LIMIT 1) AS last_event_type
         FROM dispatch_assignments a
         WHERE a.deliveryman_user_id = ? AND a.cycle_id = ?
         ORDER BY a.assigned_at`,
      )
      .bind(deliverymanUserId, cycleId)
      .all<AssignmentRow>();
    return rows.results.map(mapAssignment);
  }

  async saveEvent(event: DeliveryEvent): Promise<DeliveryEvent> {
    const normalized = createDeliveryEvent(event);
    const existing = await this.database
      .prepare(
        `SELECT id, client_event_id, assignment_id, order_id, deliveryman_user_id, type, occurred_at, received_at, note FROM delivery_events WHERE client_event_id = ? LIMIT 1`,
      )
      .bind(normalized.clientEventId)
      .all<EventRow>();
    if (existing.results[0]) return mapEvent(existing.results[0]);
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO delivery_events (id, client_event_id, assignment_id, order_id, deliveryman_user_id, type, occurred_at, received_at, note)
           SELECT ?, ?, a.id, a.order_id, a.deliveryman_user_id, ?, ?, ?, ?
           FROM dispatch_assignments a
           WHERE a.id = ? AND a.order_id = ? AND a.deliveryman_user_id = ?`,
        )
        .bind(
          normalized.id,
          normalized.clientEventId,
          normalized.type,
          normalized.occurredAt,
          normalized.receivedAt,
          normalized.note,
          normalized.assignmentId,
          normalized.orderId,
          normalized.deliverymanUserId,
        ),
      this.database
        .prepare(
          `UPDATE dispatch_assignments
         SET status = CASE (SELECT type FROM delivery_events WHERE assignment_id = ? ORDER BY occurred_at DESC LIMIT 1)
           WHEN 'delivered' THEN 'delivered'
           WHEN 'failed' THEN 'failed'
           ELSE 'out_for_delivery'
         END
         WHERE id = ? AND order_id = ? AND deliveryman_user_id = ?`,
        )
        .bind(
          normalized.assignmentId,
          normalized.assignmentId,
          normalized.orderId,
          normalized.deliverymanUserId,
        ),
    ]);
    const saved = await this.database
      .prepare(
        `SELECT id, client_event_id, assignment_id, order_id, deliveryman_user_id, type, occurred_at, received_at, note FROM delivery_events WHERE client_event_id = ? LIMIT 1`,
      )
      .bind(normalized.clientEventId)
      .all<EventRow>();
    if (!saved.results[0]) throw new Error("delivery event was not accepted");
    return mapEvent(saved.results[0]);
  }

  async listEvents(assignmentId: string, deliverymanUserId: string) {
    const rows = await this.database
      .prepare(
        `SELECT id, client_event_id, assignment_id, order_id, deliveryman_user_id, type, occurred_at, received_at, note FROM delivery_events WHERE assignment_id = ? AND deliveryman_user_id = ? ORDER BY occurred_at`,
      )
      .bind(assignmentId, deliverymanUserId)
      .all<EventRow>();
    return rows.results.map(mapEvent);
  }
}

type AssignmentRow = {
  id: string;
  cycle_id: string;
  order_id: string;
  window_id: string;
  deliveryman_user_id: string;
  status: DeliverymanAssignment["status"];
  assigned_at: string;
  last_event_type: DeliveryEventType | null;
};
type EventRow = {
  id: string;
  client_event_id: string;
  assignment_id: string;
  order_id: string;
  deliveryman_user_id: string;
  type: DeliveryEventType;
  occurred_at: string;
  received_at: string;
  note: string | null;
};
const mapAssignment = (row: AssignmentRow): DeliverymanAssignment => ({
  id: row.id,
  cycleId: row.cycle_id,
  orderId: row.order_id,
  windowId: row.window_id,
  deliverymanUserId: row.deliveryman_user_id,
  status: row.status,
  assignedAt: row.assigned_at,
  lastEventType: row.last_event_type,
});
const mapEvent = (row: EventRow): DeliveryEvent =>
  createDeliveryEvent({
    id: row.id,
    clientEventId: row.client_event_id,
    assignmentId: row.assignment_id,
    orderId: row.order_id,
    deliverymanUserId: row.deliveryman_user_id,
    type: row.type,
    occurredAt: row.occurred_at,
    receivedAt: row.received_at,
    note: row.note,
  });

function statusForEvent(type: DeliveryEventType): DeliverymanAssignment["status"] {
  switch (type) {
    case "delivered":
      return "delivered";
    case "failed":
      return "failed";
    case "picked_up":
    case "arrived":
      return "out_for_delivery";
  }
}
