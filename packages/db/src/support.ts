import type { CatalogDatabase } from "./catalog.js";

export type SupportCaseStatus = "open" | "in_progress" | "resolved";

export type SupportCase = Readonly<{
  id: string;
  customerId: string;
  subject: string;
  message: string;
  status: SupportCaseStatus;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}>;

export interface SupportCaseRepository {
  listByCustomer(customerId: string): Promise<readonly SupportCase[]>;
  listAll(): Promise<readonly SupportCase[]>;
  findByIdempotency(customerId: string, idempotencyKey: string): Promise<SupportCase | null>;
  save(caseRecord: SupportCase): Promise<void>;
  updateStatus(
    id: string,
    status: SupportCaseStatus,
    updatedAt: string,
  ): Promise<SupportCase | null>;
}

export class InMemorySupportCaseRepository implements SupportCaseRepository {
  private readonly cases = new Map<string, SupportCase>();

  constructor(initial: readonly SupportCase[] = []) {
    for (const item of initial) this.cases.set(item.id, Object.freeze({ ...item }));
  }

  listByCustomer(customerId: string) {
    return Promise.resolve(
      this.sorted([...this.cases.values()].filter((item) => item.customerId === customerId)),
    );
  }

  listAll() {
    return Promise.resolve(this.sorted([...this.cases.values()]));
  }

  findByIdempotency(customerId: string, idempotencyKey: string) {
    return Promise.resolve(
      [...this.cases.values()].find(
        (item) => item.customerId === customerId && item.idempotencyKey === idempotencyKey,
      ) ?? null,
    );
  }

  save(caseRecord: SupportCase) {
    this.cases.set(caseRecord.id, Object.freeze({ ...caseRecord }));
    return Promise.resolve();
  }

  updateStatus(id: string, status: SupportCaseStatus, updatedAt: string) {
    const existing = this.cases.get(id);
    if (!existing) return Promise.resolve(null);
    const updated = Object.freeze({ ...existing, status, updatedAt });
    this.cases.set(id, updated);
    return Promise.resolve(updated);
  }

  private sorted(items: SupportCase[]) {
    return items.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }
}

export class D1SupportCaseRepository implements SupportCaseRepository {
  constructor(private readonly database: CatalogDatabase) {}

  async listByCustomer(customerId: string) {
    return this.read("WHERE customer_id = ?", customerId);
  }

  async listAll() {
    return this.read();
  }

  async findByIdempotency(customerId: string, idempotencyKey: string) {
    const rows = await this.database
      .prepare(
        `SELECT id, customer_id, subject, message, status, idempotency_key, created_at, updated_at
         FROM support_cases WHERE customer_id = ? AND idempotency_key = ? LIMIT 1`,
      )
      .bind(customerId, idempotencyKey)
      .all<SupportCaseRow>();
    return rows.results[0] ? mapCase(rows.results[0]) : null;
  }

  async save(caseRecord: SupportCase) {
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO support_cases (id, customer_id, subject, message, status, idempotency_key, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(customer_id, idempotency_key) DO NOTHING`,
        )
        .bind(
          caseRecord.id,
          caseRecord.customerId,
          caseRecord.subject,
          caseRecord.message,
          caseRecord.status,
          caseRecord.idempotencyKey,
          caseRecord.createdAt,
          caseRecord.updatedAt,
        ),
    ]);
  }

  async updateStatus(id: string, status: SupportCaseStatus, updatedAt: string) {
    await this.database.batch([
      this.database
        .prepare("UPDATE support_cases SET status = ?, updated_at = ? WHERE id = ?")
        .bind(status, updatedAt, id),
    ]);
    const rows = await this.database
      .prepare(
        `SELECT id, customer_id, subject, message, status, idempotency_key, created_at, updated_at
         FROM support_cases WHERE id = ? LIMIT 1`,
      )
      .bind(id)
      .all<SupportCaseRow>();
    return rows.results[0] ? mapCase(rows.results[0]) : null;
  }

  private async read(where = "", ...values: unknown[]) {
    const rows = await this.database
      .prepare(
        `SELECT id, customer_id, subject, message, status, idempotency_key, created_at, updated_at
         FROM support_cases ${where} ORDER BY updated_at DESC, id DESC`,
      )
      .bind(...values)
      .all<SupportCaseRow>();
    return rows.results.map(mapCase);
  }
}

type SupportCaseRow = {
  id: string;
  customer_id: string;
  subject: string;
  message: string;
  status: SupportCaseStatus;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
};

function mapCase(row: SupportCaseRow): SupportCase {
  return {
    id: row.id,
    customerId: row.customer_id,
    subject: row.subject,
    message: row.message,
    status: row.status,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
