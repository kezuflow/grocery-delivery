import { createCustomerOrderRequest, type CustomerOrderRequest } from "@carbon/domain";
import type { CatalogDatabase } from "./catalog.js";

export interface CustomerOrderRequestRepository {
  listByCustomer(customerId: string): Promise<readonly CustomerOrderRequest[]>;
  findByIdempotency(
    customerId: string,
    idempotencyKey: string,
  ): Promise<CustomerOrderRequest | null>;
  save(request: CustomerOrderRequest): Promise<void>;
}

export class InMemoryCustomerOrderRequestRepository implements CustomerOrderRequestRepository {
  private readonly requests = new Map<string, CustomerOrderRequest>();
  constructor(initial: readonly CustomerOrderRequest[] = []) {
    for (const request of initial)
      this.requests.set(request.id, createCustomerOrderRequest(request));
  }
  listByCustomer(customerId: string) {
    return Promise.resolve(
      [...this.requests.values()]
        .filter((request) => request.customerId === customerId)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    );
  }
  findByIdempotency(customerId: string, idempotencyKey: string) {
    return Promise.resolve(
      [...this.requests.values()].find(
        (request) => request.customerId === customerId && request.idempotencyKey === idempotencyKey,
      ) ?? null,
    );
  }
  save(request: CustomerOrderRequest) {
    this.requests.set(request.id, createCustomerOrderRequest(request));
    return Promise.resolve();
  }
}

export class D1CustomerOrderRequestRepository implements CustomerOrderRequestRepository {
  constructor(private readonly database: CatalogDatabase) {}

  async listByCustomer(customerId: string) {
    const rows = await this.database
      .prepare(
        `SELECT id, customer_id, order_id, kind, reason, status, idempotency_key,
                request_fingerprint, created_at, updated_at
         FROM customer_order_requests WHERE customer_id = ? ORDER BY updated_at DESC, id DESC`,
      )
      .bind(customerId)
      .all<CustomerOrderRequestRow>();
    return rows.results.map(mapRequest);
  }

  async findByIdempotency(customerId: string, idempotencyKey: string) {
    const rows = await this.database
      .prepare(
        `SELECT id, customer_id, order_id, kind, reason, status, idempotency_key,
                request_fingerprint, created_at, updated_at
         FROM customer_order_requests WHERE customer_id = ? AND idempotency_key = ? LIMIT 1`,
      )
      .bind(customerId, idempotencyKey)
      .all<CustomerOrderRequestRow>();
    return rows.results[0] ? mapRequest(rows.results[0]) : null;
  }

  async save(request: CustomerOrderRequest) {
    const value = createCustomerOrderRequest(request);
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO customer_order_requests (
             id, customer_id, order_id, kind, reason, status, idempotency_key,
             request_fingerprint, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(customer_id, idempotency_key) DO NOTHING`,
        )
        .bind(
          value.id,
          value.customerId,
          value.orderId,
          value.kind,
          value.reason,
          value.status,
          value.idempotencyKey,
          value.requestFingerprint,
          value.createdAt,
          value.updatedAt,
        ),
    ]);
  }
}

type CustomerOrderRequestRow = {
  id: string;
  customer_id: string;
  order_id: string;
  kind: CustomerOrderRequest["kind"];
  reason: string;
  status: CustomerOrderRequest["status"];
  idempotency_key: string;
  request_fingerprint: string;
  created_at: string;
  updated_at: string;
};

function mapRequest(row: CustomerOrderRequestRow) {
  return createCustomerOrderRequest({
    id: row.id,
    customerId: row.customer_id,
    orderId: row.order_id,
    kind: row.kind,
    reason: row.reason,
    status: row.status,
    idempotencyKey: row.idempotency_key,
    requestFingerprint: row.request_fingerprint,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
