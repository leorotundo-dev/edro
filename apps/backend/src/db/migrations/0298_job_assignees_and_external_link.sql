-- Migration 0298: Multiple assignees per job + external link field
--
-- Adds:
--   1. job_assignees — junction table for multiple responsáveis per job
--   2. external_link — generic URL field (Trello, Drive, Notion, etc.)

-- ── 1. External link on jobs ──────────────────────────────────────────────────
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS external_link TEXT;

-- ── 2. Multiple assignees ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_assignees (
  job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES edro_users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES edro_users(id) ON DELETE SET NULL,
  PRIMARY KEY (job_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_job_assignees_job_id
  ON job_assignees(job_id);

CREATE INDEX IF NOT EXISTS idx_job_assignees_user_id
  ON job_assignees(user_id);

-- ── 3. Backfill: migrate existing owner_id → job_assignees ───────────────────
INSERT INTO job_assignees (job_id, user_id, assigned_at)
  SELECT id, owner_id, created_at
    FROM jobs
   WHERE owner_id IS NOT NULL
ON CONFLICT (job_id, user_id) DO NOTHING;
