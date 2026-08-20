ALTER TABLE orders ADD COLUMN delivery_address_json TEXT;
ALTER TABLE orders ADD COLUMN delivery_window_json TEXT;
ALTER TABLE orders ADD COLUMN payment_state TEXT NOT NULL DEFAULT 'unpaid';
