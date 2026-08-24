import type {
  CatalogAdminCommand,
  CatalogAdminCommandRepository,
  CatalogAdminCommandResult,
  CatalogAdminImage,
  CatalogAdminItem,
  CatalogAdminSnapshot,
} from "@carbon/application";
import {
  createAuditEvent,
  createCatalogCategory,
  createCatalogSku,
  type AuditEvent,
} from "@carbon/domain";

import type { CatalogDatabase, CatalogPreparedStatement } from "./catalog.js";

export class D1CatalogAdminCommandRepository implements CatalogAdminCommandRepository {
  constructor(private readonly database: CatalogDatabase) {}

  async list(): Promise<CatalogAdminSnapshot> {
    const [categories, items, images] = await Promise.all([
      this.database
        .prepare(
          "SELECT id, name, slug, active FROM catalog_categories ORDER BY name COLLATE NOCASE",
        )
        .bind()
        .all<CategoryRow>(),
      this.database
        .prepare(
          `SELECT id, category_id,
                  COALESCE((SELECT json_group_array(category_id)
                            FROM catalog_sku_categories WHERE sku_id = catalog_skus.id),
                           json_array(category_id)) AS category_ids_json,
                  name, slug, description, unit, image_url,
                  current_procurement_cost_centavos, current_markup_basis_points,
                  current_price_centavos, active, lifecycle_status
           FROM catalog_skus
           ORDER BY name COLLATE NOCASE`,
        )
        .bind()
        .all<SkuRow>(),
      this.database
        .prepare(
          `SELECT id, file_name, alt_text, object_key, content_type, size_bytes,
                  status, created_by_user_id, created_at
           FROM catalog_images
           ORDER BY created_at DESC`,
        )
        .bind()
        .all<ImageRow>(),
    ]);
    return {
      categories: categories.results.map(mapCategory),
      items: items.results.map(mapItem),
      images: images.results.map(mapImage),
    };
  }

  async findCommand(idempotencyKey: string): Promise<CatalogAdminCommand | null> {
    const rows = await this.database
      .prepare(
        `SELECT idempotency_key, fingerprint, result_json, created_at
         FROM catalog_admin_commands WHERE idempotency_key = ? LIMIT 1`,
      )
      .bind(idempotencyKey)
      .all<CommandRow>();
    const row = rows.results[0];
    return row
      ? {
          idempotencyKey: row.idempotency_key,
          fingerprint: row.fingerprint,
          result: JSON.parse(row.result_json) as CatalogAdminCommandResult,
          appliedAt: row.created_at,
        }
      : null;
  }

  async findCategoryById(id: string) {
    return this.findCategory("id", id);
  }

  async findCategoryBySlug(slug: string) {
    return this.findCategory("slug", slug);
  }

  async findSkuById(id: string) {
    return this.findSku("id", id);
  }

  async findSkuBySlug(slug: string) {
    return this.findSku("slug", slug);
  }

  async findImageById(id: string) {
    const rows = await this.database
      .prepare(
        `SELECT id, file_name, alt_text, object_key, content_type, size_bytes,
                status, created_by_user_id, created_at
         FROM catalog_images WHERE id = ? LIMIT 1`,
      )
      .bind(id)
      .all<ImageRow>();
    return rows.results[0] ? mapImage(rows.results[0]) : null;
  }

