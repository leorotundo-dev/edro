CREATE TABLE IF NOT EXISTS preference_feedback (
  id TEXT PRIMARY KEY DEFAULT 'pfb_' || gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('pauta', 'copy')),
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'approved_after_edit')),

  rejection_tags TEXT[],
  rejection_reason TEXT,
  regeneration_instruction TEXT,
  regeneration_count INTEGER DEFAULT 0,

  pauta_id TEXT,
  pauta_source_type TEXT,
  pauta_source_domain TEXT,
  pauta_topic_category TEXT,
  pauta_approach TEXT,
  pauta_platforms TEXT[],
  pauta_timing_days INTEGER,
  pauta_ai_score NUMERIC,

  copy_briefing_id TEXT,
  copy_rejected_text TEXT,
  copy_approved_text TEXT,
  copy_platform TEXT,
  copy_format TEXT,
  copy_pipeline TEXT,
  copy_task_type TEXT,
  copy_tone TEXT,

  performance_score NUMERIC,
  performance_synced_at TIMESTAMPTZ,
  performance_vs_average NUMERIC,

  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pref_feedback_client_type_action
  ON preference_feedback (client_id, feedback_type, action);

CREATE INDEX IF NOT EXISTS idx_pref_feedback_tenant_created
  ON preference_feedback (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pref_feedback_pauta_category
  ON preference_feedback (client_id, pauta_topic_category, action);

CREATE INDEX IF NOT EXISTS idx_pref_feedback_copy_platform
  ON preference_feedback (client_id, copy_platform, action);

CREATE TABLE IF NOT EXISTS pauta_suggestions (
  id TEXT PRIMARY KEY DEFAULT 'psg_' || gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  approach_a JSONB,
  approach_b JSONB,

  source_type TEXT,
  source_id TEXT,
  source_domain TEXT,
  source_text TEXT,

  ai_score NUMERIC,
  topic_category TEXT,
  suggested_deadline DATE,
  platforms TEXT[],

  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  briefing_id TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_pauta_suggestions_client_status_generated
  ON pauta_suggestions (client_id, status, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_pauta_suggestions_tenant_pending
  ON pauta_suggestions (tenant_id, status)
  WHERE status = 'pending';
