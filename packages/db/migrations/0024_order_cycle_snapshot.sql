ALTER TABLE orders ADD COLUMN cycle_id TEXT NOT NULL DEFAULT 'cycle-legacy';

CREATE INDEX orders_cycle_idx ON orders (cycle_id, locked_at DESC);
