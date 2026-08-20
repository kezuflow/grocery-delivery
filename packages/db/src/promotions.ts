import {
  createMoney,
  normalizePromotionCode,
  type Promotion,
  type PromotionDiscount,
  type PromotionResult,
} from "@carbon/domain";

import type { CatalogDatabase, CatalogPreparedStatement } from "./catalog.js";

export type PromotionRedemptionRecord = Readonly<{
  id: string;
  promotionId: string;
  customerId: string;
  idempotencyKey: string;
  requestFingerprint: string;
  result: PromotionResult;
  createdAt: string;
}>;

export interface PromotionRepository {
  list(): Promise<readonly Promotion[]>;
  findActiveByCode(code: string): Promise<Promotion | null>;
  findRedemption(
    customerId: string,
    idempotencyKey: string,
  ): Promise<PromotionRedemptionRecord | null>;
  countCustomerRedemptions(promotionId: string, customerId: string): Promise<number>;
  saveRedemption(redemption: PromotionRedemptionRecord): Promise<void>;
  saveRedemptionAndUpdatePromotion(redemption: PromotionRedemptionRecord): Promise<void>;
  savePromotion(promotion: Promotion): Promise<void>;
  updatePromotionStatus(id: string, status: Promotion["status"], updatedAt: string): Promise<void>;
}

export class D1PromotionRepository implements PromotionRepository {
  constructor(private readonly database: CatalogDatabase) {}

  async findActiveByCode(code: string): Promise<Promotion | null> {
    const rows = await this.database
      .prepare(
        `SELECT id, code, version, status, starts_at, ends_at, discount_json,
                minimum_subtotal_centavos, plan_ids_json, sku_ids_json, category_ids_json,
                first_order_only, first_week_only, total_budget_centavos,
                total_redemptions, per_customer_redemptions, redeemed_amount_centavos,
                redemption_count, allows_stacking
         FROM promotions
         WHERE code = ? AND status = 'active'
         LIMIT 1`,
      )
      .bind(normalizePromotionCode(code))
      .all<PromotionRow>();
    const row = rows.results[0];
    return row ? mapPromotion(row) : null;
  }

  async list(): Promise<readonly Promotion[]> {
    const rows = await this.database
      .prepare(
        `SELECT id, code, version, status, starts_at, ends_at, discount_json,
                minimum_subtotal_centavos, plan_ids_json, sku_ids_json, category_ids_json,
                first_order_only, first_week_only, total_budget_centavos,
                total_redemptions, per_customer_redemptions, redeemed_amount_centavos,
                redemption_count, allows_stacking
         FROM promotions ORDER BY created_at DESC`,
      )
      .bind()
      .all<PromotionRow>();
    return rows.results.map(mapPromotion);
  }

