-- avg_response_minutes: EMA of minutes between job assignment and in_progress
ALTER TABLE freelancer_profiles
  ADD COLUMN IF NOT EXISTS avg_response_minutes NUMERIC(8,2) DEFAULT NULL;

-- allocated_at: timestamp when owner_id was last set (for response time tracking)
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS allocated_at TIMESTAMPTZ DEFAULT NULL;
