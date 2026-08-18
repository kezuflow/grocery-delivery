CREATE TABLE payment_reconciliation_discrepancies (
  id TEXT PRIMARY KEY NOT NULL,
  provider_name TEXT NOT NULL,
  reference TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('charge', 'refund')),
  discrepancy_kind TEXT NOT NULL CHECK (
    discrepancy_kind IN (
      'missing_provider_entry',
      'unexpected_provider_entry',
      'status_mismatch',
      'amount_mismatch'
    )
  ),
  expected_status TEXT,
  actual_status TEXT,
  expected_amount_centavos INTEGER,
  actual_amount_centavos INTEGER,
  observed_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (provider_name, reference, discrepancy_kind, observed_at)
);

CREATE INDEX payment_reconciliation_provider_idx
  ON payment_reconciliation_discrepancies (provider_name, observed_at DESC);
