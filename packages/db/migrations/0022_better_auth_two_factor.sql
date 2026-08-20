ALTER TABLE better_auth_user
  ADD COLUMN two_factor_enabled INTEGER NOT NULL DEFAULT 0 CHECK (two_factor_enabled IN (0, 1));

CREATE TABLE better_auth_two_factor (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL UNIQUE REFERENCES better_auth_user(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  backup_codes TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 1 CHECK (verified IN (0, 1)),
  failed_verification_count INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER
);

CREATE INDEX better_auth_two_factor_secret_idx ON better_auth_two_factor (secret);
