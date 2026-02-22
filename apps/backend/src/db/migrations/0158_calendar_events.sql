-- ============================================================
-- CALENDAR EVENTS
-- Per-client marketing / activation calendar events.
-- Used by analytics: content-gap, strategic-brief, predictive-calendar.
-- ============================================================

CREATE TABLE IF NOT EXISTS calendar_events (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id     UUID         NOT NULL REFERENCES edro_clients(id) ON DELETE CASCADE,
  title         TEXT         NOT NULL,
  description   TEXT,
  event_date    DATE         NOT NULL,
  category      TEXT,
  relevance_score NUMERIC(5,2) CHECK (relevance_score BETWEEN 0 AND 100),
  source        TEXT         NOT NULL DEFAULT 'manual',
  tags          TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_client_date
  ON calendar_events (client_id, event_date);

CREATE INDEX IF NOT EXISTS idx_calendar_events_upcoming
  ON calendar_events (client_id, event_date);
