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
  routeSequence?: number;
  recipientName?: string | null;
  recipientPhone?: string | null;
  deliveryAddress: Readonly<{
    line1: string;
    line2: string | null;
    barangay: string;
    city: string;
    province: string;
    postalCode: string;
    instructions: string | null;
  }> | null;
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
    validateSequence(
      [...this.events.values()].filter((item) => item.assignmentId === normalized.assignmentId),
      normalized,
    );
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
                ROW_NUMBER() OVER (ORDER BY a.assigned_at, a.id) AS route_sequence,
                json_extract(o.delivery_address_json, '$.recipientName') AS recipient_name,
                json_extract(o.delivery_address_json, '$.phone') AS recipient_phone,
                o.delivery_address_json,
                (SELECT e.type FROM delivery_events e
                 WHERE e.assignment_id = a.id ORDER BY e.occurred_at DESC LIMIT 1) AS last_event_type
         FROM dispatch_assignments a
         INNER JOIN orders o ON o.id = a.order_id
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
        `SELECT id, client_event_id, assignment_id, order_id, deliveryman_user_id, type, occurred_at, received_at, note, failure_reason FROM delivery_events WHERE client_event_id = ? LIMIT 1`,
      )
      .bind(normalized.clientEventId)
      .all<EventRow>();
    if (existing.results[0]) return mapEvent(existing.results[0]);
    const previous = await this.database
      .prepare(
        `SELECT id, client_event_id, assignment_id, order_id, deliveryman_user_id, type, occurred_at, received_at, note, failure_reason
         FROM delivery_events WHERE assignment_id = ? ORDER BY occurred_at`,
      )
      .bind(normalized.assignmentId)
      .all<EventRow>();
    validateSequence(previous.results.map(mapEvent), normalized);
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO delivery_events (id, client_event_id, assignment_id, order_id, deliveryman_user_id, type, occurred_at, received_at, note, failure_reason)
           SELECT ?, ?, a.id, a.order_id, a.deliveryman_user_id, ?, ?, ?, ?, ?
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
          normalized.failureReason,
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
        `SELECT id, client_event_id, assignment_id, order_id, deliveryman_user_id, type, occurred_at, received_at, note, failure_reason FROM delivery_events WHERE client_event_id = ? LIMIT 1`,
      )
      .bind(normalized.clientEventId)
      .all<EventRow>();
    if (!saved.results[0]) throw new Error("delivery event was not accepted");
    return mapEvent(saved.results[0]);
  }

  async listEvents(assignmentId: string, deliverymanUserId: string) {
    const rows = await this.database
      .prepare(
        `SELECT id, client_event_id, assignment_id, order_id, deliveryman_user_id, type, occurred_at, received_at, note, failure_reason FROM delivery_events WHERE assignment_id = ? AND deliveryman_user_id = ? ORDER BY occurred_at`,
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
  route_sequence: number;
  recipient_name: string | null;
  recipient_phone: string | null;
  delivery_address_json: string | null;
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
  failure_reason: DeliveryEvent["failureReason"];
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
  routeSequence: Number(row.route_sequence),
  recipientName: row.recipient_name,
  recipientPhone: row.recipient_phone,
  deliveryAddress: row.delivery_address_json
    ? parseDeliveryAddress(row.delivery_address_json)
    : null,
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
    failureReason: row.failure_reason,
  });

function validateSequence(events: readonly DeliveryEvent[], next: DeliveryEvent): void {
  const latest = [...events]
    .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
    .at(-1);
  if (!latest) {
    if (next.type !== "picked_up") throw new Error("delivery must begin with picked_up");
    return;
  }
  if (latest.type === "delivered" || latest.type === "failed") {
    throw new Error("delivery is already terminal");
  }
  const allowed: Record<DeliveryEventType, readonly DeliveryEventType[]> = {
    picked_up: ["arrived"],
    arrived: ["delivered", "failed"],
    delivered: [],
    failed: [],
  };
  if (!allowed[latest.type].includes(next.type)) {
    throw new Error(`delivery event ${next.type} must follow ${latest.type}`);
  }
}

function parseDeliveryAddress(value: string): DeliverymanAssignment["deliveryAddress"] {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (
      typeof parsed.line1 !== "string" ||
      typeof parsed.barangay !== "string" ||
      typeof parsed.city !== "string" ||
      typeof parsed.province !== "string" ||
      typeof parsed.postalCode !== "string"
    )
      return null;
    return {
      line1: parsed.line1,
      line2: typeof parsed.line2 === "string" ? parsed.line2 : null,
      barangay: parsed.barangay,
      city: parsed.city,
      province: parsed.province,
      postalCode: parsed.postalCode,
      instructions: typeof parsed.instructions === "string" ? parsed.instructions : null,
    };
  } catch {
    return null;
  }
}

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
