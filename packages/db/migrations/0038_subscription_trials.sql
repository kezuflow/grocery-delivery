ALTER TABLE subscriptions ADD COLUMN trial_started_at TEXT;
ALTER TABLE subscriptions ADD COLUMN trial_ends_at TEXT;

CREATE TABLE customer_trials (
  customer_id TEXT PRIMARY KEY NOT NULL,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
  started_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
