CREATE TABLE payment_method_revocations (
  id TEXT PRIMARY KEY NOT NULL,
  customer_id TEXT NOT NULL,
  payment_method_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (customer_id, idempotency_key)
);

CREATE INDEX payment_method_revocations_method_idx
  ON payment_method_revocations (customer_id, payment_method_id, created_at DESC);
