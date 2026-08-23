CREATE TABLE customer_saved_items (
  customer_id TEXT NOT NULL,
  sku_id TEXT NOT NULL,
  saved_at TEXT NOT NULL,
  PRIMARY KEY (customer_id, sku_id)
);

CREATE INDEX customer_saved_items_customer_saved_at_idx
  ON customer_saved_items (customer_id, saved_at DESC);
