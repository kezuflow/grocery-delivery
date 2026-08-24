import { readFile } from "node:fs/promises";
import { fileURLToPath, URL as NodeURL } from "node:url";

import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CatalogAdminService } from "@carbon/application";
import { D1CatalogAdminCommandRepository, D1CatalogReader } from "@carbon/db";

describe("D1 catalog administration integration", () => {
  let miniflare: Miniflare;
  let database: D1Database;
  let generatedId = 0;

  beforeAll(async () => {
    miniflare = new Miniflare({
      workers: [
        {
          config: {
            type: "worker",
            name: "catalog-api-test",
            compatibilityDate: "2026-08-18",
            manifest: {
              mainModule: "index.js",
              modules: {
                "index.js": {
                  type: "esm",
                  contents: "export default { fetch() { return new Response('ok'); } }",
                },
              },
            },
            env: { DB: { type: "d1", id: "catalog-test" } },
          },
        },
      ],
    });
    database = (await miniflare.getD1Database("DB")) as D1Database;
    for (const migration of [
      "0001_catalog.sql",
      "0007_identity.sql",
      "0041_catalog_admin_commands.sql",
      "0042_catalog_categories_images.sql",
    ]) {
      const sql = await readFile(
        fileURLToPath(new NodeURL(`../../../packages/db/migrations/${migration}`, import.meta.url)),
        "utf8",
      );
      for (const statement of sql
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)) {
        await database.prepare(statement).run();
      }
    }
  });

  afterAll(async () => {
    await miniflare?.dispose();
  });

  it("persists multiple category links and reusable image metadata", async () => {
    const service = new CatalogAdminService(
      new D1CatalogAdminCommandRepository(database),
      () => `generated-${++generatedId}`,
    );
    const baseContext = {
      actorUserId: "admin-1",
      correlationId: "catalog-integration",
      appliedAt: "2026-08-24T05:00:00.000Z",
    };
    const produce = await service.upsertCategory(
      { ...baseContext, idempotencyKey: "category-produce" },
      { name: "Produce", active: true },
    );
    const specials = await service.upsertCategory(
      { ...baseContext, idempotencyKey: "category-specials" },
      { name: "Weekly Specials", active: true },
    );
    const pantry = await service.upsertCategory(
      { ...baseContext, idempotencyKey: "category-pantry" },
      { name: "Pantry", active: true },
    );
    const product = await service.upsertSku(
      { ...baseContext, idempotencyKey: "sku-tomatoes" },
      {
        categoryIds: [produce.category.id, specials.category.id],
        name: "Roma Tomatoes",
        description: "Fresh local tomatoes.",
        unit: "kilogram",
        imageUrl: null,
        procurementCostCentavos: 10_000,
        markupBasisPoints: 2_500,
        status: "active",
      },
    );
    const image = await service.createImage(
      { ...baseContext, idempotencyKey: "image-tomatoes" },
      {
        fileName: "tomatoes.webp",
        altText: "Roma tomatoes",
        contentType: "image/webp",
        sizeBytes: 12_000,
      },
    );
    await service.assignCategoryItems(
      { ...baseContext, idempotencyKey: "assign-pantry" },
      { categoryId: pantry.category.id, itemIds: [product.item.id] },
    );
    await service.markImageReady(image.image.id, "2026-08-24T05:01:00.000Z");

    const snapshot = await service.list();
    const publicPage = await new D1CatalogReader(database).listPublic({
      categorySlug: "weekly-specials",
      limit: 20,
    });

    expect(snapshot.items[0]?.categoryIds).toEqual([
      produce.category.id,
      specials.category.id,
      pantry.category.id,
    ]);
    expect(snapshot.images[0]).toMatchObject({
      id: image.image.id,
      status: "ready",
      objectKey: image.image.objectKey,
    });
    expect(publicPage.items.map((item) => item.id)).toEqual([product.item.id]);
  });
});
