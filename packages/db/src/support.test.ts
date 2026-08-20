import { describe, expect, it } from "vitest";

import { InMemorySupportCaseRepository } from "./support.js";

describe("support cases", () => {
  it("isolates customer reads and preserves idempotent lookups", async () => {
    const repository = new InMemorySupportCaseRepository();
    const record = {
      id: "case-1",
      customerId: "customer-1",
      subject: "Missing item",
      message: "The spinach was not included.",
      status: "open" as const,
      idempotencyKey: "support-1",
      createdAt: "2026-08-20T10:00:00.000Z",
      updatedAt: "2026-08-20T10:00:00.000Z",
    };
    await repository.save(record);
    await expect(repository.listByCustomer("customer-2")).resolves.toEqual([]);
    await expect(repository.findByIdempotency("customer-1", "support-1")).resolves.toEqual(record);
    await expect(
      repository.updateStatus("case-1", "resolved", "2026-08-20T11:00:00.000Z"),
    ).resolves.toMatchObject({ status: "resolved" });
  });
});
