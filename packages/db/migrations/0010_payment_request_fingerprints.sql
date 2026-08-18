ALTER TABLE payment_attempts
  ADD COLUMN request_fingerprint TEXT NOT NULL DEFAULT '';

ALTER TABLE payment_refunds
  ADD COLUMN request_fingerprint TEXT NOT NULL DEFAULT '';
