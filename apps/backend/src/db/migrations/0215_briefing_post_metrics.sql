-- 0215: Métricas de posts publicados vinculadas ao briefing de origem
-- Auto-match por data de entrega + formato/plataforma via Reportei API (por post)

CREATE TABLE IF NOT EXISTS briefing_post_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_id     UUID NOT NULL REFERENCES edro_briefings(id) ON DELETE CASCADE,
  tenant_id       UUID,
  client_id       TEXT,
  platform        TEXT NOT NULL,
  post_id         TEXT,            -- ID do post no Reportei / plataforma
  post_url        TEXT,            -- URL pública (permalink)
  published_at    TIMESTAMPTZ,
  format          TEXT,            -- carousel, reel, image, video, text...
  reach           INTEGER,
  impressions     INTEGER,
  engagement      INTEGER,
  engagement_rate NUMERIC(6,2),
  likes           INTEGER,
  comments        INTEGER,
  saves           INTEGER,
  shares          INTEGER,
  raw             JSONB,           -- Objeto completo retornado pelo Reportei
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  match_source    TEXT NOT NULL DEFAULT 'auto',  -- 'auto' | 'manual'
  UNIQUE (briefing_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_bpm_briefing
  ON briefing_post_metrics(briefing_id);

CREATE INDEX IF NOT EXISTS idx_bpm_client
  ON briefing_post_metrics(client_id, platform, published_at);
