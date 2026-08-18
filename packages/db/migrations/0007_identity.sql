CREATE TABLE identity_users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0 CHECK (email_verified IN (0, 1)),
  image_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE identity_role_assignments (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES identity_users(id),
  role TEXT NOT NULL CHECK (role IN ('customer', 'deliveryman', 'admin')),
  customer_id TEXT,
  admin_permissions_json TEXT NOT NULL DEFAULT '[]',
  mfa_required INTEGER NOT NULL DEFAULT 0 CHECK (mfa_required IN (0, 1)),
  assigned_at TEXT NOT NULL,
  CHECK ((role = 'customer' AND customer_id IS NOT NULL) OR (role <> 'customer' AND customer_id IS NULL))
);

CREATE TABLE identity_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES identity_users(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX identity_sessions_user_expiry_idx
  ON identity_sessions (user_id, expires_at);

CREATE TABLE identity_consents (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES identity_users(id),
  purpose TEXT NOT NULL CHECK (purpose IN ('privacy', 'marketing')),
  granted INTEGER NOT NULL CHECK (granted IN (0, 1)),
  policy_version TEXT NOT NULL,
  recorded_at TEXT NOT NULL
);

CREATE INDEX identity_consents_user_purpose_idx
  ON identity_consents (user_id, purpose, recorded_at DESC);

CREATE TABLE identity_mfa_challenges (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES identity_users(id),
  purpose TEXT NOT NULL CHECK (purpose IN ('payment', 'admin', 'session')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'verified', 'expired')),
  expires_at TEXT NOT NULL,
  verified_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX identity_mfa_user_status_idx
  ON identity_mfa_challenges (user_id, status, expires_at);

CREATE TABLE audit_events (
  id TEXT PRIMARY KEY NOT NULL,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  occurred_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX audit_events_target_idx
  ON audit_events (target_type, target_id, occurred_at DESC);
