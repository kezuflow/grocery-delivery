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
  afterId?: string;
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

export type CatalogPage = Readonly<{
  cacheVersion: string;
  categories: readonly CatalogCategory[];
  items: readonly CatalogSku[];
  nextAfterId: string | null;
}>;

export interface CatalogReader {
  listPublic(query: CatalogQuery): Promise<CatalogPage>;
}

export interface CatalogPricingRepository {
  listMarkupCandidates(skuId: string, effectiveAt: string): Promise<readonly CatalogMarkupRule[]>;
  recordPrice(entry: CatalogPriceHistoryEntry): Promise<void>;
}

export class InMemoryCatalogReader implements CatalogReader {
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
        categories: this.categories.filter((candidate) => candidate.active),
        items: [],
        nextAfterId: null,
      });
    }
    const categoryItems = this.items.filter(
      (item) => item.active && (!category || item.categoryId === category.id),
    );
    const afterId = query.afterId;
    const start = afterId
      ? (() => {
          const nextIndex = categoryItems.findIndex((item) => item.id > afterId);
          return nextIndex === -1 ? categoryItems.length : nextIndex;
        })()
      : 0;
    const items = categoryItems.slice(start, start + query.limit);
    const lastItem = items.at(-1);

    return Promise.resolve({
      cacheVersion: this.cacheVersion,
      categories: this.categories.filter((candidate) => candidate.active),
      items,
      nextAfterId: start + items.length < categoryItems.length ? (lastItem?.id ?? null) : null,
    });
  }
}

export class D1CatalogReader implements CatalogReader {
  constructor(private readonly database: CatalogDatabase) {}

  async listPublic(query: CatalogQuery): Promise<CatalogPage> {
    const categoryRows = await this.database
      .prepare(
        `SELECT id, name, slug, active
         FROM catalog_categories
         WHERE active = 1
         ORDER BY slug ASC`,
      )
      .bind()
      .all<CatalogCategoryRow>();
    const itemSql = query.categorySlug
      ? `SELECT s.id, s.category_id, s.name, s.slug, s.description, s.unit,
                s.image_url, s.current_price_centavos, s.active
         FROM catalog_skus s
         INNER JOIN catalog_categories c ON c.id = s.category_id
         WHERE s.active = 1 AND c.active = 1 AND c.slug = ?
           AND (? IS NULL OR s.id > ?)
         ORDER BY s.id ASC
         LIMIT ?`
      : `SELECT s.id, s.category_id, s.name, s.slug, s.description, s.unit,
                s.image_url, s.current_price_centavos, s.active
         FROM catalog_skus s
         INNER JOIN catalog_categories c ON c.id = s.category_id
         WHERE s.active = 1 AND c.active = 1
           AND (? IS NULL OR s.id > ?)
         ORDER BY s.id ASC
         LIMIT ?`;
    const itemValues = query.categorySlug
      ? [query.categorySlug, query.afterId ?? null, query.afterId ?? null, query.limit + 1]
      : [query.afterId ?? null, query.afterId ?? null, query.limit + 1];
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
    };
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

export function createDefaultCatalogReader(): CatalogReader {
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
