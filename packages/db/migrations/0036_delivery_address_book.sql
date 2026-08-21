CREATE TABLE delivery_address_book (
  id TEXT PRIMARY KEY NOT NULL,
  customer_id TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  line1 TEXT NOT NULL,
  line2 TEXT,
  barangay TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  instructions TEXT,
  is_selected INTEGER NOT NULL DEFAULT 0 CHECK (is_selected IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO delivery_address_book (
  id, customer_id, recipient_name, phone, line1, line2, barangay, city, province,
  postal_code, instructions, is_selected, created_at, updated_at
)
SELECT customer_id || ':default', customer_id, recipient_name, phone, line1, line2,
       barangay, city, province, postal_code, instructions, 1, created_at, updated_at
FROM delivery_addresses;

CREATE INDEX delivery_address_book_customer_idx
  ON delivery_address_book (customer_id, is_selected DESC, updated_at DESC);

CREATE UNIQUE INDEX delivery_address_book_selected_idx
  ON delivery_address_book (customer_id) WHERE is_selected = 1;
