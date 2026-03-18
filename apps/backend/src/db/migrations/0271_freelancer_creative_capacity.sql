-- 0271: creative capacity fields + performance scores for freelancers
-- Tools, AI tools, experience level, concurrency cap, portfolio,
-- platform expertise, languages, punctuality score, approval rate.

ALTER TABLE freelancer_profiles
  ADD COLUMN IF NOT EXISTS tools               TEXT[]        DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_tools            TEXT[]        DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS experience_level    TEXT,                          -- 'junior' | 'mid' | 'senior'
  ADD COLUMN IF NOT EXISTS max_concurrent_jobs INTEGER       NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS portfolio_url       TEXT,
  ADD COLUMN IF NOT EXISTS platform_expertise  TEXT[]        DEFAULT '{}',    -- 'instagram' | 'tiktok' | 'linkedin' | etc
  ADD COLUMN IF NOT EXISTS languages           TEXT[]        DEFAULT '{}',    -- 'pt' | 'en' | 'es'
  ADD COLUMN IF NOT EXISTS punctuality_score   NUMERIC(5,2),                  -- 0-100, null = no history
  ADD COLUMN IF NOT EXISTS approval_rate       NUMERIC(5,2),                  -- 0-100
  ADD COLUMN IF NOT EXISTS jobs_completed      INTEGER       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jobs_late           INTEGER       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jobs_revised        INTEGER       NOT NULL DEFAULT 0;
