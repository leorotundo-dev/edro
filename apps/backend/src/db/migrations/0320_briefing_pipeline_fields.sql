-- Migration 0320: Jarvis auto-pipeline output on portal briefings
ALTER TABLE portal_briefing_requests
  ADD COLUMN IF NOT EXISTS auto_pipeline_output JSONB,
  ADD COLUMN IF NOT EXISTS trello_card_id       TEXT,
  ADD COLUMN IF NOT EXISTS pipeline_ran_at      TIMESTAMPTZ;
