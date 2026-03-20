-- Fase 3: Pesos dinâmicos do simulador, aprendidos por cliente/plataforma
-- Substituem os valores hardcoded em resonanceScorer.ts após calibração

CREATE TABLE IF NOT EXISTS simulation_scoring_weights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  client_id TEXT,   -- NULL = global do tenant (fallback)
  platform TEXT,    -- NULL = todas as plataformas
  -- Pesos de pontuação (defaults = valores hardcoded originais)
  amd_match_boost NUMERIC(5,3) NOT NULL DEFAULT 0.300,       -- +30% base
  trigger_boost_per_match NUMERIC(5,3) NOT NULL DEFAULT 0.080, -- +8% por trigger
  trigger_boost_cap NUMERIC(5,3) NOT NULL DEFAULT 0.400,       -- cap 40%
  fogg_multiplier_base NUMERIC(5,3) NOT NULL DEFAULT 0.600,    -- base do Fogg mult
  fogg_multiplier_scale NUMERIC(5,3) NOT NULL DEFAULT 0.600,   -- escala do Fogg mult
  -- Metadados de calibração
  calibration_sample_size INT NOT NULL DEFAULT 0,
  last_calibrated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- UNIQUE on expressions requires a separate index (inline UNIQUE doesn't support COALESCE)
CREATE UNIQUE INDEX IF NOT EXISTS sim_weights_unique_idx
  ON simulation_scoring_weights(tenant_id, COALESCE(client_id, ''), COALESCE(platform, ''));

CREATE INDEX IF NOT EXISTS sim_weights_tenant_client ON simulation_scoring_weights(tenant_id, client_id);
