import { createDispatchAssignment, type DispatchAssignment } from "@carbon/domain";
import type { CatalogDatabase } from "./catalog.js";
export interface DispatchRepository {
  list(cycleId: string): Promise<readonly DispatchAssignment[]>;
  save(value: DispatchAssignment): Promise<void>;
}
export class InMemoryDispatchRepository implements DispatchRepository {
  private readonly values = new Map<string, DispatchAssignment>();
  list(cycleId: string) {
    return Promise.resolve([...this.values.values()].filter((value) => value.cycleId === cycleId));
  }
  save(value: DispatchAssignment) {
    this.values.set(value.id, createDispatchAssignment(value));
    return Promise.resolve();
  }
}
export class D1DispatchRepository implements DispatchRepository {
  constructor(private readonly database: CatalogDatabase) {}
  async list(cycleId: string) {
    const rows = await this.database
      .prepare(
        `SELECT id, cycle_id, order_id, window_id, deliveryman_user_id, status, assigned_at FROM dispatch_assignments WHERE cycle_id = ? ORDER BY assigned_at`,
      )
      .bind(cycleId)
      .all<DispatchRow>();
    return rows.results.map((row) =>
      createDispatchAssignment({
        id: row.id,
        cycleId: row.cycle_id,
        orderId: row.order_id,
        windowId: row.window_id,
        deliverymanUserId: row.deliveryman_user_id,
        status: row.status,
        assignedAt: row.assigned_at,
      }),
    );
  }
  async save(value: DispatchAssignment) {
    const normalized = createDispatchAssignment(value);
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO dispatch_assignments (id, cycle_id, order_id, window_id, deliveryman_user_id, status, assigned_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(order_id) DO UPDATE SET window_id = excluded.window_id, deliveryman_user_id = excluded.deliveryman_user_id, status = excluded.status, assigned_at = excluded.assigned_at`,
        )
        .bind(
          normalized.id,
          normalized.cycleId,
          normalized.orderId,
          normalized.windowId,
          normalized.deliverymanUserId,
          normalized.status,
          normalized.assignedAt,
        ),
    ]);
  }
}
type DispatchRow = {
  id: string;
  cycle_id: string;
  order_id: string;
  window_id: string;
  deliveryman_user_id: string;
  status: DispatchAssignment["status"];
  assigned_at: string;
};
