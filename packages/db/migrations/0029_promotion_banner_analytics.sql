CREATE TABLE promotion_banner_analytics (
  event_id TEXT PRIMARY KEY NOT NULL,
  banner_id TEXT NOT NULL REFERENCES promotion_banners(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click')),
  occurred_at TEXT NOT NULL
);

CREATE INDEX promotion_banner_analytics_banner_idx ON promotion_banner_analytics (banner_id, event_type, occurred_at);
