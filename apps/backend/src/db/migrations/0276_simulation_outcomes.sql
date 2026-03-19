-- Fase 2: Fechamento do loop predição vs realidade
-- Armazena o que o simulador previu vs o que realmente aconteceu
-- Alimenta scoringCalibrator na Fase 3

CREATE TABLE IF NOT EXISTS simulation_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulation_result_id UUID NOT NULL REFERENCES simulation_results(id) ON DELETE CASCADE,
  variant_index INT NOT NULL,
  campaign_format_id UUID,
  briefing_id UUID,
  platform TEXT,
  -- Previsto vs real
  predicted_save_rate NUMERIC(6,4),
  actual_save_rate NUMERIC(6,4),
  predicted_click_rate NUMERIC(6,4),
  actual_click_rate NUMERIC(6,4),
  predicted_engagement_rate NUMERIC(6,4),
  actual_engagement_rate NUMERIC(6,4),
  predicted_fatigue_days INT,
  -- Métricas de acurácia
  save_rate_error NUMERIC(8,4),     -- (actual - predicted) / predicted — negativo = superestimou
  click_rate_error NUMERIC(8,4),
  engagement_error NUMERIC(8,4),
  accuracy_pct NUMERIC(5,2),        -- 0–100, maior é melhor
  measurement_window_days INT DEFAULT 7,
  measured_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS simulation_outcomes_result_idx ON simulation_outcomes(simulation_result_id);
CREATE INDEX IF NOT EXISTS simulation_outcomes_format_idx ON simulation_outcomes(campaign_format_id);

-- Link entre copy gerada e a simulação que a originou
ALTER TABLE campaign_behavioral_copies
  ADD COLUMN IF NOT EXISTS simulation_result_id UUID REFERENCES simulation_results(id) ON DELETE SET NULL;

-- Link direto da simulation_results para o campaign_format publicado
ALTER TABLE simulation_results
  ADD COLUMN IF NOT EXISTS campaign_format_id UUID;
