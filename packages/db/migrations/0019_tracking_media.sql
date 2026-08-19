CREATE TABLE delivery_media (
  id TEXT PRIMARY KEY NOT NULL,
  client_media_id TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL REFERENCES orders(id),
  assignment_id TEXT NOT NULL REFERENCES dispatch_assignments(id),
  uploaded_by_user_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('proof_of_delivery')),
  object_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  created_at TEXT NOT NULL
);

CREATE INDEX delivery_media_order_idx ON delivery_media (order_id, created_at);
