CREATE TABLE carts (
  customer_id TEXT PRIMARY KEY NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE cart_lines (
  customer_id TEXT NOT NULL REFERENCES carts(customer_id),
  line_number INTEGER NOT NULL CHECK (line_number > 0),
  sku_id TEXT NOT NULL REFERENCES catalog_skus(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 1000),
  PRIMARY KEY (customer_id, line_number),
  UNIQUE (customer_id, sku_id)
);

CREATE INDEX cart_lines_customer_idx ON cart_lines (customer_id, line_number);
