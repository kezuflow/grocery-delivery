PRAGMA foreign_keys = ON;

CREATE TABLE catalog_categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE catalog_skus (
  id TEXT PRIMARY KEY NOT NULL,
  category_id TEXT NOT NULL REFERENCES catalog_categories(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL CHECK (unit IN ('piece', 'gram', 'kilogram', 'milliliter', 'liter', 'pack')),
  image_url TEXT,
  current_procurement_cost_centavos INTEGER NOT NULL CHECK (current_procurement_cost_centavos >= 0),
  current_markup_basis_points INTEGER NOT NULL CHECK (current_markup_basis_points >= 0),
  current_price_centavos INTEGER NOT NULL CHECK (current_price_centavos >= 0),
  current_price_effective_at TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE catalog_markup_rules (
  id TEXT PRIMARY KEY NOT NULL,
  sku_id TEXT REFERENCES catalog_skus(id),
  basis_points INTEGER NOT NULL CHECK (basis_points >= 0 AND basis_points <= 1000000),
  effective_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (sku_id, effective_at)
);

CREATE TABLE catalog_price_history (
  id TEXT PRIMARY KEY NOT NULL,
  sku_id TEXT NOT NULL REFERENCES catalog_skus(id),
  procurement_cost_centavos INTEGER NOT NULL CHECK (procurement_cost_centavos >= 0),
  markup_basis_points INTEGER NOT NULL CHECK (markup_basis_points >= 0),
  price_centavos INTEGER NOT NULL CHECK (price_centavos >= 0),
  effective_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (sku_id, effective_at)
);

CREATE TABLE catalog_cache_state (
  id TEXT PRIMARY KEY NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  updated_at TEXT NOT NULL
);

INSERT INTO catalog_cache_state (id, version, updated_at)
VALUES ('public', 1, '2026-08-18T00:00:00.000Z');

CREATE INDEX catalog_skus_category_active_id_idx
  ON catalog_skus (category_id, active, id);
CREATE INDEX catalog_price_history_sku_effective_idx
  ON catalog_price_history (sku_id, effective_at DESC);
CREATE INDEX catalog_markup_rules_sku_effective_idx
  ON catalog_markup_rules (sku_id, effective_at DESC);
