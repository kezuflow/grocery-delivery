import { createDeliveryAddress, type DeliveryAddress } from "@carbon/domain";

import type { CatalogDatabase } from "./catalog.js";

export type DeliveryDatabase = CatalogDatabase;

export interface DeliveryAddressRepository {
  findByCustomerId(customerId: string): Promise<DeliveryAddress | null>;
  save(address: DeliveryAddress): Promise<void>;
}

export class InMemoryDeliveryAddressRepository implements DeliveryAddressRepository {
  private readonly addresses = new Map<string, DeliveryAddress>();

  constructor(initial: readonly DeliveryAddress[] = []) {
    for (const address of initial)
      this.addresses.set(address.customerId, createDeliveryAddress(address));
  }

  findByCustomerId(customerId: string): Promise<DeliveryAddress | null> {
    return Promise.resolve(this.addresses.get(customerId) ?? null);
  }

  save(address: DeliveryAddress): Promise<void> {
    const normalized = createDeliveryAddress(address);
    this.addresses.set(normalized.customerId, normalized);
    return Promise.resolve();
  }
}

export class D1DeliveryAddressRepository implements DeliveryAddressRepository {
  constructor(private readonly database: DeliveryDatabase) {}

  async findByCustomerId(customerId: string): Promise<DeliveryAddress | null> {
    const rows = await this.database
      .prepare(
        `SELECT customer_id, recipient_name, phone, line1, line2, barangay, city, province,
                postal_code, instructions, created_at, updated_at
         FROM delivery_addresses WHERE customer_id = ? LIMIT 1`,
      )
      .bind(customerId)
      .all<DeliveryAddressRow>();
    const row = rows.results[0];
    return row ? mapAddress(row) : null;
  }

  async save(address: DeliveryAddress): Promise<void> {
    const normalized = createDeliveryAddress(address);
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO delivery_addresses (
           customer_id, recipient_name, phone, line1, line2, barangay, city, province,
           postal_code, instructions, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(customer_id) DO UPDATE SET
           recipient_name = excluded.recipient_name,
           phone = excluded.phone,
           line1 = excluded.line1,
           line2 = excluded.line2,
           barangay = excluded.barangay,
           city = excluded.city,
           province = excluded.province,
           postal_code = excluded.postal_code,
           instructions = excluded.instructions,
           updated_at = excluded.updated_at`,
        )
        .bind(
          normalized.customerId,
          normalized.recipientName,
          normalized.phone,
          normalized.line1,
          normalized.line2,
          normalized.barangay,
          normalized.city,
          normalized.province,
          normalized.postalCode,
          normalized.instructions,
          normalized.createdAt,
          normalized.updatedAt,
        ),
    ]);
  }
}

type DeliveryAddressRow = Record<string, unknown> & {
  customer_id: string;
  recipient_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  barangay: string;
  city: string;
  province: string;
  postal_code: string;
  instructions: string | null;
  created_at: string;
  updated_at: string;
};

function mapAddress(row: DeliveryAddressRow): DeliveryAddress {
  return createDeliveryAddress({
    customerId: row.customer_id,
    recipientName: row.recipient_name,
    phone: row.phone,
    line1: row.line1,
    line2: row.line2,
    barangay: row.barangay,
    city: row.city,
    province: row.province,
    postalCode: row.postal_code,
    instructions: row.instructions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
