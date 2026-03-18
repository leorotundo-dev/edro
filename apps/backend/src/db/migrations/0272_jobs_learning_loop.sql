-- 0272: learning loop improvements
-- jobs: revision_count tracks how many times a job went back to in_review
--        actual_minutes recorded when job reaches 'done' (real elapsed time)
-- freelancer_profiles: unavailable_until lets freelancers declare time-off
-- job_creative_drafts: approval gating (draft_approved_by + draft_approved_at)

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS revision_count     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_minutes     INTEGER,
  ADD COLUMN IF NOT EXISTS draft_approval_required BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE freelancer_profiles
  ADD COLUMN IF NOT EXISTS unavailable_until  DATE;

ALTER TABLE job_creative_drafts
  ADD COLUMN IF NOT EXISTS draft_approved_by  UUID REFERENCES edro_users(id),
  ADD COLUMN IF NOT EXISTS draft_approved_at  TIMESTAMPTZ;
