ALTER TABLE subscriptions
  ADD COLUMN billing_status TEXT NOT NULL DEFAULT 'current'
  CHECK (billing_status IN ('current', 'past_due'));

ALTER TABLE subscriptions
  ADD COLUMN effective_cycle_id TEXT;

CREATE INDEX subscriptions_billing_status_updated_idx
  ON subscriptions (billing_status, updated_at);
