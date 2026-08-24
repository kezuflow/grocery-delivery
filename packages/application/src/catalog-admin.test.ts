import { describe, expect, it } from "vitest";

import type { AuditEvent, CatalogCategory } from "@carbon/domain";

import {
  CatalogAdminConflictError,
  CatalogAdminNotFoundError,
  CatalogAdminService,
  type CatalogAdminCommand,
  type CatalogAdminCommandRepository,
  type CatalogAdminItem,
  type CatalogAdminImage,
} from "./catalog-admin.js";

class InMemoryCatalogAdminRepository implements CatalogAdminCommandRepository {
  readonly categories = new Map<string, CatalogCategory>();
  readonly items = new Map<string, CatalogAdminItem>();
  readonly images = new Map<string, CatalogAdminImage>();
  readonly commands = new Map<string, CatalogAdminCommand>();
  readonly audits: AuditEvent[] = [];

  list() {
    return Promise.resolve({
      categories: [...this.categories.values()],
      items: [...this.items.values()],
      images: [...this.images.values()],
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

  findImageById(id: string) {
    return Promise.resolve(this.images.get(id) ?? null);
  }

  applyCategory(command: CatalogAdminCommand, auditEvent: AuditEvent) {
    if (command.result.kind !== "category") throw new Error("category result required");
    this.categories.set(command.result.category.id, command.result.category);
    this.commands.set(command.idempotencyKey, command);
    this.audits.push(auditEvent);
    return Promise.resolve();
  }

  applyCategoryItems(command: CatalogAdminCommand, auditEvent: AuditEvent) {
    if (command.result.kind !== "categoryItems") throw new Error("category items result required");
    for (const item of command.result.items) this.items.set(item.id, item);
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

  applyImage(command: CatalogAdminCommand, auditEvent: AuditEvent) {
    if (command.result.kind !== "image") throw new Error("image result required");
    this.images.set(command.result.image.id, command.result.image);
    this.commands.set(command.idempotencyKey, command);
    this.audits.push(auditEvent);
    return Promise.resolve();
  }

  markImageReady(id: string) {
    const image = this.images.get(id);
    if (!image) return Promise.resolve(null);
    const ready = { ...image, status: "ready" as const };
    this.images.set(id, ready);
    return Promise.resolve(ready);
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
    let generatedId = 0;
    const service = new CatalogAdminService(repository, () => `generated-${++generatedId}`);
    const category = await service.upsertCategory(context, {
      name: "Fresh Produce",
      active: true,
    });
    const secondCategory = await service.upsertCategory(
      { ...context, idempotencyKey: "catalog-command-category-2" },
      { name: "Weekly Specials", active: true },
    );

    const result = await service.upsertSku(
      { ...context, idempotencyKey: "catalog-command-2" },
      {
        categoryIds: [category.category.id, secondCategory.category.id],
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
      categoryIds: [category.category.id, secondCategory.category.id],
    });
  });

  it("creates idempotent catalog image metadata for an R2 upload", async () => {
    const repository = new InMemoryCatalogAdminRepository();
    const service = new CatalogAdminService(repository, () => "generated-image");
    const input = {
      fileName: "tomatoes.webp",
      altText: "Roma tomatoes",
      contentType: "image/webp" as const,
      sizeBytes: 12_000,
    };

    const created = await service.createImage(context, input);
    const replayed = await service.createImage(context, input);

    expect(created).toMatchObject({
      replayed: false,
      image: {
        id: "image-generated-image",
        objectKey: "catalog/image-generated-image.webp",
        status: "pending",
        url: "/api/v1/catalog/images/image-generated-image",
      },
    });
    expect(replayed).toMatchObject({ replayed: true, image: created.image });
  });

  it("assigns existing products to a category and replays the batch safely", async () => {
    const repository = new InMemoryCatalogAdminRepository();
    let generatedId = 0;
    const service = new CatalogAdminService(repository, () => `generated-${++generatedId}`);
    const produce = await service.upsertCategory(context, { name: "Produce", active: true });
    const specials = await service.upsertCategory(
      { ...context, idempotencyKey: "category-specials" },
      { name: "Specials", active: true },
    );
    const product = await service.upsertSku(
      { ...context, idempotencyKey: "product-tomatoes" },
      {
        categoryIds: [produce.category.id],
        name: "Tomatoes",
        description: "Fresh tomatoes",
        unit: "kilogram",
        imageUrl: null,
        procurementCostCentavos: 10_000,
        markupBasisPoints: 2_000,
        status: "active",
      },
    );
    const assignmentContext = { ...context, idempotencyKey: "assign-specials" };

    const assigned = await service.assignCategoryItems(assignmentContext, {
      categoryId: specials.category.id,
      itemIds: [product.item.id, product.item.id],
    });
    const replayed = await service.assignCategoryItems(assignmentContext, {
      categoryId: specials.category.id,
      itemIds: [product.item.id, product.item.id],
    });

    expect(assigned).toMatchObject({
      replayed: false,
      items: [{ categoryIds: [produce.category.id, specials.category.id] }],
    });
    expect(replayed).toMatchObject({ replayed: true, items: assigned.items });
    expect(repository.audits.at(-1)?.action).toBe("catalog.category.items-assigned");
  });

  it("rejects updates for missing catalog records", async () => {
    const service = new CatalogAdminService(new InMemoryCatalogAdminRepository());

    await expect(
      service.upsertCategory(context, { id: "missing", name: "Missing", active: true }),
    ).rejects.toBeInstanceOf(CatalogAdminNotFoundError);
    await expect(
      service.assignCategoryItems(context, { categoryId: "missing", itemIds: ["sku-missing"] }),
    ).rejects.toBeInstanceOf(CatalogAdminNotFoundError);
  });
});
