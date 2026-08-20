ALTER TABLE orders ADD COLUMN applied_promotion_json TEXT;
ALTER TABLE orders ADD COLUMN discount_centavos INTEGER NOT NULL DEFAULT 0;
