-- 0207: Link campaign_formats to Instagram posts for automated metric sync
--
-- instagram_post_url  : URL do post (ex: https://www.instagram.com/p/ABC123/)
-- instagram_media_id  : ID numérico do media no Graph API (cached após primeiro sync)
-- last_metrics_synced_at : timestamp do último sync bem-sucedido

ALTER TABLE campaign_formats
  ADD COLUMN IF NOT EXISTS instagram_post_url    TEXT,
  ADD COLUMN IF NOT EXISTS instagram_media_id    TEXT,
  ADD COLUMN IF NOT EXISTS last_metrics_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_campaign_formats_instagram_media
  ON campaign_formats (instagram_media_id)
  WHERE instagram_media_id IS NOT NULL;
