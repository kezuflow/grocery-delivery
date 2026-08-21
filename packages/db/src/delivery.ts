import { createDeliveryAddress, type DeliveryAddress } from "@carbon/domain";

import type { CatalogDatabase, CatalogPreparedStatement } from "./catalog.js";

export type DeliveryDatabase = CatalogDatabase;

export type SavedDeliveryAddress = Readonly<{
  id: string;
  address: DeliveryAddress;
  selected: boolean;
}>;

export interface DeliveryAddressRepository {
  findByCustomerId(customerId: string): Promise<DeliveryAddress | null>;
  listByCustomer(customerId: string): Promise<readonly SavedDeliveryAddress[]>;
  save(address: DeliveryAddress): Promise<void>;
  saveAddress(address: SavedDeliveryAddress): Promise<void>;
  select(customerId: string, addressId: string, updatedAt: string): Promise<boolean>;
}

export class InMemoryDeliveryAddressRepository implements DeliveryAddressRepository {
  private readonly addresses = new Map<string, SavedDeliveryAddress>();

  constructor(initial: readonly DeliveryAddress[] = []) {
    for (const address of initial) {
      const normalized = createDeliveryAddress(address);
      this.addresses.set(`${normalized.customerId}:default`, {
        id: `${normalized.customerId}:default`,
        address: normalized,
        selected: true,
      });
    }
  }

  findByCustomerId(customerId: string): Promise<DeliveryAddress | null> {
    return Promise.resolve(
      [...this.addresses.values()].find(
        (saved) => saved.address.customerId === customerId && saved.selected,
      )?.address ?? null,
    );
  }

  listByCustomer(customerId: string): Promise<readonly SavedDeliveryAddress[]> {
    return Promise.resolve(
      [...this.addresses.values()]
        .filter((saved) => saved.address.customerId === customerId)
        .sort((left, right) => Number(right.selected) - Number(left.selected)),
    );
  }

  save(address: DeliveryAddress): Promise<void> {
    const normalized = createDeliveryAddress(address);
    const selectedId =
      [...this.addresses.values()].find(
        (saved) => saved.address.customerId === normalized.customerId && saved.selected,
      )?.id ?? `${normalized.customerId}:default`;
    for (const [id, saved] of this.addresses) {
      if (saved.address.customerId === normalized.customerId) {
        this.addresses.set(id, { ...saved, selected: false });
      }
    }
    this.addresses.set(selectedId, {
      id: selectedId,
      address: normalized,
      selected: true,
    });
    return Promise.resolve();
  }

  saveAddress(saved: SavedDeliveryAddress): Promise<void> {
    const normalized = createDeliveryAddress(saved.address);
    if (saved.selected) {
      for (const [id, existing] of this.addresses) {
        if (existing.address.customerId === normalized.customerId) {
          this.addresses.set(id, { ...existing, selected: false });
        }
      }
    }
    this.addresses.set(saved.id, { id: saved.id, address: normalized, selected: saved.selected });
    return Promise.resolve();
  }

