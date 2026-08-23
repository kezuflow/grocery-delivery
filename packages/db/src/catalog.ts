import {
  createCatalogCategory,
  createCatalogMarkupRule,
  createCatalogSku,
  type CatalogCategory,
  type CatalogMarkupRule,
  type CatalogPriceHistoryEntry,
  type CatalogSku,
  type CatalogUnit,
} from "@carbon/domain";

export type CatalogQuery = Readonly<{
  categorySlug?: string;
  search?: string;
  sort?: "popular" | "name" | "price-low" | "price-high";
  minPriceCentavos?: number;
  maxPriceCentavos?: number;
  includeInactive?: boolean;
  afterId?: string;
  offset?: number;
  limit: number;
}>;

export type CatalogDatabase = Readonly<{
  prepare(sql: string): CatalogPreparedStatement;
  batch(statements: readonly CatalogPreparedStatement[]): Promise<readonly unknown[]>;
}>;

export type CatalogPreparedStatement = Readonly<{
  bind(...values: unknown[]): CatalogPreparedStatement;
  all<T extends Record<string, unknown>>(): Promise<{ results: readonly T[] }>;
}>;

export type CatalogMutationDatabase = Readonly<{
  prepare(sql: string): CatalogPreparedStatement;
  batch(statements: readonly CatalogPreparedStatement[]): Promise<readonly unknown[]>;
}>;

export type CatalogPage = Readonly<{
  cacheVersion: string;
  categories: readonly CatalogCategory[];
  items: readonly CatalogSku[];
  nextAfterId: string | null;
  nextOffset: number | null;
}>;

export interface CatalogReader {
  listPublic(query: CatalogQuery): Promise<CatalogPage>;
  findPublicBySlug(slug: string): Promise<CatalogSku | null>;
}

export interface CatalogCheckoutReader {
  findActiveByIds(skuIds: readonly string[]): Promise<readonly CatalogSku[]>;
}

export type CatalogAdminStatus = "active" | "paused" | "archived";

export interface CatalogAdminRepository {
  updateSkuStatus(skuId: string, status: CatalogAdminStatus, updatedAt: string): Promise<boolean>;
}

export interface CatalogPricingRepository {
  listMarkupCandidates(skuId: string, effectiveAt: string): Promise<readonly CatalogMarkupRule[]>;
  recordPrice(entry: CatalogPriceHistoryEntry): Promise<void>;
}

export class InMemoryCatalogReader implements CatalogReader, CatalogCheckoutReader {
  private readonly cacheVersion: string;
  private readonly categories: readonly CatalogCategory[];
  private readonly items: readonly CatalogSku[];

  constructor(input: {
    cacheVersion?: string;
    categories: readonly CatalogCategory[];
    items: readonly CatalogSku[];
  }) {
    this.cacheVersion = input.cacheVersion ?? "fixture-1";
    this.categories = [...input.categories].sort((left, right) =>
      left.slug.localeCompare(right.slug),
    );
    this.items = [...input.items].sort((left, right) => left.id.localeCompare(right.id));
  }

  listPublic(query: CatalogQuery): Promise<CatalogPage> {
    const category = query.categorySlug
      ? this.categories.find((candidate) => candidate.slug === query.categorySlug)
      : undefined;
    if (query.categorySlug && !category) {
      return Promise.resolve({
        cacheVersion: this.cacheVersion,
        categories: query.includeInactive
          ? this.categories
          : this.categories.filter((candidate) => candidate.active),
        items: [],
        nextAfterId: null,
        nextOffset: null,
      });
    }
    const search = query.search?.toLowerCase();
    const categoryItems = this.items.filter((item) => {
      if (!query.includeInactive && !item.active) return false;
      if (category && item.categoryId !== category.id) return false;
      if (query.minPriceCentavos !== undefined && item.price.centavos < query.minPriceCentavos)
        return false;
      if (query.maxPriceCentavos !== undefined && item.price.centavos > query.maxPriceCentavos)
        return false;
      return (
        !search || `${item.name} ${item.description} ${item.slug}`.toLowerCase().includes(search)
      );
    });
    const sortedItems = [...categoryItems].sort((left, right) => {
      if (query.sort === "name")
        return left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
      if (query.sort === "price-low")
        return left.price.centavos - right.price.centavos || left.id.localeCompare(right.id);
      if (query.sort === "price-high")
        return right.price.centavos - left.price.centavos || left.id.localeCompare(right.id);
      return left.id.localeCompare(right.id);
    });
    const afterId = query.afterId;
    const start =
      query.offset ??
      (afterId
        ? (() => {
            const nextIndex = sortedItems.findIndex((item) => item.id > afterId);
            return nextIndex === -1 ? sortedItems.length : nextIndex;
          })()
        : 0);
    const items = sortedItems.slice(start, start + query.limit);
    const lastItem = items.at(-1);

    return Promise.resolve({
      cacheVersion: this.cacheVersion,
      categories: query.includeInactive
        ? this.categories
        : this.categories.filter((candidate) => candidate.active),
      items,
      nextAfterId: start + items.length < sortedItems.length ? (lastItem?.id ?? null) : null,
      nextOffset: start + items.length < sortedItems.length ? start + items.length : null,
    });
  }

