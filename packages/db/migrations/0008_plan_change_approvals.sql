CREATE TABLE plan_change_requests (
  id TEXT PRIMARY KEY NOT NULL,
  plan_id TEXT NOT NULL,
  plan_code TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  weekly_fee_centavos INTEGER NOT NULL CHECK (weekly_fee_centavos >= 0),
  weekly_credit_centavos INTEGER NOT NULL CHECK (weekly_credit_centavos >= 0),
  display_order INTEGER NOT NULL CHECK (display_order >= 0),
  active INTEGER NOT NULL CHECK (active IN (0, 1)),
  proposed_by_user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  decided_by_user_id TEXT,
  decision_reason TEXT,
  created_at TEXT NOT NULL,
  decided_at TEXT
);

CREATE INDEX plan_change_requests_status_created_idx
  ON plan_change_requests (status, created_at DESC);
