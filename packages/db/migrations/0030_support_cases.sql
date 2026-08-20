CREATE TABLE support_cases (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved')),
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (customer_id, idempotency_key)
);

CREATE INDEX support_cases_customer_idx ON support_cases (customer_id, updated_at DESC);
CREATE INDEX support_cases_status_idx ON support_cases (status, updated_at DESC);
