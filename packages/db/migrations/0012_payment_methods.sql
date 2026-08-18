CREATE TABLE payment_methods (
  id TEXT PRIMARY KEY NOT NULL,
  customer_id TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  provider_reference TEXT NOT NULL,
  method_type TEXT NOT NULL CHECK (method_type IN ('card', 'bank_account', 'ewallet')),
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked')),
  idempotency_key TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (customer_id, idempotency_key),
  UNIQUE (provider_name, provider_reference)
);

CREATE INDEX payment_methods_customer_idx
  ON payment_methods (customer_id, status, created_at ASC);
