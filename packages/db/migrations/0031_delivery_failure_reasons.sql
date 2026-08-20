ALTER TABLE delivery_events ADD COLUMN failure_reason TEXT;

CREATE INDEX delivery_events_failure_idx ON delivery_events (type, failure_reason, occurred_at);
