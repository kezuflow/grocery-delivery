ALTER TABLE outbox_events ADD COLUMN claimed_at TEXT;
ALTER TABLE outbox_events ADD COLUMN claim_token TEXT;
ALTER TABLE outbox_events ADD COLUMN next_attempt_at TEXT;
ALTER TABLE outbox_events ADD COLUMN last_error TEXT;
ALTER TABLE outbox_events ADD COLUMN dead_lettered_at TEXT;

CREATE INDEX outbox_events_claim_idx
  ON outbox_events (published_at, dead_lettered_at, next_attempt_at, claimed_at, occurred_at);
