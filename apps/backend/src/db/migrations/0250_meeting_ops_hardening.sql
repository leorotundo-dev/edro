-- 0250_meeting_ops_hardening.sql
-- Operational hardening for meetings pipeline: state machine, audit trail, idempotency

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS source_ref_id TEXT,
  ADD COLUMN IF NOT EXISTS bot_provider TEXT,
  ADD COLUMN IF NOT EXISTS bot_id TEXT,
  ADD COLUMN IF NOT EXISTS bot_status TEXT,
  ADD COLUMN IF NOT EXISTS transcript_provider TEXT,
  ADD COLUMN IF NOT EXISTS transcript_hash TEXT,
  ADD COLUMN IF NOT EXISTS analysis_version INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS failed_stage TEXT,
  ADD COLUMN IF NOT EXISTS failed_reason TEXT,
  ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS summary_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE meetings
   SET source = CASE
     WHEN source IS NOT NULL THEN source
     WHEN platform = 'upload' THEN 'upload'
     WHEN audio_key LIKE 'recall:%' THEN 'calendar'
     ELSE 'manual_bot'
   END
 WHERE source IS NULL;

UPDATE meetings
   SET status = CASE
     WHEN status = 'processing' AND transcript IS NULL THEN 'transcript_pending'
     WHEN status = 'processing' AND transcript IS NOT NULL THEN 'analysis_pending'
     WHEN status = 'analyzed' THEN 'approval_pending'
     WHEN status = 'approved' THEN 'completed'
     ELSE status
   END
 WHERE status IN ('processing', 'analyzed', 'approved');

ALTER TABLE meeting_actions
  ADD COLUMN IF NOT EXISTS analysis_version INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS excerpt_hash TEXT,
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS execution_status TEXT,
  ADD COLUMN IF NOT EXISTS execution_error TEXT,
  ADD COLUMN IF NOT EXISTS system_item_type TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE calendar_auto_joins
  ADD COLUMN IF NOT EXISTS client_id TEXT,
  ADD COLUMN IF NOT EXISTS bot_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'detected',
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS attempt_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE calendar_auto_joins
   SET status = CASE
     WHEN processed_at IS NOT NULL THEN 'done'
     WHEN meeting_id IS NOT NULL AND bot_id IS NOT NULL THEN 'bot_created'
     WHEN meeting_id IS NOT NULL THEN 'meeting_created'
     WHEN job_enqueued_at IS NOT NULL THEN 'queued'
     ELSE 'detected'
   END
 WHERE status IS NULL OR status = 'detected';

CREATE TABLE IF NOT EXISTS meeting_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  stage TEXT,
  status TEXT,
  message TEXT,
  actor_type TEXT,
  actor_id TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meetings_status_recorded
  ON meetings(tenant_id, status, recorded_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_meetings_bot_id_unique
  ON meetings(bot_id)
  WHERE bot_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meeting_actions_version_status
  ON meeting_actions(meeting_id, analysis_version, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_actions_dedupe
  ON meeting_actions(meeting_id, analysis_version, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_auto_joins_status
  ON calendar_auto_joins(tenant_id, status, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_meeting_events_meeting_time
  ON meeting_events(meeting_id, created_at DESC);

COMMENT ON TABLE meeting_events IS
  'Operational audit trail for meetings pipeline: scheduling, bot lifecycle, transcript, analysis and delivery.';
