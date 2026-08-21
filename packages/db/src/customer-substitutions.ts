import { createCustomerOrderSubstitution, type CustomerOrderSubstitution } from "@carbon/domain";
import type { CatalogDatabase } from "./catalog.js";

export interface CustomerOrderSubstitutionRepository {
  listByCustomer(customerId: string): Promise<readonly CustomerOrderSubstitution[]>;
  findById(customerId: string, id: string): Promise<CustomerOrderSubstitution | null>;
  findByIdempotency(
    customerId: string,
    idempotencyKey: string,
  ): Promise<CustomerOrderSubstitution | null>;
  save(value: CustomerOrderSubstitution): Promise<void>;
}

export class InMemoryCustomerOrderSubstitutionRepository implements CustomerOrderSubstitutionRepository {
  private readonly values = new Map<string, CustomerOrderSubstitution>();
  constructor(initial: readonly CustomerOrderSubstitution[] = []) {
    for (const value of initial) {
      this.values.set(value.id, createCustomerOrderSubstitution(value));
    }
  }
  listByCustomer(customerId: string) {
    return Promise.resolve(
      [...this.values.values()]
        .filter((value) => value.customerId === customerId)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    );
  }
  findById(customerId: string, id: string) {
    const value = this.values.get(id);
    return Promise.resolve(value?.customerId === customerId ? value : null);
  }
  findByIdempotency(customerId: string, idempotencyKey: string) {
    return Promise.resolve(
      [...this.values.values()].find(
        (value) => value.customerId === customerId && value.idempotencyKey === idempotencyKey,
      ) ?? null,
    );
  }
  save(value: CustomerOrderSubstitution) {
    this.values.set(value.id, createCustomerOrderSubstitution(value));
    return Promise.resolve();
  }
}

export class D1CustomerOrderSubstitutionRepository implements CustomerOrderSubstitutionRepository {
  constructor(private readonly database: CatalogDatabase) {}
  async listByCustomer(customerId: string) {
    const rows = await this.database
      .prepare(
        `SELECT id, customer_id, order_id, shortage_id, original_sku_id, procurement_substitution_id, substitute_sku_id, quantity, status, idempotency_key, request_fingerprint, decided_at, created_at, updated_at FROM customer_order_substitutions WHERE customer_id = ? ORDER BY updated_at DESC`,
      )
      .bind(customerId)
      .all<Row>();
    return rows.results.map(mapRow);
  }
  async findById(customerId: string, id: string) {
    const rows = await this.database
      .prepare(
        `SELECT id, customer_id, order_id, shortage_id, original_sku_id, procurement_substitution_id, substitute_sku_id, quantity, status, idempotency_key, request_fingerprint, decided_at, created_at, updated_at FROM customer_order_substitutions WHERE customer_id = ? AND id = ? LIMIT 1`,
      )
      .bind(customerId, id)
      .all<Row>();
    return rows.results[0] ? mapRow(rows.results[0]) : null;
  }
  async findByIdempotency(customerId: string, idempotencyKey: string) {
    const rows = await this.database
      .prepare(
        `SELECT id, customer_id, order_id, shortage_id, original_sku_id, procurement_substitution_id, substitute_sku_id, quantity, status, idempotency_key, request_fingerprint, decided_at, created_at, updated_at FROM customer_order_substitutions WHERE customer_id = ? AND idempotency_key = ? LIMIT 1`,
      )
      .bind(customerId, idempotencyKey)
      .all<Row>();
    return rows.results[0] ? mapRow(rows.results[0]) : null;
  }
  async save(value: CustomerOrderSubstitution) {
    const normalized = createCustomerOrderSubstitution(value);
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO customer_order_substitutions (id, customer_id, order_id, shortage_id, original_sku_id, procurement_substitution_id, substitute_sku_id, quantity, status, idempotency_key, request_fingerprint, decided_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET status = excluded.status, request_fingerprint = excluded.request_fingerprint, idempotency_key = excluded.idempotency_key, decided_at = excluded.decided_at, updated_at = excluded.updated_at`,
        )
        .bind(
          normalized.id,
          normalized.customerId,
          normalized.orderId,
          normalized.shortageId,
          normalized.originalSkuId,
          normalized.procurementSubstitutionId,
          normalized.substituteSkuId,
          normalized.quantity,
          normalized.status,
          normalized.idempotencyKey,
          normalized.requestFingerprint,
          normalized.decidedAt,
          normalized.createdAt,
          normalized.updatedAt,
        ),
    ]);
  }
}

type Row = {
  id: string;
  customer_id: string;
  order_id: string;
  shortage_id: string;
  original_sku_id: string;
  procurement_substitution_id: string;
  substitute_sku_id: string;
  quantity: number;
  status: "pending" | "accepted" | "rejected";
  decided_at: string | null;
  created_at: string;
  updated_at: string;
  idempotency_key: string | null;
  request_fingerprint: string | null;
};
function mapRow(row: Row) {
  return createCustomerOrderSubstitution({
    id: row.id,
    customerId: row.customer_id,
    orderId: row.order_id,
    shortageId: row.shortage_id,
    originalSkuId: row.original_sku_id,
    procurementSubstitutionId: row.procurement_substitution_id,
    substituteSkuId: row.substitute_sku_id,
    quantity: row.quantity,
    status: row.status,
    idempotencyKey: row.idempotency_key,
    requestFingerprint: row.request_fingerprint,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
