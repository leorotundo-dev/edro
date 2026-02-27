-- 0209: ClientBehaviorProfile — clusters de audiência derivados de performance real
--
-- Cada linha representa um cluster comportamental detectado na audiência de um cliente:
--   salvadores      → audiência que salva/bookmarks (dark_social_potential alto)
--   clicadores      → audiência que clica (performance, CTR)
--   leitores_silenciosos → alto alcance, baixa ação visível (silently informed)
--   convertidos     → audiência que converte (pede proposta, agenda reunião)
--
-- Alimentado por: behaviorClusteringService → computa a partir de format_performance_metrics
-- Consumido por: AgentPlanner (injeta no prompt como contexto de audiência real)

CREATE TABLE IF NOT EXISTS client_behavior_profiles (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID         NOT NULL,
  client_id        TEXT         NOT NULL,

  -- Identidade do cluster
  cluster_type     TEXT         NOT NULL
                   CHECK (cluster_type IN (
                     'salvadores', 'clicadores', 'leitores_silenciosos', 'convertidos'
                   )),
  cluster_label    TEXT         NOT NULL,  -- label human-readable

  -- Taxas médias (por impressão) para este cluster
  avg_save_rate       DECIMAL(8,5) NOT NULL DEFAULT 0,
  avg_click_rate      DECIMAL(8,5) NOT NULL DEFAULT 0,
  avg_like_rate       DECIMAL(8,5) NOT NULL DEFAULT 0,
  avg_engagement_rate DECIMAL(8,5) NOT NULL DEFAULT 0,

  -- O que impulsiona este cluster (derivado dos formats de melhor performance)
  preferred_format   TEXT,           -- Ex: "Instagram · Carrossel"
  preferred_amd      TEXT,           -- salvar | compartilhar | clicar | responder | ...
  preferred_triggers TEXT[]      NOT NULL DEFAULT '{}',

  -- Evidência estatística
  sample_size      INTEGER      NOT NULL DEFAULT 0,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),

  -- Top 3 formatos que contribuíram para este cluster (JSONB para não criar FK extra)
  top_formats      JSONB        NOT NULL DEFAULT '[]'::jsonb,

  last_computed_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, client_id, cluster_type)
);

CREATE INDEX IF NOT EXISTS idx_behavior_profiles_client
  ON client_behavior_profiles (tenant_id, client_id);
