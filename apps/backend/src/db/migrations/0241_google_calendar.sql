-- 0241_google_calendar.sql
-- Google Calendar watch channels and auto-join tracking for meeting bot

CREATE TABLE IF NOT EXISTS google_calendar_channels (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    TEXT NOT NULL UNIQUE,
  channel_id   TEXT NOT NULL UNIQUE,   -- UUID sent to Google as X-Goog-Channel-ID
  resource_id  TEXT,                   -- returned by Google in watch() response
  calendar_id  TEXT NOT NULL DEFAULT 'primary',
  access_token TEXT,
  refresh_token TEXT,
  email_address TEXT,
  expires_at   TIMESTAMPTZ,            -- channel watch expiry (max 1 week)
  token_expiry TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calendar_auto_joins (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           TEXT NOT NULL,
  calendar_event_id   TEXT NOT NULL UNIQUE,
  event_title         TEXT,
  video_url           TEXT NOT NULL,               -- Meet / Zoom / Teams link
  video_platform      TEXT,                        -- 'meet' | 'zoom' | 'teams'
  organizer_email     TEXT,
  attendees           JSONB,
  scheduled_at        TIMESTAMPTZ NOT NULL,
  job_enqueued_at     TIMESTAMPTZ,
  meeting_id          UUID REFERENCES meetings(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS calendar_auto_joins_tenant_idx
  ON calendar_auto_joins(tenant_id, scheduled_at DESC);