  findPublicBySlug(slug: string): Promise<CatalogSku | null> {
    return Promise.resolve(this.items.find((item) => item.active && item.slug === slug) ?? null);
  }

  findActiveByIds(skuIds: readonly string[]): Promise<readonly CatalogSku[]> {
    const ids = new Set(skuIds);
    return Promise.resolve(this.items.filter((item) => item.active && ids.has(item.id)));
  }
}

export class D1CatalogReader implements CatalogReader, CatalogCheckoutReader {
  constructor(private readonly database: CatalogDatabase) {}

  async listPublic(query: CatalogQuery): Promise<CatalogPage> {
    const categoryRows = await this.database
      .prepare(
        `SELECT id, name, slug, active
         FROM catalog_categories
         ${query.includeInactive ? "" : "WHERE active = 1"}
         ORDER BY slug ASC`,
      )
      .bind()
      .all<CatalogCategoryRow>();
    const search = query.search?.trim().toLowerCase();
    const orderBy =
      query.sort === "name"
        ? "s.name COLLATE NOCASE ASC, s.id ASC"
        : query.sort === "price-low"
          ? "s.current_price_centavos ASC, s.id ASC"
          : query.sort === "price-high"
            ? "s.current_price_centavos DESC, s.id ASC"
            : "s.id ASC";
    const useOffset = query.offset !== undefined;
    const cursorClause = useOffset ? "" : "AND (? IS NULL OR s.id > ?)";
    const itemSql = query.categorySlug
      ? `SELECT s.id, s.category_id, s.name, s.slug, s.description, s.unit,
                s.image_url, s.current_price_centavos, s.active
         FROM catalog_skus s
         INNER JOIN catalog_categories c ON c.id = s.category_id
         WHERE ${query.includeInactive ? "1 = 1" : "s.active = 1 AND c.active = 1"} AND c.slug = ?
           AND (? IS NULL OR lower(s.name || ' ' || s.description || ' ' || s.slug) LIKE '%' || ? || '%')
           AND (? IS NULL OR s.current_price_centavos >= ?)
           AND (? IS NULL OR s.current_price_centavos <= ?)
           ${cursorClause}
         ORDER BY ${orderBy}
         LIMIT ?${useOffset ? " OFFSET ?" : ""}`
      : `SELECT s.id, s.category_id, s.name, s.slug, s.description, s.unit,
         s.image_url, s.current_price_centavos, s.active
         FROM catalog_skus s
         INNER JOIN catalog_categories c ON c.id = s.category_id
         WHERE ${query.includeInactive ? "1 = 1" : "s.active = 1 AND c.active = 1"}
           AND (? IS NULL OR lower(s.name || ' ' || s.description || ' ' || s.slug) LIKE '%' || ? || '%')
           AND (? IS NULL OR s.current_price_centavos >= ?)
           AND (? IS NULL OR s.current_price_centavos <= ?)
           ${cursorClause}
         ORDER BY ${orderBy}
         LIMIT ?${useOffset ? " OFFSET ?" : ""}`;
    const paginationValues = useOffset
      ? [query.limit + 1, query.offset ?? 0]
      : [query.afterId ?? null, query.afterId ?? null, query.limit + 1];
    const itemValues = query.categorySlug
      ? [
          query.categorySlug,
          search ?? null,
          search ?? null,
          query.minPriceCentavos ?? null,
          query.minPriceCentavos ?? null,
          query.maxPriceCentavos ?? null,
          query.maxPriceCentavos ?? null,
          ...paginationValues,
        ]
      : [
          search ?? null,
          search ?? null,
          query.minPriceCentavos ?? null,
          query.minPriceCentavos ?? null,
          query.maxPriceCentavos ?? null,
          query.maxPriceCentavos ?? null,
          ...paginationValues,
        ];
    const itemRows = await this.database
      .prepare(itemSql)
      .bind(...itemValues)
      .all<CatalogSkuRow>();
    const cacheRows = await this.database
      .prepare(`SELECT version FROM catalog_cache_state WHERE id = 'public'`)
      .bind()
      .all<CatalogCacheRow>();
    const hasNext = itemRows.results.length > query.limit;
    const rows = itemRows.results.slice(0, query.limit);

    return {
      cacheVersion: String(cacheRows.results[0]?.version ?? 1),
      categories: categoryRows.results.map(mapCategory),
      items: rows.map(mapSku),
      nextAfterId: hasNext ? (rows.at(-1)?.id ?? null) : null,
      nextOffset: hasNext ? (query.offset ?? 0) + rows.length : null,
    };
  }

