import {
  createDeliveryWindow,
  createDeliveryWindowSelection,
  type DeliveryWindow,
  type DeliveryWindowSelection,
} from "@carbon/domain";

import type { CatalogDatabase } from "./catalog.js";

export type DeliveryWindowView = DeliveryWindow & Readonly<{ reserved: number; remaining: number }>;

export interface DeliveryWindowRepository {
  listForCycle(cycleId: string): Promise<readonly DeliveryWindowView[]>;
  findSelection(customerId: string, cycleId: string): Promise<DeliveryWindowSelection | null>;
  select(input: DeliveryWindowSelection): Promise<void>;
  saveWindow(window: DeliveryWindow): Promise<void>;
}

export class InMemoryDeliveryWindowRepository implements DeliveryWindowRepository {
  private readonly windows = new Map<string, DeliveryWindow>();
  private readonly selections = new Map<string, DeliveryWindowSelection>();

  constructor(windows: readonly DeliveryWindow[] = []) {
    for (const window of windows) this.windows.set(window.id, createDeliveryWindow(window));
  }

  listForCycle(cycleId: string): Promise<readonly DeliveryWindowView[]> {
    return Promise.resolve(
      [...this.windows.values()]
        .filter((window) => window.cycleId === cycleId && window.active)
        .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
        .map((window) => {
          const reserved = [...this.selections.values()].filter(
            (selection) => selection.cycleId === cycleId && selection.windowId === window.id,
          ).length;
          return { ...window, reserved, remaining: Math.max(0, window.capacity - reserved) };
        }),
    );
  }

  findSelection(customerId: string, cycleId: string): Promise<DeliveryWindowSelection | null> {
    return Promise.resolve(this.selections.get(`${customerId}:${cycleId}`) ?? null);
  }

  select(input: DeliveryWindowSelection): Promise<void> {
    try {
      const normalized = createDeliveryWindowSelection(input);
      const window = this.windows.get(normalized.windowId);
      if (!window || window.cycleId !== normalized.cycleId || !window.active) {
        throw new Error("delivery window was not found");
      }
      const reservedByOthers = [...this.selections.values()].filter(
        (selection) =>
          selection.cycleId === normalized.cycleId &&
          selection.windowId === normalized.windowId &&
          selection.customerId !== normalized.customerId,
      ).length;
      if (reservedByOthers >= window.capacity) throw new Error("delivery window is full");
      this.selections.set(`${normalized.customerId}:${normalized.cycleId}`, normalized);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error("delivery window failed"));
    }
  }

  saveWindow(window: DeliveryWindow): Promise<void> {
    const normalized = createDeliveryWindow(window);
    this.windows.set(normalized.id, normalized);
    return Promise.resolve();
  }
}

export class D1DeliveryWindowRepository implements DeliveryWindowRepository {
  constructor(private readonly database: CatalogDatabase) {}

  async listForCycle(cycleId: string): Promise<readonly DeliveryWindowView[]> {
    const rows = await this.database
      .prepare(
        `SELECT w.id, w.cycle_id, w.label, w.starts_at, w.ends_at, w.capacity, w.active,
                w.created_at, w.updated_at, COUNT(s.customer_id) AS reserved
         FROM delivery_windows w
         LEFT JOIN delivery_window_selections s
           ON s.window_id = w.id AND s.cycle_id = w.cycle_id
         WHERE w.cycle_id = ? AND w.active = 1
         GROUP BY w.id
         ORDER BY w.starts_at`,
      )
      .bind(cycleId)
      .all<WindowRow>();
    return rows.results.map((row) => {
      const window = mapWindow(row);
      return {
        ...window,
        reserved: row.reserved,
        remaining: Math.max(0, window.capacity - row.reserved),
      };
    });
  }

  async findSelection(
    customerId: string,
    cycleId: string,
  ): Promise<DeliveryWindowSelection | null> {
    const rows = await this.database
      .prepare(
        `SELECT customer_id, cycle_id, window_id, selected_at
         FROM delivery_window_selections
         WHERE customer_id = ? AND cycle_id = ?
         LIMIT 1`,
      )
      .bind(customerId, cycleId)
      .all<SelectionRow>();
    const row = rows.results[0];
    return row
      ? createDeliveryWindowSelection({
          customerId: row.customer_id,
          cycleId: row.cycle_id,
          windowId: row.window_id,
          selectedAt: row.selected_at,
        })
      : null;
  }

  async select(input: DeliveryWindowSelection): Promise<void> {
    const normalized = createDeliveryWindowSelection(input);
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO delivery_window_selections (customer_id, cycle_id, window_id, selected_at)
           SELECT ?, ?, w.id, ?
           FROM delivery_windows w
           WHERE w.id = ? AND w.cycle_id = ? AND w.active = 1
             AND (
               SELECT COUNT(*)
               FROM delivery_window_selections s
               WHERE s.window_id = w.id
                 AND NOT (s.customer_id = ? AND s.cycle_id = ?)
             ) < w.capacity
           ON CONFLICT(customer_id, cycle_id) DO UPDATE SET
             window_id = excluded.window_id,
             selected_at = excluded.selected_at`,
        )
        .bind(
          normalized.customerId,
          normalized.cycleId,
          normalized.selectedAt,
          normalized.windowId,
          normalized.cycleId,
          normalized.customerId,
          normalized.cycleId,
        ),
    ]);
    const saved = await this.findSelection(normalized.customerId, normalized.cycleId);
    if (saved?.windowId !== normalized.windowId) {
      throw new Error("delivery window is unavailable or full");
    }
  }

  async saveWindow(window: DeliveryWindow): Promise<void> {
    const normalized = createDeliveryWindow(window);
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO delivery_windows (
             id, cycle_id, label, starts_at, ends_at, capacity, active, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             cycle_id = excluded.cycle_id,
             label = excluded.label,
             starts_at = excluded.starts_at,
             ends_at = excluded.ends_at,
             capacity = excluded.capacity,
             active = excluded.active,
             updated_at = excluded.updated_at`,
        )
        .bind(
          normalized.id,
          normalized.cycleId,
          normalized.label,
          normalized.startsAt,
          normalized.endsAt,
          normalized.capacity,
          normalized.active ? 1 : 0,
          normalized.createdAt,
          normalized.updatedAt,
        ),
    ]);
  }
}

type WindowRow = Record<string, unknown> & {
  id: string;
  cycle_id: string;
  label: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  active: number;
  created_at: string;
  updated_at: string;
  reserved: number;
};

type SelectionRow = Record<string, unknown> & {
  customer_id: string;
  cycle_id: string;
  window_id: string;
  selected_at: string;
};

function mapWindow(row: WindowRow): DeliveryWindow {
  return createDeliveryWindow({
    id: row.id,
    cycleId: row.cycle_id,
    label: row.label,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    capacity: row.capacity,
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
