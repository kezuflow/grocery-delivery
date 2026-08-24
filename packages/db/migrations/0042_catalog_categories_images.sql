PRAGMA foreign_keys = ON;

CREATE TABLE catalog_sku_categories (
  sku_id TEXT NOT NULL REFERENCES catalog_skus(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES catalog_categories(id),
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at TEXT NOT NULL,
  PRIMARY KEY (sku_id, category_id)
);

INSERT INTO catalog_sku_categories (sku_id, category_id, position, created_at)
SELECT id, category_id, 0, created_at
FROM catalog_skus;

CREATE INDEX catalog_sku_categories_category_sku_idx
  ON catalog_sku_categories (category_id, sku_id);

CREATE TABLE catalog_images (
  id TEXT PRIMARY KEY NOT NULL,
  file_name TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5242880),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready')),
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX catalog_images_status_created_idx
  ON catalog_images (status, created_at DESC);
