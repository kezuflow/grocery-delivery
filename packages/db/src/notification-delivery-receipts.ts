import type { CatalogDatabase } from "./catalog.js";

export type NotificationDeliveryReceipt = Readonly<{
  idempotencyKey: string;
  eventType: string;
  aggregateId: string;
  correlationId: string;
  providerReference: string | null;
  acceptedAt: string;
}>;

export interface NotificationDeliveryReceiptRepository {
  save(receipt: NotificationDeliveryReceipt): Promise<NotificationDeliveryReceipt>;
}

export class InMemoryNotificationDeliveryReceiptRepository implements NotificationDeliveryReceiptRepository {
  private readonly receipts = new Map<string, NotificationDeliveryReceipt>();

  save(receipt: NotificationDeliveryReceipt) {
    const existing = this.receipts.get(receipt.idempotencyKey);
    if (existing) return Promise.resolve(existing);
    this.receipts.set(receipt.idempotencyKey, Object.freeze({ ...receipt }));
    return Promise.resolve(receipt);
  }
}

export class D1NotificationDeliveryReceiptRepository implements NotificationDeliveryReceiptRepository {
  constructor(private readonly database: CatalogDatabase) {}

  async save(receipt: NotificationDeliveryReceipt) {
    await this.database.batch([
      this.database
        .prepare(
          `INSERT OR IGNORE INTO notification_delivery_receipts
             (idempotency_key, event_type, aggregate_id, correlation_id, provider_reference, accepted_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          receipt.idempotencyKey,
          receipt.eventType,
          receipt.aggregateId,
          receipt.correlationId,
          receipt.providerReference,
          receipt.acceptedAt,
        ),
    ]);
    const rows = await this.database
      .prepare(
        `SELECT idempotency_key, event_type, aggregate_id, correlation_id,
                provider_reference, accepted_at
         FROM notification_delivery_receipts WHERE idempotency_key = ? LIMIT 1`,
      )
      .bind(receipt.idempotencyKey)
      .all<ReceiptRow>();
    const row = rows.results[0];
    if (!row) throw new Error("notification delivery receipt was not persisted");
    return mapReceipt(row);
  }
}

type ReceiptRow = {
  idempotency_key: string;
  event_type: string;
  aggregate_id: string;
  correlation_id: string;
  provider_reference: string | null;
  accepted_at: string;
};

function mapReceipt(row: ReceiptRow): NotificationDeliveryReceipt {
  return {
    idempotencyKey: row.idempotency_key,
    eventType: row.event_type,
    aggregateId: row.aggregate_id,
    correlationId: row.correlation_id,
    providerReference: row.provider_reference,
    acceptedAt: row.accepted_at,
  };
}
