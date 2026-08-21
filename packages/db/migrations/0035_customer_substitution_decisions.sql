PRAGMA foreign_keys = ON;

CREATE TABLE customer_order_substitutions (
  id TEXT PRIMARY KEY NOT NULL,
  customer_id TEXT NOT NULL,
  order_id TEXT NOT NULL REFERENCES orders(id),
  shortage_id TEXT NOT NULL REFERENCES procurement_shortages(id),
  original_sku_id TEXT NOT NULL REFERENCES catalog_skus(id),
  procurement_substitution_id TEXT NOT NULL REFERENCES procurement_substitutions(id),
  substitute_sku_id TEXT NOT NULL REFERENCES catalog_skus(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  idempotency_key TEXT,
  request_fingerprint TEXT,
  decided_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (order_id, procurement_substitution_id, original_sku_id),
  UNIQUE (customer_id, idempotency_key)
);

CREATE INDEX customer_order_substitutions_customer_idx
  ON customer_order_substitutions (customer_id, updated_at DESC);
