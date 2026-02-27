-- Migration 0206: creative_concepts — creative territories per campaign phase

CREATE TABLE IF NOT EXISTS creative_concepts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  phase_id    TEXT,            -- null = applies to all phases
  name        TEXT NOT NULL,   -- territory name (e.g. "Orgulho do Cotidiano")
  insight     TEXT,            -- human insight driving the territory
  triggers    TEXT[] NOT NULL DEFAULT '{}',   -- behavior triggers used
  example_copy TEXT,           -- example headline / line
  hero_piece  TEXT,            -- hero piece description
  status      TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'approved', 'rejected')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creative_concepts_campaign_idx
  ON creative_concepts (campaign_id);

CREATE INDEX IF NOT EXISTS creative_concepts_tenant_idx
  ON creative_concepts (tenant_id);

-- Link campaign_formats to the creative concept they serve
ALTER TABLE campaign_formats
  ADD COLUMN IF NOT EXISTS concept_id UUID REFERENCES creative_concepts(id) ON DELETE SET NULL;

COMMENT ON TABLE creative_concepts IS
  'Creative territories per campaign. Each concept groups assets by a strategic approach (insight + triggers).';
COMMENT ON COLUMN creative_concepts.phase_id IS
  'Phase this concept belongs to (historia/prova/convite). NULL = campaign-wide concept.';
COMMENT ON COLUMN creative_concepts.triggers IS
  'Behavior triggers activated by this territory (e.g. curiosidade, autoridade, pertencimento).';
COMMENT ON COLUMN campaign_formats.concept_id IS
  'Which creative concept/territory this format serves.';
