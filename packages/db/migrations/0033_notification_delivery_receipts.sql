CREATE TABLE notification_delivery_receipts (
  idempotency_key TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  provider_reference TEXT,
  accepted_at TEXT NOT NULL
);

CREATE INDEX notification_delivery_receipts_aggregate_idx
  ON notification_delivery_receipts (aggregate_id, accepted_at);
