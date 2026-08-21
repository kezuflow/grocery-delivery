CREATE TABLE customer_order_requests (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('cancellation', 'refund')),
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  idempotency_key TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (customer_id, idempotency_key)
);

CREATE INDEX customer_order_requests_customer_idx
  ON customer_order_requests (customer_id, updated_at DESC);
CREATE INDEX customer_order_requests_order_idx
  ON customer_order_requests (order_id, updated_at DESC);
