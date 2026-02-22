-- Event inspirations: creative campaign references scraped via Tavily
-- for high-relevance calendar events (base_relevance >= 80).
-- Global table (no tenant_id) — one scrape serves all tenants.

CREATE TABLE IF NOT EXISTS event_inspirations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    TEXT        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  snippet     TEXT,
  url         TEXT        NOT NULL,
  source_lang TEXT        NOT NULL DEFAULT 'pt',
  scraped_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, url)
);

CREATE INDEX IF NOT EXISTS idx_event_inspirations_event_id ON event_inspirations(event_id);
