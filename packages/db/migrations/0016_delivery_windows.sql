CREATE TABLE delivery_windows (
  id TEXT PRIMARY KEY NOT NULL,
  cycle_id TEXT NOT NULL,
  label TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE delivery_window_selections (
  customer_id TEXT NOT NULL,
  cycle_id TEXT NOT NULL,
  window_id TEXT NOT NULL REFERENCES delivery_windows(id),
  selected_at TEXT NOT NULL,
  PRIMARY KEY (customer_id, cycle_id)
);

CREATE INDEX delivery_windows_cycle_idx ON delivery_windows (cycle_id, starts_at);
CREATE INDEX delivery_window_selections_window_idx ON delivery_window_selections (window_id, cycle_id);
