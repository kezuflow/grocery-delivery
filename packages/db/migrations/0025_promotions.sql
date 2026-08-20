CREATE TABLE promotions (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT UNIQUE,
  version INTEGER NOT NULL CHECK (version > 0),
  status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'expired', 'archived')),
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  discount_json TEXT NOT NULL,
  minimum_subtotal_centavos INTEGER,
  plan_ids_json TEXT NOT NULL,
  sku_ids_json TEXT NOT NULL,
  category_ids_json TEXT NOT NULL,
  first_order_only INTEGER NOT NULL CHECK (first_order_only IN (0, 1)),
  first_week_only INTEGER NOT NULL CHECK (first_week_only IN (0, 1)),
  total_budget_centavos INTEGER,
  total_redemptions INTEGER,
  per_customer_redemptions INTEGER,
  redeemed_amount_centavos INTEGER NOT NULL DEFAULT 0 CHECK (redeemed_amount_centavos >= 0),
  redemption_count INTEGER NOT NULL DEFAULT 0 CHECK (redemption_count >= 0),
  allows_stacking INTEGER NOT NULL CHECK (allows_stacking IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE promotion_redemptions (
  id TEXT PRIMARY KEY NOT NULL,
  promotion_id TEXT NOT NULL REFERENCES promotions(id),
  customer_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (customer_id, idempotency_key)
);

CREATE INDEX promotions_active_code_idx ON promotions (code, status);
CREATE INDEX promotion_redemptions_customer_idx ON promotion_redemptions (promotion_id, customer_id);

CREATE TRIGGER promotion_redemptions_enforce_limits
BEFORE INSERT ON promotion_redemptions
BEGIN
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM promotions
      WHERE id = NEW.promotion_id
        AND total_redemptions IS NOT NULL
        AND redemption_count >= total_redemptions
    ) THEN RAISE(ABORT, 'promotion redemption limit was reached')
  END;
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM promotions
      WHERE id = NEW.promotion_id
        AND total_budget_centavos IS NOT NULL
        AND redeemed_amount_centavos + json_extract(NEW.result_json, '$.discount.centavos') > total_budget_centavos
    ) THEN RAISE(ABORT, 'promotion budget was exhausted')
  END;
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM promotions
      WHERE id = NEW.promotion_id
        AND per_customer_redemptions IS NOT NULL
        AND (
          SELECT COUNT(*) FROM promotion_redemptions
          WHERE promotion_id = NEW.promotion_id AND customer_id = NEW.customer_id
        ) >= per_customer_redemptions
    ) THEN RAISE(ABORT, 'customer redemption limit was reached')
  END;
END;

CREATE TRIGGER promotion_redemptions_update_totals
AFTER INSERT ON promotion_redemptions
BEGIN
  UPDATE promotions
  SET redeemed_amount_centavos = redeemed_amount_centavos + json_extract(NEW.result_json, '$.discount.centavos'),
      redemption_count = redemption_count + 1,
      updated_at = NEW.created_at
  WHERE id = NEW.promotion_id;
END;