  async findPublicBySlug(slug: string): Promise<CatalogSku | null> {
    const rows = await this.database
      .prepare(
        `SELECT s.id, s.category_id, s.name, s.slug, s.description, s.unit,
                s.image_url, s.current_price_centavos, s.active
         FROM catalog_skus s
         INNER JOIN catalog_categories c ON c.id = s.category_id
         WHERE s.active = 1 AND c.active = 1 AND s.slug = ?
         LIMIT 1`,
      )
      .bind(slug)
      .all<CatalogSkuRow>();
    return rows.results[0] ? mapSku(rows.results[0]) : null;
  }

  async findActiveByIds(skuIds: readonly string[]): Promise<readonly CatalogSku[]> {
    if (skuIds.length === 0) {
      return [];
    }
    const placeholders = skuIds.map(() => "?").join(", ");
    const rows = await this.database
      .prepare(
        `SELECT s.id, s.category_id, s.name, s.slug, s.description, s.unit,
                s.image_url, s.current_price_centavos, s.active
         FROM catalog_skus s
         INNER JOIN catalog_categories c ON c.id = s.category_id
         WHERE s.active = 1 AND c.active = 1 AND s.id IN (${placeholders})`,
      )
      .bind(...skuIds)
      .all<CatalogSkuRow>();
    return rows.results.map(mapSku);
  }
}

export class D1CatalogAdminRepository implements CatalogAdminRepository {
  constructor(private readonly database: CatalogMutationDatabase) {}

  async updateSkuStatus(
    skuId: string,
    status: CatalogAdminStatus,
    updatedAt: string,
  ): Promise<boolean> {
    const existing = await this.database
      .prepare("SELECT id FROM catalog_skus WHERE id = ? LIMIT 1")
      .bind(skuId)
      .all<{ id: string }>();
    if (!existing.results[0]) return false;

    const active = status === "active" ? 1 : 0;
    await this.database.batch([
      this.database
        .prepare(
          `UPDATE catalog_skus
           SET active = ?, updated_at = ?
           WHERE id = ?`,
        )
        .bind(active, updatedAt, skuId),
      this.database
        .prepare(
          `UPDATE catalog_cache_state
           SET version = version + 1, updated_at = ?
           WHERE id = 'public'`,
        )
        .bind(updatedAt),
    ]);
    return true;
  }
}

export class D1CatalogPricingRepository implements CatalogPricingRepository {
  constructor(private readonly database: CatalogDatabase) {}

