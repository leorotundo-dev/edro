CREATE TABLE IF NOT EXISTS copy_segment_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copy_id UUID NOT NULL REFERENCES edro_copy_versions(id) ON DELETE CASCADE,
  briefing_id UUID NOT NULL REFERENCES edro_briefings(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  segment_text TEXT NOT NULL,
  char_start INTEGER NOT NULL,
  char_end INTEGER NOT NULL,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('like', 'dislike', 'neutral')),
  note TEXT,
  suggested_fix TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_csf_copy_id ON copy_segment_feedback(copy_id);
CREATE INDEX IF NOT EXISTS idx_csf_briefing_id ON copy_segment_feedback(briefing_id);
CREATE INDEX IF NOT EXISTS idx_csf_tenant ON copy_segment_feedback(tenant_id);
