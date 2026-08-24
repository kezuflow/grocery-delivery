import { describe, expect, it } from "vitest";

import type { AuditEvent, CatalogCategory } from "@carbon/domain";

import {
  CatalogAdminConflictError,
  CatalogAdminNotFoundError,
  CatalogAdminService,
  type CatalogAdminCommand,
  type CatalogAdminCommandRepository,
  type CatalogAdminItem,
} from "./catalog-admin.js";

class InMemoryCatalogAdminRepository implements CatalogAdminCommandRepository {
  readonly categories = new Map<string, CatalogCategory>();
  readonly items = new Map<string, CatalogAdminItem>();
  readonly commands = new Map<string, CatalogAdminCommand>();
  readonly audits: AuditEvent[] = [];

  list() {
    return Promise.resolve({
      categories: [...this.categories.values()],
      items: [...this.items.values()],
    });
  }

  findCommand(idempotencyKey: string) {
    return Promise.resolve(this.commands.get(idempotencyKey) ?? null);
  }

  findCategoryById(id: string) {
    return Promise.resolve(this.categories.get(id) ?? null);
  }

  findCategoryBySlug(slug: string) {
    return Promise.resolve(
      [...this.categories.values()].find((category) => category.slug === slug) ?? null,
    );
  }

  findSkuById(id: string) {
    return Promise.resolve(this.items.get(id) ?? null);
  }

  findSkuBySlug(slug: string) {
    return Promise.resolve([...this.items.values()].find((item) => item.slug === slug) ?? null);
  }

  applyCategory(command: CatalogAdminCommand, auditEvent: AuditEvent) {
    if (command.result.kind !== "category") throw new Error("category result required");
    this.categories.set(command.result.category.id, command.result.category);
    this.commands.set(command.idempotencyKey, command);
    this.audits.push(auditEvent);
    return Promise.resolve();
  }

  applySku(command: CatalogAdminCommand, auditEvent: AuditEvent) {
    if (command.result.kind !== "sku") throw new Error("SKU result required");
    this.items.set(command.result.item.id, command.result.item);
    this.commands.set(command.idempotencyKey, command);
    this.audits.push(auditEvent);
    return Promise.resolve();
  }
}

const context = {
  actorUserId: "admin-1",
  correlationId: "correlation-1",
  idempotencyKey: "catalog-command-1",
  appliedAt: "2026-08-24T02:00:00.000Z",
};

describe("CatalogAdminService", () => {
  it("creates a customer-friendly category and safely replays the same command", async () => {
    const repository = new InMemoryCatalogAdminRepository();
    const service = new CatalogAdminService(repository, () => "generated-1");

    const created = await service.upsertCategory(context, {
      name: "Fresh Produce",
      active: true,
    });
    const replayed = await service.upsertCategory(context, {
      name: "Fresh Produce",
      active: true,
    });

    expect(created).toMatchObject({ replayed: false, category: { slug: "fresh-produce" } });
    expect(replayed).toMatchObject({ replayed: true, category: created.category });
    expect(repository.audits).toHaveLength(1);
  });

  it("rejects an idempotency key reused for a different category change", async () => {
    const repository = new InMemoryCatalogAdminRepository();
    const service = new CatalogAdminService(repository, () => "generated-1");
    await service.upsertCategory(context, { name: "Fresh Produce", active: true });

    await expect(
      service.upsertCategory(context, { name: "Pantry", active: true }),
    ).rejects.toBeInstanceOf(CatalogAdminConflictError);
  });

  it("derives the selling price on the server and stores the lifecycle status", async () => {
    const repository = new InMemoryCatalogAdminRepository();
    const service = new CatalogAdminService(repository, () => "generated-1");
    const category = await service.upsertCategory(context, {
      name: "Fresh Produce",
      active: true,
    });

    const result = await service.upsertSku(
      { ...context, idempotencyKey: "catalog-command-2" },
      {
        categoryId: category.category.id,
        name: "Roma Tomatoes",
        description: "Fresh local tomatoes.",
        unit: "kilogram",
        imageUrl: "/marketplace/tomatoes.webp",
        procurementCostCentavos: 10_000,
        markupBasisPoints: 2_500,
        status: "paused",
      },
    );

    expect(result.item).toMatchObject({
      price: { centavos: 12_500, currency: "PHP" },
      status: "paused",
      active: false,
      slug: "roma-tomatoes",
    });
  });

  it("rejects updates for missing catalog records", async () => {
    const service = new CatalogAdminService(new InMemoryCatalogAdminRepository());

    await expect(
      service.upsertCategory(context, { id: "missing", name: "Missing", active: true }),
    ).rejects.toBeInstanceOf(CatalogAdminNotFoundError);
  });
});
