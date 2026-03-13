-- Unified signal feed: aggregates events from all system domains
-- into a single prioritized stream for the operator homepage

CREATE TABLE IF NOT EXISTS operational_signals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   TEXT NOT NULL,

  -- Classification
  domain      TEXT NOT NULL,           -- jobs | whatsapp | clipping | campaign | meeting | financial | health | learning
  signal_type TEXT NOT NULL,           -- decision | attention | action | opportunity | production | learning | financial | health
  severity    INT  NOT NULL DEFAULT 50, -- 0-100 (higher = more urgent, orders the feed)

  -- Content
  title       TEXT NOT NULL,
  summary     TEXT,

  -- Entity reference (what this signal is about)
  entity_type TEXT,                    -- job | client | briefing | clipping_item | campaign | meeting | freelancer | connector
  entity_id   TEXT,
  client_id   UUID,
  client_name TEXT,

  -- Actions the operator can take
  actions     JSONB DEFAULT '[]',      -- [{label, href, action_type}]

  -- Lifecycle
  resolved_at  TIMESTAMPTZ,
  resolved_by  UUID,
  snoozed_until TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now(),
  expires_at   TIMESTAMPTZ,

  -- Dedup key: prevents duplicate signals for the same event
  dedup_key    TEXT
);

-- Fast feed query: active signals ordered by severity
CREATE INDEX IF NOT EXISTS idx_operational_signals_feed
  ON operational_signals(tenant_id, resolved_at, severity DESC)
  WHERE resolved_at IS NULL;

-- Dedup: only one active signal per unique event
CREATE UNIQUE INDEX IF NOT EXISTS idx_operational_signals_dedup
  ON operational_signals(tenant_id, dedup_key)
  WHERE dedup_key IS NOT NULL AND resolved_at IS NULL;

-- Entity lookup: find signals for a specific entity
CREATE INDEX IF NOT EXISTS idx_operational_signals_entity
  ON operational_signals(tenant_id, entity_type, entity_id)
  WHERE resolved_at IS NULL;
