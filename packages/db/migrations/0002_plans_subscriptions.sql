CREATE TABLE plans (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL UNIQUE CHECK (length(code) > 0),
  name TEXT NOT NULL,
  weekly_fee_centavos INTEGER NOT NULL CHECK (weekly_fee_centavos >= 0),
  weekly_credit_centavos INTEGER NOT NULL CHECK (weekly_credit_centavos >= 0),
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO plans (
  id, code, name, weekly_fee_centavos, weekly_credit_centavos, display_order, active, created_at, updated_at
) VALUES
  ('plan-small', 'small', 'Small', 69900, 69900, 10, 1, '2026-08-18T00:00:00.000Z', '2026-08-18T00:00:00.000Z'),
  ('plan-medium', 'medium', 'Medium', 99900, 99900, 20, 1, '2026-08-18T00:00:00.000Z', '2026-08-18T00:00:00.000Z'),
  ('plan-large', 'large', 'Large', 139900, 139900, 30, 1, '2026-08-18T00:00:00.000Z', '2026-08-18T00:00:00.000Z');

CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY NOT NULL,
  customer_id TEXT NOT NULL UNIQUE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'canceled')),
  skipped_cycle_id TEXT,
  last_action TEXT CHECK (last_action IN ('pause', 'resume', 'skip', 'cancel')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE subscription_idempotency (
  idempotency_key TEXT PRIMARY KEY NOT NULL,
  customer_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
  created_at TEXT NOT NULL
);

CREATE INDEX subscriptions_status_updated_idx
  ON subscriptions (status, updated_at);
