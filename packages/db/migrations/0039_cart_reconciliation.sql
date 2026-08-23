ALTER TABLE cart_lines ADD COLUMN unit_price_centavos INTEGER
  CHECK (unit_price_centavos IS NULL OR unit_price_centavos >= 0);

ALTER TABLE cart_lines ADD COLUMN substitution_preference TEXT NOT NULL DEFAULT 'best_match'
  CHECK (substitution_preference IN ('best_match', 'refund'));
