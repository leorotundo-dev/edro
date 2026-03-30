-- client_posts: stores posts fetched from clients' own social media accounts.
-- Populated by clientPostsWorker via Meta Graph API (Instagram + Facebook).
-- Separate from social_listening_mentions (which tracks third-party mentions).

CREATE TABLE IF NOT EXISTS client_posts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id         TEXT        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  platform          TEXT        NOT NULL, -- instagram | facebook
  external_id       TEXT        NOT NULL, -- platform-specific post/media ID
  url               TEXT,
  caption           TEXT,
  media_type        TEXT,                 -- IMAGE | VIDEO | CAROUSEL_ALBUM | REEL
  media_url         TEXT,
  thumbnail_url     TEXT,

  -- engagement snapshot at last fetch
  likes_count       INTEGER     NOT NULL DEFAULT 0,
  comments_count    INTEGER     NOT NULL DEFAULT 0,
  shares_count      INTEGER     NOT NULL DEFAULT 0,
  impressions       INTEGER,
  reach             INTEGER,
  saves             INTEGER,
  video_views       INTEGER,
  engagement_rate   NUMERIC(5,2),

  published_at      TIMESTAMPTZ,
  fetched_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT client_posts_unique_platform_post UNIQUE (tenant_id, platform, external_id)
);

CREATE INDEX IF NOT EXISTS client_posts_client_date_idx
  ON client_posts (tenant_id, client_id, published_at DESC);

CREATE INDEX IF NOT EXISTS client_posts_platform_idx
  ON client_posts (tenant_id, client_id, platform);

-- Track when we last fetched the client's own posts (separate from metrics sync)
ALTER TABLE connectors
  ADD COLUMN IF NOT EXISTS posts_synced_at TIMESTAMPTZ;
