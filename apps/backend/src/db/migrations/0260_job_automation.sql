-- Job Automation Pipeline: creative drafts + ETA tracking + automation status
-- 2026-03-13

-- Creative drafts gerados automaticamente por job (copy, imagem, layout)
CREATE TABLE IF NOT EXISTS job_creative_drafts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  draft_type      TEXT NOT NULL,        -- copy | image | layout
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | generating | done | failed

  -- Copy fields
  hook_text       TEXT,
  content_text    TEXT,
  cta_text        TEXT,
  copy_approval_status TEXT,            -- approved | needs_revision | blocked
  fogg_score      JSONB,

  -- Image/Layout fields
  image_url       TEXT,
  image_urls      TEXT[],
  layout          JSONB,                -- GeneratedLayout JSON
  art_direction   JSONB,

  -- Metadata
  prompt_used     TEXT,
  model_used      TEXT,
  error_message   TEXT,
  generated_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_creative_drafts_job
  ON job_creative_drafts(job_id);

CREATE INDEX IF NOT EXISTS idx_job_creative_drafts_status
  ON job_creative_drafts(tenant_id, status);

-- ETA tracking per allocation
ALTER TABLE job_allocations ADD COLUMN IF NOT EXISTS queue_position INT;
ALTER TABLE job_allocations ADD COLUMN IF NOT EXISTS estimated_delivery_at TIMESTAMPTZ;

-- Jobs: automation pipeline status
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS automation_status TEXT DEFAULT 'none';
-- Values: none | copy_pending | copy_done | image_pending | image_done | ready_for_review

-- Jobs: separate client-requested date from operational deadline
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS client_requested_date TIMESTAMPTZ;
