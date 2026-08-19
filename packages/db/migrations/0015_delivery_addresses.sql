CREATE TABLE delivery_addresses (
  customer_id TEXT PRIMARY KEY NOT NULL,
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  line1 TEXT NOT NULL,
  line2 TEXT,
  barangay TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  instructions TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
