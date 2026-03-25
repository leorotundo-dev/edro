-- Link job_creative_drafts back to the job_briefings row that originated them.
-- Allows tracing which briefing produced which creative draft.

ALTER TABLE job_creative_drafts
  ADD COLUMN IF NOT EXISTS briefing_id UUID REFERENCES job_briefings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_job_creative_drafts_briefing_id
  ON job_creative_drafts(briefing_id)
  WHERE briefing_id IS NOT NULL;
