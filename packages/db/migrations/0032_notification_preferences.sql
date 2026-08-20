CREATE TABLE notification_preferences (
  customer_id TEXT PRIMARY KEY,
  delivery_updates INTEGER NOT NULL DEFAULT 1 CHECK (delivery_updates IN (0, 1)),
  marketing INTEGER NOT NULL DEFAULT 0 CHECK (marketing IN (0, 1)),
  updated_at TEXT NOT NULL
);
