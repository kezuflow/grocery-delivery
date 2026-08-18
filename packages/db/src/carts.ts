import { DomainValidationError } from "@carbon/domain";

import type { CatalogDatabase, CatalogPreparedStatement } from "./catalog.js";

export type CartDatabase = CatalogDatabase;

export type CartDraftLine = Readonly<{
  skuId: string;
  quantity: number;
}>;

export type CartDraft = Readonly<{
  customerId: string;
  lines: readonly CartDraftLine[];
  updatedAt: string;
}>;

export interface CartRepository {
  findByCustomerId(customerId: string): Promise<CartDraft | null>;
  save(cart: CartDraft): Promise<void>;
  clear(customerId: string): Promise<void>;
}

export class InMemoryCartRepository implements CartRepository {
  private readonly carts = new Map<string, CartDraft>();

  findByCustomerId(customerId: string): Promise<CartDraft | null> {
    return Promise.resolve(this.carts.get(customerId) ?? null);
  }

  save(cart: CartDraft): Promise<void> {
    const normalized = normalizeCart(cart);
    this.carts.set(normalized.customerId, normalized);
    return Promise.resolve();
  }

  clear(customerId: string): Promise<void> {
    this.carts.delete(customerId);
    return Promise.resolve();
  }
}

export class D1CartRepository implements CartRepository {
  constructor(private readonly database: CartDatabase) {}

  async findByCustomerId(customerId: string): Promise<CartDraft | null> {
    const cartRows = await this.database
      .prepare(
        `SELECT customer_id, updated_at
         FROM carts
         WHERE customer_id = ?
         LIMIT 1`,
      )
      .bind(customerId)
      .all<CartRow>();
    const cart = cartRows.results[0];
    if (!cart) {
      return null;
    }
    const lines = await this.database
      .prepare(
        `SELECT sku_id, quantity
         FROM cart_lines
         WHERE customer_id = ?
         ORDER BY line_number ASC`,
      )
      .bind(customerId)
      .all<CartLineRow>();
    return normalizeCart({
      customerId: cart.customer_id,
      lines: lines.results.map((line) => ({
        skuId: line.sku_id,
        quantity: line.quantity,
      })),
      updatedAt: cart.updated_at,
    });
  }

  async save(cart: CartDraft): Promise<void> {
    const normalized = normalizeCart(cart);
    const statements: CatalogPreparedStatement[] = [
      this.database
        .prepare(
          `INSERT INTO carts (customer_id, updated_at)
           VALUES (?, ?)
           ON CONFLICT(customer_id) DO UPDATE SET updated_at = excluded.updated_at`,
        )
        .bind(normalized.customerId, normalized.updatedAt),
      this.database
        .prepare(`DELETE FROM cart_lines WHERE customer_id = ?`)
        .bind(normalized.customerId),
      ...normalized.lines.map((line, index) =>
        this.database
          .prepare(
            `INSERT INTO cart_lines (customer_id, line_number, sku_id, quantity)
             VALUES (?, ?, ?, ?)`,
          )
          .bind(normalized.customerId, index + 1, line.skuId, line.quantity),
      ),
    ];
    await this.database.batch(statements);
  }

  async clear(customerId: string): Promise<void> {
    await this.database.batch([
      this.database.prepare(`DELETE FROM cart_lines WHERE customer_id = ?`).bind(customerId),
      this.database.prepare(`DELETE FROM carts WHERE customer_id = ?`).bind(customerId),
    ]);
  }
}

function normalizeCart(cart: CartDraft): CartDraft {
  if (!cart.customerId.trim()) {
    throw new DomainValidationError("INVALID_CART_CUSTOMER", "cart customer id must not be empty");
  }
  if (
    Number.isNaN(Date.parse(cart.updatedAt)) ||
    new Date(cart.updatedAt).toISOString() !== cart.updatedAt
  ) {
    throw new DomainValidationError("INVALID_TIMESTAMP", "cart updatedAt must be an ISO timestamp");
  }
  const lines = cart.lines.map((line) => {
    if (!line.skuId.trim()) {
      throw new DomainValidationError("INVALID_CART_SKU", "cart SKU id must not be empty");
    }
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 1_000) {
      throw new DomainValidationError("INVALID_QUANTITY", "cart quantity must be from 1 to 1000");
    }
    return Object.freeze({ skuId: line.skuId, quantity: line.quantity });
  });
  if (new Set(lines.map((line) => line.skuId)).size !== lines.length) {
    throw new DomainValidationError("DUPLICATE_CART_SKU", "cart cannot contain duplicate SKUs");
  }
  return Object.freeze({
    customerId: cart.customerId,
    lines: Object.freeze(lines),
    updatedAt: cart.updatedAt,
  });
}

type CartRow = Record<string, unknown> & { customer_id: string; updated_at: string };
type CartLineRow = Record<string, unknown> & { sku_id: string; quantity: number };
