import type {
  CatalogAdminCommand,
  CatalogAdminCommandRepository,
  CatalogAdminCommandResult,
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
    const [categories, items] = await Promise.all([
      this.database
        .prepare(
          "SELECT id, name, slug, active FROM catalog_categories ORDER BY name COLLATE NOCASE",
        )
        .bind()
        .all<CategoryRow>(),
      this.database
        .prepare(
          `SELECT id, category_id, name, slug, description, unit, image_url,
                  current_procurement_cost_centavos, current_markup_basis_points,
                  current_price_centavos, active, lifecycle_status
           FROM catalog_skus
           ORDER BY name COLLATE NOCASE`,
        )
        .bind()
        .all<SkuRow>(),
    ]);
    return {
      categories: categories.results.map(mapCategory),
      items: items.results.map(mapItem),
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
        `SELECT id, category_id, name, slug, description, unit, image_url,
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
