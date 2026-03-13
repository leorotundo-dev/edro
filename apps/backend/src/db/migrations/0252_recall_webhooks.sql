CREATE TABLE IF NOT EXISTS recall_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id TEXT,
  webhook_timestamp TEXT,
  event_type TEXT NOT NULL,
  bot_id TEXT,
  recording_id TEXT,
  transcript_id TEXT,
  tenant_id TEXT,
  client_id TEXT,
  meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  raw_body TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_recall_webhook_events_webhook_id
  ON recall_webhook_events(webhook_id)
  WHERE webhook_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recall_webhook_events_bot_id
  ON recall_webhook_events(bot_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recall_webhook_events_meeting_id
  ON recall_webhook_events(meeting_id, created_at DESC);
