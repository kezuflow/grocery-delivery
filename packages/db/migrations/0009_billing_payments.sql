CREATE TABLE payment_attempts (
  id TEXT PRIMARY KEY NOT NULL,
  customer_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  amount_centavos INTEGER NOT NULL CHECK (amount_centavos > 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed')),
  provider_reference TEXT,
  failure_code TEXT,
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (customer_id, idempotency_key)
);

CREATE INDEX payment_attempts_order_idx
  ON payment_attempts (order_id, created_at DESC);

CREATE TABLE payment_webhook_events (
  id TEXT PRIMARY KEY NOT NULL,
  provider_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  data_json TEXT NOT NULL,
  received_at TEXT NOT NULL,
  UNIQUE (provider_name, id)
);

CREATE TABLE payment_refunds (
  id TEXT PRIMARY KEY NOT NULL,
  customer_id TEXT NOT NULL,
  payment_attempt_id TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  provider_reference TEXT,
  amount_centavos INTEGER NOT NULL CHECK (amount_centavos > 0),
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed')),
  reason TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (customer_id, idempotency_key)
);

CREATE INDEX payment_refunds_attempt_idx
  ON payment_refunds (payment_attempt_id, created_at DESC);

CREATE TABLE payment_ledger_entries (
  id TEXT PRIMARY KEY NOT NULL,
  customer_id TEXT NOT NULL,
  payment_attempt_id TEXT,
  refund_id TEXT,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('charge', 'refund', 'adjustment')),
  direction TEXT NOT NULL CHECK (direction IN ('debit', 'credit')),
  amount_centavos INTEGER NOT NULL CHECK (amount_centavos > 0),
  occurred_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL
);

CREATE INDEX payment_ledger_customer_idx
  ON payment_ledger_entries (customer_id, occurred_at DESC);
