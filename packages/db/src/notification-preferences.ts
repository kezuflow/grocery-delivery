import type { CatalogDatabase } from "./catalog.js";

export type NotificationPreferences = Readonly<{
  customerId: string;
  deliveryUpdates: boolean;
  marketing: boolean;
  updatedAt: string;
}>;

export interface NotificationPreferencesRepository {
  get(customerId: string): Promise<NotificationPreferences | null>;
  save(value: NotificationPreferences): Promise<NotificationPreferences>;
}

export class InMemoryNotificationPreferencesRepository implements NotificationPreferencesRepository {
  private readonly values = new Map<string, NotificationPreferences>();

  constructor(initial: readonly NotificationPreferences[] = []) {
    for (const value of initial) this.values.set(value.customerId, Object.freeze({ ...value }));
  }

  get(customerId: string) {
    return Promise.resolve(this.values.get(customerId) ?? null);
  }

  save(value: NotificationPreferences) {
    const normalized = Object.freeze({ ...value });
    this.values.set(value.customerId, normalized);
    return Promise.resolve(normalized);
  }
}

export class D1NotificationPreferencesRepository implements NotificationPreferencesRepository {
  constructor(private readonly database: CatalogDatabase) {}

  async get(customerId: string) {
    const rows = await this.database
      .prepare(
        "SELECT customer_id, delivery_updates, marketing, updated_at FROM notification_preferences WHERE customer_id = ? LIMIT 1",
      )
      .bind(customerId)
      .all<PreferenceRow>();
    return rows.results[0] ? mapPreference(rows.results[0]) : null;
  }

  async save(value: NotificationPreferences) {
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO notification_preferences (customer_id, delivery_updates, marketing, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(customer_id) DO UPDATE SET delivery_updates = excluded.delivery_updates,
             marketing = excluded.marketing, updated_at = excluded.updated_at`,
        )
        .bind(
          value.customerId,
          value.deliveryUpdates ? 1 : 0,
          value.marketing ? 1 : 0,
          value.updatedAt,
        ),
    ]);
    return (await this.get(value.customerId))!;
  }
}

type PreferenceRow = {
  customer_id: string;
  delivery_updates: number;
  marketing: number;
  updated_at: string;
};

function mapPreference(row: PreferenceRow): NotificationPreferences {
  return {
    customerId: row.customer_id,
    deliveryUpdates: row.delivery_updates === 1,
    marketing: row.marketing === 1,
    updatedAt: row.updated_at,
  };
}
