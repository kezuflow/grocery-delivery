CREATE TABLE identity_command_idempotency (
  user_id TEXT NOT NULL REFERENCES identity_users(id),
  command TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, command, idempotency_key)
);
