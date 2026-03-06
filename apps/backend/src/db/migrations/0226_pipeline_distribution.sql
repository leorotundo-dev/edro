-- Pipeline distribution tables: approvals + scheduled publications

CREATE TABLE IF NOT EXISTS briefing_approvals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_id   UUID NOT NULL,
  tenant_id     UUID NOT NULL,
  client_email  TEXT NOT NULL,
  message       TEXT,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  reviewer_notes TEXT,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (briefing_id)
);

CREATE INDEX IF NOT EXISTS idx_briefing_approvals_tenant ON briefing_approvals (tenant_id);
CREATE INDEX IF NOT EXISTS idx_briefing_approvals_briefing ON briefing_approvals (briefing_id);

CREATE TABLE IF NOT EXISTS scheduled_publications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  briefing_id   UUID,
  platform      TEXT NOT NULL,
  scheduled_at  TIMESTAMPTZ NOT NULL,
  copy_text     TEXT,
  image_url     TEXT,
  status        TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | published | cancelled
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_pubs_tenant ON scheduled_publications (tenant_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_pubs_status ON scheduled_publications (tenant_id, status, scheduled_at);
