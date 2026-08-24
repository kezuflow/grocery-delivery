ALTER TABLE catalog_skus
ADD COLUMN lifecycle_status TEXT NOT NULL DEFAULT 'active'
  CHECK (lifecycle_status IN ('active', 'paused', 'archived'));

UPDATE catalog_skus
SET lifecycle_status = CASE WHEN active = 1 THEN 'active' ELSE 'paused' END;

CREATE TABLE catalog_admin_commands (
  idempotency_key TEXT PRIMARY KEY NOT NULL,
  fingerprint TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX catalog_skus_lifecycle_status_idx
  ON catalog_skus (lifecycle_status, updated_at DESC);
