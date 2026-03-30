-- Scheduled posts from Pipeline Studio ScheduleNode
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL,
  briefing_id   UUID,
  platform      TEXT        NOT NULL,
  scheduled_at  TIMESTAMPTZ NOT NULL,
  copy_text     TEXT,
  image_url     TEXT,
  status        TEXT        NOT NULL DEFAULT 'pending',
  published_at  TIMESTAMPTZ,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- status: pending | published | failed | cancelled

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_tenant_status
  ON scheduled_posts(tenant_id, status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_briefing
  ON scheduled_posts(briefing_id) WHERE briefing_id IS NOT NULL;
