-- Patch: add UNIQUE constraint on job_estimations.briefing_id
-- Required for ON CONFLICT (briefing_id) upserts in financial.ts and scopeEstimator.ts

ALTER TABLE job_estimations
  ADD CONSTRAINT job_estimations_briefing_id_unique UNIQUE (briefing_id);
