-- Migration 0205: Campaign ↔ Briefing connection + behavioral dimensions on campaigns

-- 1. Link edro_briefings to a campaign and phase
ALTER TABLE edro_briefings
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_phase_id TEXT;

CREATE INDEX IF NOT EXISTS edro_briefings_campaign_idx
  ON edro_briefings (campaign_id);

-- 2. Add behavioral/structural dimensions to campaigns
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS phases JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS audiences JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS behavior_intents JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN campaigns.phases IS
  'Array of campaign phases: [{id, name, order, objective}]. Default: história/prova/convite.';
COMMENT ON COLUMN campaigns.audiences IS
  'Array of target audiences linked to personas: [{id, persona_id, persona_name, momento_consciencia}]';
COMMENT ON COLUMN campaigns.behavior_intents IS
  'Array of behavioral intents per phase/audience: [{id, phase_id, audience_id, amd, momento, triggers[], target_behavior}]';
COMMENT ON COLUMN edro_briefings.campaign_id IS
  'Optional link to the campaign this briefing belongs to.';
COMMENT ON COLUMN edro_briefings.campaign_phase_id IS
  'Which campaign phase this briefing serves (e.g. "historia", "prova", "convite").';
