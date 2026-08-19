import {
  createPackingManifest,
  createProcurementShortage,
  createProcurementSubstitution,
  type PackingManifest,
  type ProcurementDemand,
  type ProcurementShortage,
  type ProcurementSubstitution,
} from "@carbon/domain";
import type { CatalogDatabase } from "./catalog.js";

export interface ProcurementRepository {
  listDemand(cycleId: string): Promise<readonly ProcurementDemand[]>;
  savePurchase(cycleId: string, skuId: string, quantity: number, updatedAt: string): Promise<void>;
  listShortages(cycleId: string): Promise<readonly ProcurementShortage[]>;
  saveShortage(value: ProcurementShortage): Promise<void>;
  saveSubstitution(value: ProcurementSubstitution): Promise<void>;
  listSubstitutions(cycleId: string): Promise<readonly ProcurementSubstitution[]>;
  saveManifest(value: PackingManifest): Promise<void>;
  listManifests(cycleId: string): Promise<readonly PackingManifest[]>;
}

export class InMemoryProcurementRepository implements ProcurementRepository {
  private readonly demand = new Map<string, ProcurementDemand>();
  private readonly shortages = new Map<string, ProcurementShortage>();
  private readonly substitutions = new Map<string, ProcurementSubstitution>();
  private readonly manifests = new Map<string, PackingManifest>();
  constructor(demand: readonly ProcurementDemand[] = []) {
    for (const value of demand) this.demand.set(`${value.cycleId}:${value.skuId}`, value);
  }
  listDemand(cycleId: string) {
    return Promise.resolve([...this.demand.values()].filter((value) => value.cycleId === cycleId));
  }
  savePurchase(cycleId: string, skuId: string, quantity: number, _updatedAt: string) {
    const key = `${cycleId}:${skuId}`;
    const current = this.demand.get(key);
    if (!current) return Promise.reject(new Error("procurement demand was not found"));
    this.demand.set(key, {
      ...current,
      purchasedQuantity: quantity,
      status: quantity >= current.orderedQuantity ? "purchased" : "shortage",
    });
    return Promise.resolve();
  }
  listShortages(cycleId: string) {
    return Promise.resolve(
      [...this.shortages.values()].filter((value) => value.cycleId === cycleId),
    );
  }
  saveShortage(value: ProcurementShortage) {
    this.shortages.set(value.id, createProcurementShortage(value));
    return Promise.resolve();
  }
  saveSubstitution(value: ProcurementSubstitution) {
    this.substitutions.set(value.id, createProcurementSubstitution(value));
    return Promise.resolve();
  }
  async listSubstitutions(cycleId: string) {
    const shortages = await this.listShortages(cycleId);
    const ids = new Set(shortages.map((value) => value.id));
    return [...this.substitutions.values()].filter((value) => ids.has(value.shortageId));
  }
  saveManifest(value: PackingManifest) {
    this.manifests.set(value.id, createPackingManifest(value));
    return Promise.resolve();
  }
  listManifests(cycleId: string) {
    return Promise.resolve(
      [...this.manifests.values()].filter((value) => value.cycleId === cycleId),
    );
  }
}

