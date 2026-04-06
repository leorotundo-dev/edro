-- Migration 0304: Campaign entity enhancements + campaign_assets table
-- Note: campaigns table already exists (0116). This migration adds missing columns
-- and the new campaign_assets table for multi-format assets.

-- ── Add missing columns to campaigns ─────────────────────────────────────────

-- budget_total / budget_spent (the old migration only has budget_brl)
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS budget_total     NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS budget_spent     NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kb_proposal_id   UUID,
  ADD COLUMN IF NOT EXISTS creative_concepts JSONB DEFAULT '[]'::jsonb;

-- Copy existing budget_brl into budget_total for backward compat
UPDATE campaigns
SET budget_total = budget_brl
WHERE budget_total IS NULL AND budget_brl IS NOT NULL;

-- ── campaign_assets: links briefings/copies/multi-format assets to a campaign ─

CREATE TABLE IF NOT EXISTS campaign_assets (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           TEXT NOT NULL,
  campaign_id         UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  asset_type          TEXT NOT NULL,  -- briefing | copy | radio_spot | film_brief | email | print_ad | social_post
  asset_id            TEXT,           -- reference to the actual asset (UUID or text)
  content             TEXT,           -- inline content for generated assets
  format              TEXT,           -- platform/format specifics
  behavior_intent_id  TEXT,           -- which behavior intent this serves
  phase               TEXT,           -- historia | prova | convite
  performance         JSONB,          -- metrics when available
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_assets_campaign_idx
  ON campaign_assets(tenant_id, campaign_id);

CREATE INDEX IF NOT EXISTS campaign_assets_type_idx
  ON campaign_assets(tenant_id, asset_type);

COMMENT ON TABLE campaign_assets IS
  'Links all assets (briefings, copies, multi-format) to a campaign. Supports performance tracking per asset.';

COMMENT ON COLUMN campaign_assets.asset_type IS
  'Type of asset: briefing | copy | radio_spot | film_brief | email | print_ad | social_post';

COMMENT ON COLUMN campaign_assets.content IS
  'Inline content for generated assets (e.g., the full radio script or email copy)';

COMMENT ON COLUMN campaign_assets.performance IS
  'JSONB with performance metrics when available: {impressions, clicks, conversions, engagement_rate, ...}';

COMMENT ON COLUMN campaigns.kb_proposal_id IS
  'Link to jarvis_kb_entries.id that originated this campaign via proactive proposal';

COMMENT ON COLUMN campaigns.creative_concepts IS
  'Array of inline creative concept objects [{id, name, phase, triggers, rationale}] for lightweight storage';