  select(customerId: string, addressId: string, updatedAt: string): Promise<boolean> {
    const target = this.addresses.get(addressId);
    if (!target || target.address.customerId !== customerId) return Promise.resolve(false);
    for (const [id, saved] of this.addresses) {
      if (saved.address.customerId === customerId) {
        this.addresses.set(id, {
          ...saved,
          address: {
            ...saved.address,
            updatedAt: id === addressId ? updatedAt : saved.address.updatedAt,
          },
          selected: id === addressId,
        });
      }
    }
    return Promise.resolve(true);
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

  async listByCustomer(customerId: string): Promise<readonly SavedDeliveryAddress[]> {
    const rows = await this.database
      .prepare(
        `SELECT id, customer_id, recipient_name, phone, line1, line2, barangay, city, province,
                postal_code, instructions, is_selected, created_at, updated_at
         FROM delivery_address_book WHERE customer_id = ?
         ORDER BY is_selected DESC, updated_at DESC, id ASC`,
      )
      .bind(customerId)
      .all<SavedDeliveryAddressRow>();
    return rows.results.map(mapSavedAddress);
  }

  async save(address: DeliveryAddress): Promise<void> {
    const normalized = createDeliveryAddress(address);
    const selectedId =
      (await this.listByCustomer(normalized.customerId)).find((saved) => saved.selected)?.id ??
      `${normalized.customerId}:default`;
    await this.database.batch([
      this.database
        .prepare(`UPDATE delivery_address_book SET is_selected = 0 WHERE customer_id = ?`)
        .bind(normalized.customerId),
      this.database
        .prepare(
          `INSERT INTO delivery_address_book (
             id, customer_id, recipient_name, phone, line1, line2, barangay, city, province,
             postal_code, instructions, is_selected, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             recipient_name = excluded.recipient_name, phone = excluded.phone,
             line1 = excluded.line1, line2 = excluded.line2, barangay = excluded.barangay,
             city = excluded.city, province = excluded.province, postal_code = excluded.postal_code,
             instructions = excluded.instructions, is_selected = 1, updated_at = excluded.updated_at`,
        )
        .bind(
          selectedId,
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
      legacyAddressStatement(this.database, normalized),
    ]);
  }

  async saveAddress(saved: SavedDeliveryAddress): Promise<void> {
    const normalized = createDeliveryAddress(saved.address);
    const statements: CatalogPreparedStatement[] = [];
    if (saved.selected) {
      statements.push(
        this.database
          .prepare(`UPDATE delivery_address_book SET is_selected = 0 WHERE customer_id = ?`)
          .bind(normalized.customerId),
      );
    }
    statements.push(
      this.database
        .prepare(
          `INSERT INTO delivery_address_book (
             id, customer_id, recipient_name, phone, line1, line2, barangay, city, province,
             postal_code, instructions, is_selected, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             recipient_name = excluded.recipient_name, phone = excluded.phone,
             line1 = excluded.line1, line2 = excluded.line2, barangay = excluded.barangay,
             city = excluded.city, province = excluded.province, postal_code = excluded.postal_code,
             instructions = excluded.instructions, is_selected = excluded.is_selected,
             updated_at = excluded.updated_at`,
        )
        .bind(
          saved.id,
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
          saved.selected ? 1 : 0,
          normalized.createdAt,
          normalized.updatedAt,
        ),
    );
    if (saved.selected) {
      statements.push(
        this.database
          .prepare(
            `INSERT INTO delivery_addresses (
               customer_id, recipient_name, phone, line1, line2, barangay, city, province,
               postal_code, instructions, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(customer_id) DO UPDATE SET
               recipient_name = excluded.recipient_name, phone = excluded.phone,
               line1 = excluded.line1, line2 = excluded.line2, barangay = excluded.barangay,
               city = excluded.city, province = excluded.province, postal_code = excluded.postal_code,
               instructions = excluded.instructions, updated_at = excluded.updated_at`,
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
      );
    }
    await this.database.batch(statements);
  }

  async select(customerId: string, addressId: string, updatedAt: string): Promise<boolean> {
    const rows = await this.database
      .prepare(`SELECT id FROM delivery_address_book WHERE id = ? AND customer_id = ? LIMIT 1`)
      .bind(addressId, customerId)
      .all<{ id: string }>();
    if (!rows.results[0]) return false;
    await this.database.batch([
      this.database
        .prepare(`UPDATE delivery_address_book SET is_selected = 0 WHERE customer_id = ?`)
        .bind(customerId),
      this.database
        .prepare(`UPDATE delivery_address_book SET is_selected = 1, updated_at = ? WHERE id = ?`)
        .bind(updatedAt, addressId),
    ]);
    const selected = await this.listByCustomer(customerId);
    const address = selected.find((item) => item.id === addressId);
    if (address) {
      await this.database.batch([legacyAddressStatement(this.database, address.address)]);
    }
    return true;
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

type SavedDeliveryAddressRow = DeliveryAddressRow & {
  id: string;
  is_selected: number;
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

function mapSavedAddress(row: SavedDeliveryAddressRow): SavedDeliveryAddress {
  return {
    id: row.id,
    address: mapAddress(row),
    selected: row.is_selected === 1,
  };
}

function legacyAddressStatement(database: DeliveryDatabase, address: DeliveryAddress) {
  return database
    .prepare(
      `INSERT INTO delivery_addresses (
         customer_id, recipient_name, phone, line1, line2, barangay, city, province,
         postal_code, instructions, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(customer_id) DO UPDATE SET
         recipient_name = excluded.recipient_name, phone = excluded.phone,
         line1 = excluded.line1, line2 = excluded.line2, barangay = excluded.barangay,
         city = excluded.city, province = excluded.province, postal_code = excluded.postal_code,
         instructions = excluded.instructions, updated_at = excluded.updated_at`,
    )
    .bind(
      address.customerId,
      address.recipientName,
      address.phone,
      address.line1,
      address.line2,
      address.barangay,
      address.city,
      address.province,
      address.postalCode,
      address.instructions,
      address.createdAt,
      address.updatedAt,
    );
}
