-- Inteligência Competitiva: perfis de concorrentes por cliente
-- Armazena handles monitorados + padrões AMD identificados

CREATE TABLE IF NOT EXISTS competitor_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  handle TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'instagram',  -- instagram | linkedin | tiktok | twitter
  display_name TEXT,
  description TEXT,
  -- Padrão identificado (populado pelo competitorIntelligence service)
  dominant_amd TEXT,
  dominant_triggers TEXT[],
  avg_engagement NUMERIC(8,5),
  post_frequency_per_week NUMERIC(5,2),
  top_content_themes JSONB DEFAULT '[]',
  last_analyzed_at TIMESTAMPTZ,
  -- Insights gerados
  differentiation_insight TEXT,
  counter_strategy TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, client_id, handle, platform)
);

CREATE INDEX IF NOT EXISTS competitor_profiles_client_idx ON competitor_profiles(tenant_id, client_id);

-- Snapshot de posts coletados dos concorrentes
CREATE TABLE IF NOT EXISTS competitor_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competitor_profile_id UUID NOT NULL REFERENCES competitor_profiles(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  external_id TEXT,
  content TEXT,
  platform TEXT,
  published_at TIMESTAMPTZ,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  shares INT DEFAULT 0,
  saves INT DEFAULT 0,
  views INT DEFAULT 0,
  engagement_rate NUMERIC(6,4),
  -- Análise AgentTagger
  detected_amd TEXT,
  detected_triggers TEXT[],
  emotional_tone TEXT,
  dark_social_potential INT,
  analyzed_at TIMESTAMPTZ,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (competitor_profile_id, external_id)
);

CREATE INDEX IF NOT EXISTS competitor_posts_profile_idx ON competitor_posts(competitor_profile_id);
CREATE INDEX IF NOT EXISTS competitor_posts_tenant_idx ON competitor_posts(tenant_id);
