ALTER TABLE google_calendar_channels
  ADD COLUMN IF NOT EXISTS watch_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS last_watch_renewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_watch_error TEXT,
  ADD COLUMN IF NOT EXISTS last_notification_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_notification_state TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE google_calendar_channels
   SET watch_status = CASE
     WHEN expires_at IS NULL THEN 'pending'
     WHEN expires_at <= now() THEN 'expired'
     ELSE 'active'
   END,
       updated_at = now()
 WHERE watch_status IS NULL OR watch_status = '';

ALTER TABLE calendar_auto_joins
  ADD COLUMN IF NOT EXISTS client_match_source TEXT;

CREATE INDEX IF NOT EXISTS idx_google_calendar_channels_expiry
  ON google_calendar_channels(expires_at);

CREATE INDEX IF NOT EXISTS idx_calendar_auto_joins_client_match_source
  ON calendar_auto_joins(client_match_source, scheduled_at DESC);
