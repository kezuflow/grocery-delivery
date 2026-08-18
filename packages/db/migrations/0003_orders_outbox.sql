PRAGMA foreign_keys = ON;

CREATE TABLE orders (
  id TEXT PRIMARY KEY NOT NULL,
  customer_id TEXT NOT NULL,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
  plan_id TEXT NOT NULL REFERENCES plans(id),
  idempotency_key TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  weekly_credit_centavos INTEGER NOT NULL CHECK (weekly_credit_centavos >= 0),
  subtotal_centavos INTEGER NOT NULL CHECK (subtotal_centavos >= 0),
  weekly_fee_centavos INTEGER NOT NULL CHECK (weekly_fee_centavos >= 0),
  included_credit_centavos INTEGER NOT NULL CHECK (included_credit_centavos >= 0),
  overage_centavos INTEGER NOT NULL CHECK (overage_centavos >= 0),
  delivery_fee_centavos INTEGER NOT NULL CHECK (delivery_fee_centavos >= 0),
  total_due_centavos INTEGER NOT NULL CHECK (total_due_centavos >= 0),
  status TEXT NOT NULL CHECK (status IN ('locked', 'canceled')),
  locked_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (customer_id, idempotency_key)
);

CREATE TABLE order_lines (
  order_id TEXT NOT NULL REFERENCES orders(id),
  line_number INTEGER NOT NULL CHECK (line_number > 0),
  sku_id TEXT NOT NULL REFERENCES catalog_skus(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_centavos INTEGER NOT NULL CHECK (unit_price_centavos >= 0),
  PRIMARY KEY (order_id, line_number)
);

CREATE TABLE outbox_events (
  id TEXT PRIMARY KEY NOT NULL,
  event_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  published_at TEXT
);

CREATE INDEX orders_customer_locked_at_idx
  ON orders (customer_id, locked_at DESC);
CREATE INDEX outbox_events_pending_idx
  ON outbox_events (published_at, occurred_at);
