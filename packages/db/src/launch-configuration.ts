import type {
  LaunchConfiguration,
  LaunchConfigurationCommand,
  LaunchConfigurationRepository,
  LaunchConfigurationResult,
} from "@carbon/application";
import { createAuditEvent, type AuditEvent } from "@carbon/domain";

import type { CatalogDatabase, CatalogPreparedStatement } from "./catalog.js";

export class D1LaunchConfigurationRepository implements LaunchConfigurationRepository {
  constructor(private readonly database: CatalogDatabase) {}

  async findCommand(idempotencyKey: string): Promise<LaunchConfigurationCommand | null> {
    const rows = await this.database
      .prepare(
        `SELECT idempotency_key, fingerprint, result_json
         FROM launch_configuration_commands
         WHERE idempotency_key = ?
         LIMIT 1`,
      )
      .bind(idempotencyKey)
      .all<LaunchConfigurationCommandRow>();
    const row = rows.results[0];
    return row
      ? {
          idempotencyKey: row.idempotency_key,
          fingerprint: row.fingerprint,
          result: JSON.parse(row.result_json) as LaunchConfigurationResult,
        }
      : null;
  }

  async apply(
    configuration: LaunchConfiguration,
    command: LaunchConfigurationCommand,
    auditEvent: AuditEvent,
  ): Promise<void> {
    const statements: CatalogPreparedStatement[] = [];
    for (const category of configuration.categories) {
      statements.push(
        this.database
          .prepare(
            `INSERT INTO catalog_categories (id, name, slug, active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               name = excluded.name,
               slug = excluded.slug,
               active = excluded.active,
               updated_at = excluded.updated_at`,
          )
          .bind(
            category.id,
            category.name,
            category.slug,
            category.active ? 1 : 0,
            command.result.appliedAt,
            command.result.appliedAt,
          ),
      );
    }
    for (const item of configuration.skus) {
      statements.push(
        this.database
          .prepare(
            `INSERT INTO catalog_skus (
               id, category_id, name, slug, description, unit, image_url,
               current_procurement_cost_centavos, current_markup_basis_points,
               current_price_centavos, current_price_effective_at, active, lifecycle_status,
               created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               category_id = excluded.category_id,
               name = excluded.name,
               slug = excluded.slug,
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
            item.sku.id,
            item.sku.categoryId,
            item.sku.name,
            item.sku.slug,
            item.sku.description,
            item.sku.unit,
            item.sku.imageUrl,
            item.procurementCost.centavos,
            item.markupRule.basisPoints,
            item.sku.price.centavos,
            item.priceHistory.effectiveAt,
            item.sku.active ? 1 : 0,
            item.sku.active ? "active" : "paused",
            command.result.appliedAt,
            command.result.appliedAt,
          ),
        this.database
          .prepare(
            `INSERT INTO catalog_markup_rules (id, sku_id, basis_points, effective_at, created_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(sku_id, effective_at) DO UPDATE SET
               basis_points = excluded.basis_points`,
          )
          .bind(
            item.markupRule.id,
            item.markupRule.skuId,
            item.markupRule.basisPoints,
            item.markupRule.effectiveAt,
            command.result.appliedAt,
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
            item.priceHistory.id,
            item.priceHistory.skuId,
            item.priceHistory.procurementCost.centavos,
            item.priceHistory.markupBasisPoints,
            item.priceHistory.price.centavos,
            item.priceHistory.effectiveAt,
            command.result.appliedAt,
          ),
      );
    }
    for (const window of configuration.deliveryWindows) {
      statements.push(
        this.database
          .prepare(
            `INSERT INTO delivery_windows (
               id, cycle_id, label, starts_at, ends_at, capacity, active, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               cycle_id = excluded.cycle_id,
               label = excluded.label,
               starts_at = excluded.starts_at,
               ends_at = excluded.ends_at,
               capacity = excluded.capacity,
               active = excluded.active,
               updated_at = excluded.updated_at`,
          )
          .bind(
            window.id,
            window.cycleId,
            window.label,
            window.startsAt,
            window.endsAt,
            window.capacity,
            window.active ? 1 : 0,
            window.createdAt,
            window.updatedAt,
          ),
      );
    }

    const audit = createAuditEvent(auditEvent);
    statements.push(
      this.database
        .prepare(
          `UPDATE catalog_cache_state
           SET version = version + 1, updated_at = ?
           WHERE id = 'public'`,
        )
        .bind(command.result.appliedAt),
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
          `INSERT INTO launch_configuration_commands (
             idempotency_key, fingerprint, result_json, created_at
           ) VALUES (?, ?, ?, ?)`,
        )
        .bind(
          command.idempotencyKey,
          command.fingerprint,
          JSON.stringify(command.result),
          command.result.appliedAt,
        ),
    );

    await this.database.batch(statements);
  }
}

type LaunchConfigurationCommandRow = Record<string, unknown> & {
  idempotency_key: string;
  fingerprint: string;
  result_json: string;
};
