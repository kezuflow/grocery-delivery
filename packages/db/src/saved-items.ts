import type { CatalogDatabase } from "./catalog.js";

export type SavedItemRecord = Readonly<{
  customerId: string;
  skuId: string;
  savedAt: string;
}>;

export interface SavedItemsRepository {
  listByCustomer(customerId: string): Promise<readonly SavedItemRecord[]>;
  save(value: SavedItemRecord): Promise<void>;
  remove(customerId: string, skuId: string): Promise<void>;
}

export class InMemorySavedItemsRepository implements SavedItemsRepository {
  private readonly values = new Map<string, SavedItemRecord>();

  constructor(initial: readonly SavedItemRecord[] = []) {
    for (const value of initial) this.values.set(key(value.customerId, value.skuId), { ...value });
  }

  listByCustomer(customerId: string) {
    return Promise.resolve(
      [...this.values.values()]
        .filter((value) => value.customerId === customerId)
        .sort((left, right) => right.savedAt.localeCompare(left.savedAt)),
    );
  }

  save(value: SavedItemRecord) {
    this.values.set(key(value.customerId, value.skuId), { ...value });
    return Promise.resolve();
  }

  remove(customerId: string, skuId: string) {
    this.values.delete(key(customerId, skuId));
    return Promise.resolve();
  }
}

export class D1SavedItemsRepository implements SavedItemsRepository {
  constructor(private readonly database: CatalogDatabase) {}

  async listByCustomer(customerId: string) {
    const rows = await this.database
      .prepare(
        `SELECT customer_id, sku_id, saved_at
         FROM customer_saved_items
         WHERE customer_id = ?
         ORDER BY saved_at DESC, sku_id ASC`,
      )
      .bind(customerId)
      .all<SavedItemRow>();
    return rows.results.map((row) => ({
      customerId: row.customer_id,
      skuId: row.sku_id,
      savedAt: row.saved_at,
    }));
  }

  async save(value: SavedItemRecord) {
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO customer_saved_items (customer_id, sku_id, saved_at)
         VALUES (?, ?, ?)
         ON CONFLICT(customer_id, sku_id) DO UPDATE SET saved_at = excluded.saved_at`,
        )
        .bind(value.customerId, value.skuId, value.savedAt),
    ]);
  }

  async remove(customerId: string, skuId: string) {
    await this.database.batch([
      this.database
        .prepare("DELETE FROM customer_saved_items WHERE customer_id = ? AND sku_id = ?")
        .bind(customerId, skuId),
    ]);
  }
}

type SavedItemRow = Record<string, unknown> & {
  customer_id: string;
  sku_id: string;
  saved_at: string;
};

function key(customerId: string, skuId: string) {
  return `${customerId}\u0000${skuId}`;
}
