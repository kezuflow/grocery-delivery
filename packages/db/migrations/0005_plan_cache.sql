CREATE TABLE plan_cache_state (
  id TEXT PRIMARY KEY NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  updated_at TEXT NOT NULL
);

INSERT INTO plan_cache_state (id, version, updated_at)
VALUES ('public', 1, '2026-08-18T00:00:00.000Z');
