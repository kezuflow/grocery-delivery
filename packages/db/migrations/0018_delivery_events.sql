CREATE TABLE delivery_events (
  id TEXT PRIMARY KEY NOT NULL,
  client_event_id TEXT NOT NULL UNIQUE,
  assignment_id TEXT NOT NULL REFERENCES dispatch_assignments(id),
  order_id TEXT NOT NULL REFERENCES orders(id),
  deliveryman_user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('picked_up', 'arrived', 'delivered', 'failed')),
  occurred_at TEXT NOT NULL,
  received_at TEXT NOT NULL,
  note TEXT
);

CREATE INDEX delivery_events_assignment_idx ON delivery_events (assignment_id, occurred_at);
