-- 0332_campaign_jobs_link.sql
-- Links project_cards (Jobs) to campaigns so the ops layer knows which
-- campaign each job is executing. Optional — most jobs come from Trello
-- and are not yet campaign-linked.

ALTER TABLE project_cards
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS project_cards_campaign_idx
  ON project_cards (tenant_id, campaign_id)
  WHERE campaign_id IS NOT NULL;
