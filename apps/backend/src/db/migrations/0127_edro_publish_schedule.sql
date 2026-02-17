-- Schedule publication of approved copies from Edro briefings
CREATE TABLE IF NOT EXISTS edro_publish_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_id UUID NOT NULL,
  copy_id UUID NOT NULL,
  channel TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  payload JSONB DEFAULT '{}',
  error_message TEXT,
  published_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- status: scheduled, processing, published, failed, cancelled

CREATE INDEX IF NOT EXISTS idx_edro_publish_schedule_status
  ON edro_publish_schedule(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_edro_publish_schedule_briefing
  ON edro_publish_schedule(briefing_id);
