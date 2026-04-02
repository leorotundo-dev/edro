-- DA Feedback Loop: per-client trust scores + feedback processing tracking

-- 1. Mark events as processable (add processed_at)
ALTER TABLE da_feedback_events
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_da_feedback_events_unprocessed
  ON da_feedback_events (tenant_id, created_at DESC)
  WHERE processed_at IS NULL;

-- 2. Per-client trust scores (isolated from global scores)
--    Falls back to da_references.trust_score when no client data exists
CREATE TABLE IF NOT EXISTS da_client_reference_scores (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT        NOT NULL,
  client_id     TEXT        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  reference_id  UUID        NOT NULL REFERENCES da_references(id) ON DELETE CASCADE,
  trust_score   NUMERIC(5,2) NOT NULL DEFAULT 0.60
                  CHECK (trust_score >= 0.10 AND trust_score <= 1.00),
  feedback_count INT         NOT NULL DEFAULT 0,
  last_feedback_at TIMESTAMPTZ NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, client_id, reference_id)
);

CREATE INDEX IF NOT EXISTS idx_da_client_scores_lookup
  ON da_client_reference_scores (tenant_id, client_id, trust_score DESC);

CREATE INDEX IF NOT EXISTS idx_da_client_scores_reference
  ON da_client_reference_scores (reference_id);

-- 3. LoRA training jobs table
CREATE TABLE IF NOT EXISTS lora_training_jobs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT        NOT NULL,
  client_id       TEXT        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  fal_request_id  TEXT        NULL,          -- fal.ai request ID for polling
  status          TEXT        NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued', 'training', 'completed', 'failed', 'rejected', 'approved')),
  trigger_word    TEXT        NOT NULL,       -- e.g. "EDROBRAND" injected in prompts
  model_base      TEXT        NOT NULL DEFAULT 'flux-dev',
  training_images TEXT[]      NOT NULL DEFAULT '{}',
  steps           INT         NOT NULL DEFAULT 1000,
  lora_weights_url TEXT       NULL,           -- fal.ai storage URL when complete
  notes           TEXT        NULL,
  approved_by     TEXT        NULL,
  approved_at     TIMESTAMPTZ NULL,
  error_message   TEXT        NULL,
  created_by      TEXT        NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lora_jobs_client
  ON lora_training_jobs (tenant_id, client_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lora_jobs_polling
  ON lora_training_jobs (fal_request_id)
  WHERE status = 'training' AND fal_request_id IS NOT NULL;
