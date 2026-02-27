-- Migration 0214: Persist behavioral copy results from AgentWriter + AgentAuditor + AgentTagger
-- Allows LearningEngine to correlate Fogg scores with eventual real-world performance,
-- and gives the team a history of all generated copies per campaign / behavior_intent.

CREATE TABLE IF NOT EXISTS campaign_behavioral_copies (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        TEXT        NOT NULL,
  campaign_id      UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  behavior_intent_id TEXT      NOT NULL,
  platform         TEXT        NOT NULL,

  -- AgentWriter draft
  hook_text        TEXT,
  content_text     TEXT,
  cta_text         TEXT,
  media_type       TEXT,
  behavioral_rationale TEXT,
  draft_tags       TEXT[],

  -- AgentAuditor result
  approval_status  TEXT        CHECK (approval_status IN ('approved', 'needs_revision', 'blocked')),
  approved_text    TEXT,
  revision_notes   JSONB       DEFAULT '[]',
  fogg_motivation  NUMERIC(4,1),
  fogg_ability     NUMERIC(4,1),
  fogg_prompt      NUMERIC(4,1),
  emotional_tone   TEXT,
  policy_flags     JSONB       DEFAULT '[]',

  -- AgentTagger metadata
  behavioral_tags  JSONB,

  -- Linked briefing (set when user clicks "Criar Briefing")
  briefing_id      UUID        REFERENCES edro_briefings(id) ON DELETE SET NULL,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cbc_campaign
  ON campaign_behavioral_copies (campaign_id, behavior_intent_id);

CREATE INDEX IF NOT EXISTS idx_cbc_tenant_created
  ON campaign_behavioral_copies (tenant_id, created_at DESC);

COMMENT ON TABLE campaign_behavioral_copies IS
  'Persisted results of POST /campaigns/:id/behavioral-copy (AgentWriter + AgentAuditor + AgentTagger).
   Enables LearningEngine to correlate Fogg scores with actual format_performance_metrics over time.';
