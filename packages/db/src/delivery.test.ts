import { describe, expect, it } from "vitest";

import type { CatalogDatabase, CatalogPreparedStatement } from "./catalog.js";
import { D1DeliveryAddressRepository, InMemoryDeliveryAddressRepository } from "./delivery.js";

const address = {
  customerId: "customer-1",
  recipientName: "Maria Santos",
  phone: "+639171234567",
  line1: "12 Green Street",
  line2: null,
  barangay: "Bagong Pagasa",
  city: "Quezon City",
  province: "Metro Manila",
  postalCode: "1105",
  instructions: null,
  createdAt: "2026-08-19T00:00:00.000Z",
  updatedAt: "2026-08-19T00:00:00.000Z",
} as const;

describe("delivery address repositories", () => {
  it("stores one address per customer in memory", async () => {
    const repository = new InMemoryDeliveryAddressRepository();
    await repository.save(address);
    await expect(repository.findByCustomerId("customer-1")).resolves.toEqual(address);
  });

  it("maps and upserts a D1 delivery address", async () => {
    const database = new FakeDeliveryDatabase([
      [
        {
          customer_id: address.customerId,
          recipient_name: address.recipientName,
          phone: address.phone,
          line1: address.line1,
          line2: address.line2,
          barangay: address.barangay,
          city: address.city,
          province: address.province,
          postal_code: address.postalCode,
          instructions: address.instructions,
          created_at: address.createdAt,
          updated_at: address.updatedAt,
        },
      ],
    ]);
    const repository = new D1DeliveryAddressRepository(database);

    await expect(repository.findByCustomerId("customer-1")).resolves.toEqual(address);
    await repository.save(address);

    expect(database.batches).toHaveLength(1);
    expect(database.calls.some((call) => call.sql.includes("ON CONFLICT(customer_id)"))).toBe(true);
    expect(database.calls.some((call) => call.sql.includes("delivery_address_book"))).toBe(true);
    expect(database.calls.at(-1)?.values).not.toContain("another-customer");
  });
});

class FakeDeliveryDatabase implements CatalogDatabase {
  readonly calls: Array<{ sql: string; values: unknown[] }> = [];
  readonly batches: Array<readonly CatalogPreparedStatement[]> = [];

  constructor(private readonly results: readonly (readonly Record<string, unknown>[])[]) {}

  prepare(sql: string): CatalogPreparedStatement {
    const call = { sql, values: [] as unknown[] };
    this.calls.push(call);
    const result = this.results[this.calls.length - 1] ?? [];
    const statement: CatalogPreparedStatement = {
      bind: (...values) => {
        call.values = values;
        return statement;
      },
      all: <T extends Record<string, unknown>>() =>
        Promise.resolve({ results: result as readonly T[] }),
    };
    return statement;
  }

  batch(statements: readonly CatalogPreparedStatement[]): Promise<readonly unknown[]> {
    this.batches.push(statements);
    return Promise.resolve([]);
  }
}