  async savePromotion(promotion: Promotion): Promise<void> {
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO promotions (
             id, code, version, status, starts_at, ends_at, discount_json,
             minimum_subtotal_centavos, plan_ids_json, sku_ids_json, category_ids_json,
             first_order_only, first_week_only, total_budget_centavos, total_redemptions,
             per_customer_redemptions, redeemed_amount_centavos, redemption_count,
             allows_stacking, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             code = excluded.code, version = excluded.version, status = excluded.status,
             starts_at = excluded.starts_at, ends_at = excluded.ends_at,
             discount_json = excluded.discount_json,
             minimum_subtotal_centavos = excluded.minimum_subtotal_centavos,
             plan_ids_json = excluded.plan_ids_json, sku_ids_json = excluded.sku_ids_json,
             category_ids_json = excluded.category_ids_json,
             first_order_only = excluded.first_order_only, first_week_only = excluded.first_week_only,
             total_budget_centavos = excluded.total_budget_centavos,
             total_redemptions = excluded.total_redemptions,
             per_customer_redemptions = excluded.per_customer_redemptions,
             allows_stacking = excluded.allows_stacking, updated_at = excluded.updated_at`,
        )
        .bind(
          promotion.id,
          promotion.code,
          promotion.version,
          promotion.status,
          promotion.startsAt,
          promotion.endsAt,
          JSON.stringify(promotion.discount),
          promotion.minimumSubtotal?.centavos ?? null,
          JSON.stringify(promotion.planIds),
          JSON.stringify(promotion.skuIds),
          JSON.stringify(promotion.categoryIds),
          promotion.firstOrderOnly ? 1 : 0,
          promotion.firstWeekOnly ? 1 : 0,
          promotion.totalBudget?.centavos ?? null,
          promotion.totalRedemptions,
          promotion.perCustomerRedemptions,
          promotion.redeemedAmount.centavos,
          promotion.redemptionCount,
          promotion.allowsStacking ? 1 : 0,
          promotion.startsAt,
          promotion.startsAt,
        ),
    ]);
  }

  async updatePromotionStatus(
    id: string,
    status: Promotion["status"],
    updatedAt: string,
  ): Promise<void> {
    await this.database.batch([
      this.database
        .prepare(`UPDATE promotions SET status = ?, updated_at = ? WHERE id = ?`)
        .bind(status, updatedAt, id),
    ]);
  }

  async findRedemption(
    customerId: string,
    idempotencyKey: string,
  ): Promise<PromotionRedemptionRecord | null> {
    const rows = await this.database
      .prepare(
        `SELECT id, promotion_id, customer_id, idempotency_key,
                request_fingerprint, result_json, created_at
         FROM promotion_redemptions
         WHERE customer_id = ? AND idempotency_key = ?
         LIMIT 1`,
      )
      .bind(customerId, idempotencyKey)
      .all<PromotionRedemptionRow>();
    const row = rows.results[0];
    return row ? mapRedemption(row) : null;
  }

  async countCustomerRedemptions(promotionId: string, customerId: string): Promise<number> {
    const rows = await this.database
      .prepare(
        `SELECT COUNT(*) AS count
         FROM promotion_redemptions
         WHERE promotion_id = ? AND customer_id = ? AND json_extract(result_json, '$.reason') IS NULL`,
      )
      .bind(promotionId, customerId)
      .all<{ count: number }>();
    return rows.results[0]?.count ?? 0;
  }

  async saveRedemption(redemption: PromotionRedemptionRecord): Promise<void> {
    await this.database.batch([redemptionStatement(this.database, redemption)]);
  }

  async saveRedemptionAndUpdatePromotion(redemption: PromotionRedemptionRecord): Promise<void> {
    await this.database.batch([
      redemptionStatement(this.database, redemption, false),
      this.database
        .prepare(
          `UPDATE promotions
           SET redeemed_amount_centavos = redeemed_amount_centavos + ?,
               redemption_count = redemption_count + 1,
               updated_at = ?
           WHERE id = ?
             AND EXISTS (SELECT 1 FROM promotion_redemptions WHERE id = ?)
             AND (total_budget_centavos IS NULL OR redeemed_amount_centavos + ? <= total_budget_centavos)
             AND (total_redemptions IS NULL OR redemption_count < total_redemptions)`,
        )
        .bind(
          redemption.result.discount.centavos,
          redemption.createdAt,
          redemption.promotionId,
          redemption.id,
          redemption.result.discount.centavos,
        ),
    ]);
    const saved = await this.findRedemption(redemption.customerId, redemption.idempotencyKey);
    if (!saved) {
      throw new Error("promotion redemption could not be persisted within campaign limits");
    }
  }
}

function redemptionStatement(
  database: CatalogDatabase,
  redemption: PromotionRedemptionRecord,
  ignoreDuplicate = true,
): CatalogPreparedStatement {
  return database
    .prepare(
      `INSERT ${ignoreDuplicate ? "OR IGNORE " : ""}INTO promotion_redemptions (
         id, promotion_id, customer_id, idempotency_key,
         request_fingerprint, result_json, created_at
       )
       SELECT ?, ?, ?, ?, ?, ?, ?
       FROM promotions
       WHERE id = ?
         AND (total_budget_centavos IS NULL OR redeemed_amount_centavos + ? <= total_budget_centavos)
         AND (total_redemptions IS NULL OR redemption_count < total_redemptions)
         AND (
           per_customer_redemptions IS NULL OR
           (SELECT COUNT(*) FROM promotion_redemptions
            WHERE promotion_id = ? AND customer_id = ? AND json_extract(result_json, '$.reason') IS NULL)
           < per_customer_redemptions
         )`,
    )
    .bind(
      redemption.id,
      redemption.promotionId,
      redemption.customerId,
      redemption.idempotencyKey,
      redemption.requestFingerprint,
      JSON.stringify(redemption.result),
      redemption.createdAt,
      redemption.promotionId,
      redemption.result.discount.centavos,
      redemption.promotionId,
      redemption.customerId,
    );
}

function mapPromotion(row: PromotionRow): Promotion {
  const discount = JSON.parse(row.discount_json) as PromotionDiscount;
  return {
    id: row.id,
    code: row.code,
    version: row.version,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    discount: normalizeDiscount(discount),
    minimumSubtotal:
      row.minimum_subtotal_centavos === null ? null : createMoney(row.minimum_subtotal_centavos),
    planIds: parseStringList(row.plan_ids_json),
    skuIds: parseStringList(row.sku_ids_json),
    categoryIds: parseStringList(row.category_ids_json),
    firstOrderOnly: Boolean(row.first_order_only),
    firstWeekOnly: Boolean(row.first_week_only),
    totalBudget: row.total_budget_centavos === null ? null : createMoney(row.total_budget_centavos),
    totalRedemptions: row.total_redemptions,
    perCustomerRedemptions: row.per_customer_redemptions,
    redeemedAmount: createMoney(row.redeemed_amount_centavos),
    redemptionCount: row.redemption_count,
    allowsStacking: Boolean(row.allows_stacking),
  };
}

function normalizeDiscount(discount: PromotionDiscount): PromotionDiscount {
  if (discount.kind === "fixed")
    return { kind: "fixed", amount: createMoney(discount.amount.centavos) };
  if (discount.kind === "percentage") {
    return {
      kind: "percentage",
      basisPoints: discount.basisPoints,
      maximum: discount.maximum ? createMoney(discount.maximum.centavos) : null,
    };
  }
  return { kind: "free_delivery" };
}

function parseStringList(value: string): readonly string[] {
  const parsed = JSON.parse(value) as unknown;
  return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? parsed : [];
}

function mapRedemption(row: PromotionRedemptionRow): PromotionRedemptionRecord {
  return {
    id: row.id,
    promotionId: row.promotion_id,
    customerId: row.customer_id,
    idempotencyKey: row.idempotency_key,
    requestFingerprint: row.request_fingerprint,
    result: normalizeResult(JSON.parse(row.result_json) as PromotionResult),
    createdAt: row.created_at,
  };
}

function normalizeResult(result: PromotionResult): PromotionResult {
  return {
    promotionId: result.promotionId,
    discount: createMoney(result.discount.centavos),
    deliveryFee: createMoney(result.deliveryFee.centavos),
    reason: result.reason,
  };
}

type PromotionRow = Record<string, unknown> & {
  id: string;
  code: string | null;
  version: number;
  status: Promotion["status"];
  starts_at: string;
  ends_at: string;
  discount_json: string;
  minimum_subtotal_centavos: number | null;
  plan_ids_json: string;
  sku_ids_json: string;
  category_ids_json: string;
  first_order_only: number;
  first_week_only: number;
  total_budget_centavos: number | null;
  total_redemptions: number | null;
  per_customer_redemptions: number | null;
  redeemed_amount_centavos: number;
  redemption_count: number;
  allows_stacking: number;
};

type PromotionRedemptionRow = Record<string, unknown> & {
  id: string;
  promotion_id: string;
  customer_id: string;
  idempotency_key: string;
  request_fingerprint: string;
  result_json: string;
  created_at: string;
};
