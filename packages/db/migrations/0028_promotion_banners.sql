CREATE TABLE promotion_banners (
  id TEXT PRIMARY KEY NOT NULL,
  placement TEXT NOT NULL CHECK (placement IN ('home-hero', 'storefront-strip', 'account-banner')),
  title TEXT NOT NULL,
  copy TEXT NOT NULL,
  cta_label TEXT NOT NULL,
  cta_destination TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  priority INTEGER NOT NULL CHECK (priority >= 0),
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  desktop_object_key TEXT NOT NULL,
  mobile_object_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'expired', 'archived')),
  cache_version INTEGER NOT NULL CHECK (cache_version > 0),
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX promotion_banners_active_idx ON promotion_banners (placement, status, starts_at, ends_at, priority);