  async listMarkupCandidates(
    skuId: string,
    effectiveAt: string,
  ): Promise<readonly CatalogMarkupRule[]> {
    const rows = await this.database
      .prepare(
        `SELECT id, sku_id, basis_points, effective_at
         FROM catalog_markup_rules
         WHERE (sku_id IS NULL OR sku_id = ?) AND effective_at <= ?
         ORDER BY effective_at DESC`,
      )
      .bind(skuId, effectiveAt)
      .all<CatalogMarkupRow>();

    return rows.results.map((row) =>
      createCatalogMarkupRule({
        id: row.id,
        skuId: row.sku_id,
        basisPoints: row.basis_points,
        effectiveAt: row.effective_at,
      }),
    );
  }

  async recordPrice(entry: CatalogPriceHistoryEntry): Promise<void> {
    const insertHistory = this.database
      .prepare(
        `INSERT INTO catalog_price_history (
           id, sku_id, procurement_cost_centavos, markup_basis_points,
           price_centavos, effective_at, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        entry.id,
        entry.skuId,
        entry.procurementCost.centavos,
        entry.markupBasisPoints,
        entry.price.centavos,
        entry.effectiveAt,
        entry.effectiveAt,
      );
    const updateCurrent = this.database
      .prepare(
        `UPDATE catalog_skus
         SET current_procurement_cost_centavos = ?, current_markup_basis_points = ?,
             current_price_centavos = ?, current_price_effective_at = ?, updated_at = ?
         WHERE id = ? AND current_price_effective_at <= ?`,
      )
      .bind(
        entry.procurementCost.centavos,
        entry.markupBasisPoints,
        entry.price.centavos,
        entry.effectiveAt,
        entry.effectiveAt,
        entry.skuId,
        entry.effectiveAt,
      );
    const invalidateCache = this.database
      .prepare(
        `UPDATE catalog_cache_state
         SET version = version + 1, updated_at = ?
         WHERE id = 'public'`,
      )
      .bind(entry.effectiveAt);

    await this.database.batch([insertHistory, updateCurrent, invalidateCache]);
  }
}

type CatalogCategoryRow = Record<string, unknown> & {
  id: string;
  name: string;
  slug: string;
  active: number;
};

type CatalogSkuRow = Record<string, unknown> & {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  unit: CatalogUnit;
  image_url: string | null;
  current_price_centavos: number;
  active: number;
};

type CatalogMarkupRow = Record<string, unknown> & {
  id: string;
  sku_id: string | null;
  basis_points: number;
  effective_at: string;
};

type CatalogCacheRow = Record<string, unknown> & {
  version: number;
};

function mapCategory(row: CatalogCategoryRow): CatalogCategory {
  return createCatalogCategory({
    id: row.id,
    name: row.name,
    slug: row.slug,
    active: row.active === 1,
  });
}

function mapSku(row: CatalogSkuRow): CatalogSku {
  return createCatalogSku({
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
}

export function createDefaultCatalogReader(): InMemoryCatalogReader {
  const freshProduce = createCatalogCategory({
    id: "fresh-produce",
    name: "Fresh produce",
    slug: "fresh-produce",
    active: true,
  });
  const pantry = createCatalogCategory({
    id: "pantry-staples",
    name: "Pantry staples",
    slug: "pantry-staples",
    active: true,
  });

  return new InMemoryCatalogReader({
    categories: [freshProduce, pantry],
    items: [
      createCatalogSku({
        id: "sku-bananas",
        categoryId: freshProduce.id,
        name: "Lakatan bananas",
        slug: "lakatan-bananas",
        description: "Sweet local bananas for breakfast and snacks.",
        unit: "kilogram",
        imageUrl: null,
        price: { centavos: 12_500, currency: "PHP" },
        active: true,
      }),
      createCatalogSku({
        id: "sku-oats",
        categoryId: pantry.id,
        name: "Rolled oats",
        slug: "rolled-oats",
        description: "Whole-grain oats in a resealable pack.",
        unit: "pack",
        imageUrl: null,
        price: { centavos: 18_000, currency: "PHP" },
        active: true,
      }),
      createCatalogSku({
        id: "sku-hidden",
        categoryId: pantry.id,
        name: "Internal test item",
        slug: "internal-test-item",
        description: "Not publicly listed.",
        unit: "piece",
        imageUrl: null,
        price: { centavos: 1_00, currency: "PHP" },
        active: false,
      }),
    ],
  });
}