export class D1ProcurementRepository implements ProcurementRepository {
  constructor(private readonly database: CatalogDatabase) {}
  async listDemand(cycleId: string) {
    const rows = await this.database
      .prepare(
        `SELECT ol.sku_id, SUM(ol.quantity) AS ordered_quantity, COALESCE(p.purchased_quantity, 0) AS purchased_quantity FROM orders o INNER JOIN order_lines ol ON ol.order_id = o.id LEFT JOIN procurement_purchases p ON p.cycle_id = ? AND p.sku_id = ol.sku_id WHERE o.status = 'locked' AND o.locked_at >= ? AND o.locked_at < ? GROUP BY ol.sku_id, p.purchased_quantity`,
      )
      .bind(cycleId, cycleStart(cycleId), cycleEnd(cycleId))
      .all<{ sku_id: string; ordered_quantity: number; purchased_quantity: number }>();
    return rows.results.map((row) => ({
      cycleId,
      skuId: row.sku_id,
      orderedQuantity: row.ordered_quantity,
      purchasedQuantity: row.purchased_quantity,
      status:
        row.purchased_quantity >= row.ordered_quantity
          ? ("purchased" as const)
          : row.purchased_quantity > 0
            ? ("shortage" as const)
            : ("open" as const),
    }));
  }
  async savePurchase(cycleId: string, skuId: string, quantity: number, updatedAt: string) {
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO procurement_purchases (cycle_id, sku_id, purchased_quantity, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(cycle_id, sku_id) DO UPDATE SET purchased_quantity = excluded.purchased_quantity, updated_at = excluded.updated_at`,
        )
        .bind(cycleId, skuId, quantity, updatedAt),
    ]);
  }
  async listShortages(cycleId: string) {
    const rows = await this.database
      .prepare(
        `SELECT id, cycle_id, sku_id, requested_quantity, available_quantity, status, created_at FROM procurement_shortages WHERE cycle_id = ? ORDER BY created_at`,
      )
      .bind(cycleId)
      .all<ShortageRow>();
    return rows.results.map(mapShortage);
  }
  async saveShortage(value: ProcurementShortage) {
    const normalized = createProcurementShortage(value);
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO procurement_shortages (id, cycle_id, sku_id, requested_quantity, available_quantity, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET available_quantity = excluded.available_quantity, status = excluded.status`,
        )
        .bind(
          normalized.id,
          normalized.cycleId,
          normalized.skuId,
          normalized.requestedQuantity,
          normalized.availableQuantity,
          normalized.status,
          normalized.createdAt,
        ),
    ]);
  }
  async saveSubstitution(value: ProcurementSubstitution) {
    const normalized = createProcurementSubstitution(value);
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO procurement_substitutions (id, shortage_id, original_sku_id, substitute_sku_id, quantity, status, approved_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET status = excluded.status, approved_at = excluded.approved_at`,
        )
        .bind(
          normalized.id,
          normalized.shortageId,
          normalized.originalSkuId,
          normalized.substituteSkuId,
          normalized.quantity,
          normalized.status,
          normalized.approvedAt,
        ),
    ]);
  }
  async listSubstitutions(cycleId: string) {
    const rows = await this.database
      .prepare(
        `SELECT s.id, s.shortage_id, s.original_sku_id, s.substitute_sku_id, s.quantity, s.status, s.approved_at FROM procurement_substitutions s INNER JOIN procurement_shortages h ON h.id = s.shortage_id WHERE h.cycle_id = ? ORDER BY s.id`,
      )
      .bind(cycleId)
      .all<SubstitutionRow>();
    return rows.results.map(mapSubstitution);
  }
  async saveManifest(value: PackingManifest) {
    const normalized = createPackingManifest(value);
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO packing_manifests (id, cycle_id, order_id, status, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(order_id) DO UPDATE SET status = excluded.status`,
        )
        .bind(
          normalized.id,
          normalized.cycleId,
          normalized.orderId,
          normalized.status,
          normalized.createdAt,
        ),
    ]);
  }
  async listManifests(cycleId: string) {
    const rows = await this.database
      .prepare(
        `SELECT id, cycle_id, order_id, status, created_at FROM packing_manifests WHERE cycle_id = ? ORDER BY created_at`,
      )
      .bind(cycleId)
      .all<ManifestRow>();
    return rows.results.map((row) =>
      createPackingManifest({
        id: row.id,
        cycleId: row.cycle_id,
        orderId: row.order_id,
        status: row.status,
        createdAt: row.created_at,
      }),
    );
  }
}
type ShortageRow = {
  id: string;
  cycle_id: string;
  sku_id: string;
  requested_quantity: number;
  available_quantity: number;
  status: "open" | "resolved";
  created_at: string;
};
type SubstitutionRow = {
  id: string;
  shortage_id: string;
  original_sku_id: string;
  substitute_sku_id: string;
  quantity: number;
  status: "proposed" | "approved" | "rejected";
  approved_at: string | null;
};
type ManifestRow = {
  id: string;
  cycle_id: string;
  order_id: string;
  status: "pending" | "packed" | "exception";
  created_at: string;
};
const mapShortage = (row: ShortageRow) =>
  createProcurementShortage({
    id: row.id,
    cycleId: row.cycle_id,
    skuId: row.sku_id,
    requestedQuantity: row.requested_quantity,
    availableQuantity: row.available_quantity,
    status: row.status,
    createdAt: row.created_at,
  });
const mapSubstitution = (row: SubstitutionRow) =>
  createProcurementSubstitution({
    id: row.id,
    shortageId: row.shortage_id,
    originalSkuId: row.original_sku_id,
    substituteSkuId: row.substitute_sku_id,
    quantity: row.quantity,
    status: row.status,
    approvedAt: row.approved_at,
  });
function cycleEnd(cycleId: string) {
  return `${cycleId.slice(6)}T00:00:00.000Z`;
}
function cycleStart(cycleId: string) {
  const value = new Date(cycleEnd(cycleId));
  value.setUTCDate(value.getUTCDate() - 7);
  return value.toISOString();
}
