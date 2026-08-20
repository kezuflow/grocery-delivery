import type { CatalogDatabase } from "./catalog.js";

export type DeliveryMediaRecord = Readonly<{
  id: string;
  clientMediaId: string;
  orderId: string;
  assignmentId: string;
  uploadedByUserId: string;
  kind: "proof_of_delivery";
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}>;

export interface DeliveryMediaRepository {
  save(record: DeliveryMediaRecord): Promise<DeliveryMediaRecord>;
  findByClientId(clientMediaId: string): Promise<DeliveryMediaRecord | null>;
  listForCustomer(orderId: string, customerId: string): Promise<readonly DeliveryMediaRecord[]>;
  listCreatedBefore?(cutoff: string, limit: number): Promise<readonly DeliveryMediaRecord[]>;
  deleteById?(id: string): Promise<boolean>;
}

export class InMemoryDeliveryMediaRepository implements DeliveryMediaRepository {
  private readonly values = new Map<string, DeliveryMediaRecord>();

  save(record: DeliveryMediaRecord) {
    const existing = this.values.get(record.clientMediaId);
    if (existing) return Promise.resolve(existing);
    this.values.set(record.clientMediaId, Object.freeze({ ...record }));
    return Promise.resolve(record);
  }

  findByClientId(clientMediaId: string) {
    return Promise.resolve(this.values.get(clientMediaId) ?? null);
  }

  listForCustomer(orderId: string, customerId: string) {
    if (!customerId.trim()) return Promise.resolve([] as readonly DeliveryMediaRecord[]);
    return Promise.resolve([...this.values.values()].filter((item) => item.orderId === orderId));
  }

  listCreatedBefore(cutoff: string, limit: number) {
    return Promise.resolve(
      [...this.values.values()]
        .filter((item) => item.createdAt < cutoff)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
        .slice(0, limit),
    );
  }

  deleteById(id: string) {
    const entry = [...this.values.entries()].find(([, value]) => value.id === id);
    return Promise.resolve(entry ? this.values.delete(entry[0]) : false);
  }
}

export class D1DeliveryMediaRepository implements DeliveryMediaRepository {
  constructor(private readonly database: CatalogDatabase) {}

  async save(record: DeliveryMediaRecord) {
    await this.database.batch([
      this.database
        .prepare(
          `INSERT OR IGNORE INTO delivery_media (id, client_media_id, order_id, assignment_id, uploaded_by_user_id, kind, object_key, content_type, size_bytes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          record.id,
          record.clientMediaId,
          record.orderId,
          record.assignmentId,
          record.uploadedByUserId,
          record.kind,
          record.objectKey,
          record.contentType,
          record.sizeBytes,
          record.createdAt,
        ),
    ]);
    const existing = await this.findByClientId(record.clientMediaId);
    if (!existing) throw new Error("delivery media was not accepted");
    return existing;
  }

  async findByClientId(clientMediaId: string) {
    const rows = await this.database
      .prepare(
        `SELECT id, client_media_id, order_id, assignment_id, uploaded_by_user_id, kind, object_key, content_type, size_bytes, created_at FROM delivery_media WHERE client_media_id = ? LIMIT 1`,
      )
      .bind(clientMediaId)
      .all<MediaRow>();
    return rows.results[0] ? mapMedia(rows.results[0]) : null;
  }

  async listForCustomer(orderId: string, customerId: string) {
    const rows = await this.database
      .prepare(
        `SELECT m.id, m.client_media_id, m.order_id, m.assignment_id, m.uploaded_by_user_id, m.kind, m.object_key, m.content_type, m.size_bytes, m.created_at FROM delivery_media m JOIN orders o ON o.id = m.order_id WHERE m.order_id = ? AND o.customer_id = ? ORDER BY m.created_at`,
      )
      .bind(orderId, customerId)
      .all<MediaRow>();
    return rows.results.map(mapMedia);
  }

  async listCreatedBefore(cutoff: string, limit: number) {
    const rows = await this.database
      .prepare(
        `SELECT id, client_media_id, order_id, assignment_id, uploaded_by_user_id, kind, object_key, content_type, size_bytes, created_at
         FROM delivery_media WHERE created_at < ? ORDER BY created_at LIMIT ?`,
      )
      .bind(cutoff, limit)
      .all<MediaRow>();
    return rows.results.map(mapMedia);
  }

  async deleteById(id: string) {
    await this.database.batch([
      this.database.prepare(`DELETE FROM delivery_media WHERE id = ?`).bind(id),
    ]);
    const rows = await this.database
      .prepare(`SELECT id FROM delivery_media WHERE id = ? LIMIT 1`)
      .bind(id)
      .all<{ id: string }>();
    return rows.results.length === 0;
  }
}

type MediaRow = {
  id: string;
  client_media_id: string;
  order_id: string;
  assignment_id: string;
  uploaded_by_user_id: string;
  kind: "proof_of_delivery";
  object_key: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
};
const mapMedia = (row: MediaRow): DeliveryMediaRecord => ({
  id: row.id,
  clientMediaId: row.client_media_id,
  orderId: row.order_id,
  assignmentId: row.assignment_id,
  uploadedByUserId: row.uploaded_by_user_id,
  kind: row.kind,
  objectKey: row.object_key,
  contentType: row.content_type,
  sizeBytes: row.size_bytes,
  createdAt: row.created_at,
});
