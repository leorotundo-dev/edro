-- Capture platform-native publication identifiers so downstream metrics can be
-- matched back to the copy/briefing that generated the post.

ALTER TABLE IF EXISTS publish_queue
  ADD COLUMN IF NOT EXISTS platform_post_id TEXT,
  ADD COLUMN IF NOT EXISTS platform_post_url TEXT;

ALTER TABLE IF EXISTS scheduled_publications
  ADD COLUMN IF NOT EXISTS platform_post_id TEXT,
  ADD COLUMN IF NOT EXISTS platform_post_url TEXT;

ALTER TABLE IF EXISTS edro_publish_schedule
  ADD COLUMN IF NOT EXISTS platform_post_id TEXT,
  ADD COLUMN IF NOT EXISTS platform_post_url TEXT;

ALTER TABLE IF EXISTS creative_publication_intents
  ADD COLUMN IF NOT EXISTS platform_post_id TEXT,
  ADD COLUMN IF NOT EXISTS platform_post_url TEXT;

ALTER TABLE IF EXISTS post_assets
  ADD COLUMN IF NOT EXISTS external_post_id TEXT;

CREATE INDEX IF NOT EXISTS idx_publish_queue_platform_post_id
  ON publish_queue (platform_post_id)
  WHERE platform_post_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scheduled_publications_platform_post_id
  ON scheduled_publications (platform_post_id)
  WHERE platform_post_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_edro_publish_schedule_platform_post_id
  ON edro_publish_schedule (platform_post_id)
  WHERE platform_post_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_creative_publication_intents_platform_post_id
  ON creative_publication_intents (platform_post_id)
  WHERE platform_post_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_post_assets_external_post_id
  ON post_assets (external_post_id)
  WHERE external_post_id IS NOT NULL;