  async applyCategory(command: CatalogAdminCommand, auditEvent: AuditEvent): Promise<void> {
    if (command.result.kind !== "category") throw new Error("category command result is required");
    const category = command.result.category;
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO catalog_categories (id, name, slug, active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name, active = excluded.active, updated_at = excluded.updated_at`,
        )
        .bind(
          category.id,
          category.name,
          category.slug,
          category.active ? 1 : 0,
          command.appliedAt,
          command.appliedAt,
        ),
      ...this.sharedStatements(command, auditEvent),
    ]);
  }

  async applyCategoryItems(command: CatalogAdminCommand, auditEvent: AuditEvent): Promise<void> {
    if (command.result.kind !== "categoryItems") {
      throw new Error("category items command result is required");
    }
    const { categoryId, items } = command.result;
    await this.database.batch([
      ...items.map((item) =>
        this.database
          .prepare(
            `INSERT OR IGNORE INTO catalog_sku_categories (
               sku_id, category_id, position, created_at
             ) VALUES (?, ?, ?, ?)`,
          )
          .bind(item.id, categoryId, item.categoryIds.indexOf(categoryId), command.appliedAt),
      ),
      ...this.sharedStatements(command, auditEvent),
    ]);
  }

  async applyImage(command: CatalogAdminCommand, auditEvent: AuditEvent): Promise<void> {
    if (command.result.kind !== "image") throw new Error("image command result is required");
    const image = command.result.image;
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO catalog_images (
             id, file_name, alt_text, object_key, content_type, size_bytes,
             status, created_by_user_id, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          image.id,
          image.fileName,
          image.altText,
          image.objectKey,
          image.contentType,
          image.sizeBytes,
          image.status,
          image.createdByUserId,
          image.createdAt,
          image.createdAt,
        ),
      ...this.sharedStatements(command, auditEvent),
    ]);
  }

  async markImageReady(id: string, updatedAt: string): Promise<CatalogAdminImage | null> {
    const image = await this.findImageById(id);
    if (!image) return null;
    if (image.status !== "ready") {
      await this.database.batch([
        this.database
          .prepare("UPDATE catalog_images SET status = 'ready', updated_at = ? WHERE id = ?")
          .bind(updatedAt, id),
      ]);
    }
    return { ...image, status: "ready" };
  }

  async applySku(command: CatalogAdminCommand, auditEvent: AuditEvent): Promise<void> {
    if (command.result.kind !== "sku") throw new Error("SKU command result is required");
    const item = command.result.item;
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO catalog_skus (
             id, category_id, name, slug, description, unit, image_url,
             current_procurement_cost_centavos, current_markup_basis_points,
             current_price_centavos, current_price_effective_at, active,
             lifecycle_status, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             category_id = excluded.category_id,
             name = excluded.name,
             description = excluded.description,
             unit = excluded.unit,
             image_url = excluded.image_url,
             current_procurement_cost_centavos = excluded.current_procurement_cost_centavos,
             current_markup_basis_points = excluded.current_markup_basis_points,
             current_price_centavos = excluded.current_price_centavos,
             current_price_effective_at = excluded.current_price_effective_at,
             active = excluded.active,
             lifecycle_status = excluded.lifecycle_status,
             updated_at = excluded.updated_at`,
        )
        .bind(
          item.id,
          item.categoryId,
          item.name,
          item.slug,
          item.description,
          item.unit,
          item.imageUrl,
          item.procurementCostCentavos,
          item.markupBasisPoints,
          item.price.centavos,
          command.appliedAt,
          item.active ? 1 : 0,
          item.status,
          command.appliedAt,
          command.appliedAt,
        ),
      this.database.prepare("DELETE FROM catalog_sku_categories WHERE sku_id = ?").bind(item.id),
      ...item.categoryIds.map((categoryId, position) =>
        this.database
          .prepare(
            `INSERT INTO catalog_sku_categories (sku_id, category_id, position, created_at)
             VALUES (?, ?, ?, ?)`,
          )
          .bind(item.id, categoryId, position, command.appliedAt),
      ),
      this.database
        .prepare(
          `INSERT INTO catalog_markup_rules (id, sku_id, basis_points, effective_at, created_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(sku_id, effective_at) DO UPDATE SET
             basis_points = excluded.basis_points`,
        )
        .bind(
          `catalog-markup:${item.id}:${command.appliedAt}`,
          item.id,
          item.markupBasisPoints,
          command.appliedAt,
          command.appliedAt,
        ),
      this.database
        .prepare(
          `INSERT INTO catalog_price_history (
             id, sku_id, procurement_cost_centavos, markup_basis_points,
             price_centavos, effective_at, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(sku_id, effective_at) DO UPDATE SET
             procurement_cost_centavos = excluded.procurement_cost_centavos,
             markup_basis_points = excluded.markup_basis_points,
             price_centavos = excluded.price_centavos`,
        )
        .bind(
          `catalog-price:${item.id}:${command.appliedAt}`,
          item.id,
          item.procurementCostCentavos,
          item.markupBasisPoints,
          item.price.centavos,
          command.appliedAt,
          command.appliedAt,
        ),
      ...this.sharedStatements(command, auditEvent),
    ]);
  }

  private async findCategory(column: "id" | "slug", value: string) {
    const rows = await this.database
      .prepare(`SELECT id, name, slug, active FROM catalog_categories WHERE ${column} = ? LIMIT 1`)
      .bind(value)
      .all<CategoryRow>();
    return rows.results[0] ? mapCategory(rows.results[0]) : null;
  }

  private async findSku(column: "id" | "slug", value: string) {
    const rows = await this.database
      .prepare(
        `SELECT id, category_id,
                COALESCE((SELECT json_group_array(category_id)
                          FROM catalog_sku_categories WHERE sku_id = catalog_skus.id),
                         json_array(category_id)) AS category_ids_json,
                name, slug, description, unit, image_url,
                current_procurement_cost_centavos, current_markup_basis_points,
                current_price_centavos, active, lifecycle_status
         FROM catalog_skus WHERE ${column} = ? LIMIT 1`,
      )
      .bind(value)
      .all<SkuRow>();
    return rows.results[0] ? mapItem(rows.results[0]) : null;
  }

  private sharedStatements(
    command: CatalogAdminCommand,
    auditEvent: AuditEvent,
  ): CatalogPreparedStatement[] {
    const audit = createAuditEvent(auditEvent);
    return [
      this.database
        .prepare(
          `UPDATE catalog_cache_state SET version = version + 1, updated_at = ? WHERE id = 'public'`,
        )
        .bind(command.appliedAt),
      this.database
        .prepare(
          `INSERT INTO audit_events (
             id, actor_user_id, action, target_type, target_id, occurred_at, metadata_json
           ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          audit.id,
          audit.actorUserId,
          audit.action,
          audit.targetType,
          audit.targetId,
          audit.occurredAt,
          JSON.stringify(audit.metadata),
        ),
      this.database
        .prepare(
          `INSERT INTO catalog_admin_commands (
             idempotency_key, fingerprint, result_json, created_at
           ) VALUES (?, ?, ?, ?)`,
        )
        .bind(
          command.idempotencyKey,
          command.fingerprint,
          JSON.stringify(command.result),
          command.appliedAt,
        ),
    ];
  }
}

type CategoryRow = Record<string, unknown> & {
  id: string;
  name: string;
  slug: string;
  active: number;
};

type SkuRow = Record<string, unknown> & {
  id: string;
  category_id: string;
  category_ids_json: string;
  name: string;
  slug: string;
  description: string;
  unit: CatalogAdminItem["unit"];
  image_url: string | null;
  current_procurement_cost_centavos: number;
  current_markup_basis_points: number;
  current_price_centavos: number;
  active: number;
  lifecycle_status: CatalogAdminItem["status"];
};

type ImageRow = Record<string, unknown> & {
  id: string;
  file_name: string;
  alt_text: string;
  object_key: string;
  content_type: CatalogAdminImage["contentType"];
  size_bytes: number;
  status: CatalogAdminImage["status"];
  created_by_user_id: string;
  created_at: string;
};

type CommandRow = Record<string, unknown> & {
  idempotency_key: string;
  fingerprint: string;
  result_json: string;
  created_at: string;
};

function mapCategory(row: CategoryRow) {
  return createCatalogCategory({
    id: row.id,
    name: row.name,
    slug: row.slug,
    active: row.active === 1,
  });
}

function mapItem(row: SkuRow): CatalogAdminItem {
  const sku = createCatalogSku({
    id: row.id,
    categoryId: row.category_id,
    categoryIds: parseCategoryIds(row.category_ids_json, row.category_id),
    name: row.name,
    slug: row.slug,
    description: row.description,
    unit: row.unit,
    imageUrl: row.image_url,
    price: { centavos: row.current_price_centavos, currency: "PHP" },
    active: row.active === 1,
  });
  return {
    ...sku,
    procurementCostCentavos: row.current_procurement_cost_centavos,
    markupBasisPoints: row.current_markup_basis_points,
    status: row.lifecycle_status,
  };
}

function mapImage(row: ImageRow): CatalogAdminImage {
  return {
    id: row.id,
    fileName: row.file_name,
    altText: row.alt_text,
    objectKey: row.object_key,
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    status: row.status,
    url: `/api/v1/catalog/images/${encodeURIComponent(row.id)}`,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
  };
}

function parseCategoryIds(value: string, fallback: string): readonly string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      Array.isArray(parsed) &&
      parsed.every((item) => typeof item === "string") &&
      parsed.length
    ) {
      return [fallback, ...parsed.filter((categoryId) => categoryId !== fallback)];
    }
  } catch {
    // Fall back to the legacy primary category while older local databases migrate.
  }
  return [fallback];
}
