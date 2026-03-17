CREATE TABLE IF NOT EXISTS creative_sessions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                TEXT NOT NULL,
  job_id                   UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  briefing_id              UUID REFERENCES edro_briefings(id) ON DELETE SET NULL,
  status                   TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'blocked', 'in_review', 'awaiting_approval', 'ready_to_publish', 'done', 'archived')
  ),
  current_stage            TEXT NOT NULL DEFAULT 'briefing' CHECK (
    current_stage IN ('briefing', 'copy', 'arte', 'refino_canvas', 'revisao', 'aprovacao', 'exportacao')
  ),
  owner_id                 UUID REFERENCES edro_users(id) ON DELETE SET NULL,
  selected_copy_version_id UUID,
  selected_asset_id        UUID,
  last_canvas_snapshot     JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata                 JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at             TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT creative_sessions_tenant_job_unique UNIQUE (tenant_id, job_id)
);

CREATE TABLE IF NOT EXISTS creative_versions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           TEXT NOT NULL,
  creative_session_id UUID NOT NULL REFERENCES creative_sessions(id) ON DELETE CASCADE,
  job_id              UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  version_type        TEXT NOT NULL CHECK (
    version_type IN ('copy', 'caption', 'layout', 'image_prompt', 'video_script', 'review_note')
  ),
  source              TEXT NOT NULL CHECK (
    source IN ('studio', 'canvas', 'ai', 'human')
  ),
  payload             JSONB NOT NULL DEFAULT '{}'::jsonb,
  selected            BOOLEAN NOT NULL DEFAULT false,
  created_by          UUID REFERENCES edro_users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS creative_assets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           TEXT NOT NULL,
  creative_session_id UUID NOT NULL REFERENCES creative_sessions(id) ON DELETE CASCADE,
  job_id              UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  asset_type          TEXT NOT NULL CHECK (
    asset_type IN ('image', 'carousel', 'video', 'mockup', 'thumbnail', 'export')
  ),
  source              TEXT NOT NULL CHECK (
    source IN ('studio', 'canvas', 'ai', 'human', 'upload')
  ),
  file_url            TEXT NOT NULL,
  thumb_url           TEXT,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'review', 'approved', 'selected', 'rejected', 'exported')
  ),
  selected            BOOLEAN NOT NULL DEFAULT false,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by          UUID REFERENCES edro_users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS creative_reviews (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           TEXT NOT NULL,
  creative_session_id UUID NOT NULL REFERENCES creative_sessions(id) ON DELETE CASCADE,
  job_id              UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  review_type         TEXT NOT NULL CHECK (
    review_type IN ('internal', 'client_approval')
  ),
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'changes_requested', 'rejected', 'cancelled')
  ),
  feedback            JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_by             UUID REFERENCES edro_users(id) ON DELETE SET NULL,
  resolved_by         UUID REFERENCES edro_users(id) ON DELETE SET NULL,
  sent_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at         TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS creative_publication_intents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           TEXT NOT NULL,
  creative_session_id UUID NOT NULL REFERENCES creative_sessions(id) ON DELETE CASCADE,
  job_id              UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  channel             TEXT,
  scheduled_for       TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'ready', 'scheduled', 'published', 'failed')
  ),
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creative_sessions_tenant_job
  ON creative_sessions(tenant_id, job_id);

CREATE INDEX IF NOT EXISTS idx_creative_sessions_stage
  ON creative_sessions(tenant_id, current_stage, status);

CREATE INDEX IF NOT EXISTS idx_creative_versions_session
  ON creative_versions(creative_session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_creative_versions_job
  ON creative_versions(job_id, version_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_creative_assets_session
  ON creative_assets(creative_session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_creative_assets_job
  ON creative_assets(job_id, status, selected);

CREATE INDEX IF NOT EXISTS idx_creative_reviews_job
  ON creative_reviews(job_id, review_type, status);

CREATE INDEX IF NOT EXISTS idx_creative_publication_intents_job
  ON creative_publication_intents(job_id, status, scheduled_for);

ALTER TABLE creative_sessions
  DROP CONSTRAINT IF EXISTS creative_sessions_selected_copy_fk;

ALTER TABLE creative_sessions
  ADD CONSTRAINT creative_sessions_selected_copy_fk
  FOREIGN KEY (selected_copy_version_id) REFERENCES creative_versions(id) ON DELETE SET NULL;

ALTER TABLE creative_sessions
  DROP CONSTRAINT IF EXISTS creative_sessions_selected_asset_fk;

ALTER TABLE creative_sessions
  ADD CONSTRAINT creative_sessions_selected_asset_fk
  FOREIGN KEY (selected_asset_id) REFERENCES creative_assets(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION set_creative_sessions_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_creative_sessions_set_updated_at ON creative_sessions;

CREATE TRIGGER trg_creative_sessions_set_updated_at
BEFORE UPDATE ON creative_sessions
FOR EACH ROW
EXECUTE FUNCTION set_creative_sessions_updated_at();

CREATE OR REPLACE FUNCTION set_creative_publication_intents_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_creative_publication_intents_set_updated_at ON creative_publication_intents;

CREATE TRIGGER trg_creative_publication_intents_set_updated_at
BEFORE UPDATE ON creative_publication_intents
FOR EACH ROW
EXECUTE FUNCTION set_creative_publication_intents_updated_at();
