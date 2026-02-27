-- 0211: LearningRules — padrões comportamentais validados por dados históricos
--
-- Cada cliente acumula regras derivadas de format_performance_metrics:
--   - Regras de AMD     → "salvar" produz +28% save_rate vs baseline
--   - Regras de gatilho → "curiosidade" produz +19% click_rate vs baseline
--   - Regras de plataforma → "LinkedIn" produz +35% save_rate vs baseline
--
-- Threshold mínimo: uplift >= 15% e sample_size >= 3.
-- Consumidas pelo AgentPlanner para informar behavior_intents gerados.

CREATE TABLE IF NOT EXISTS learning_rules (
  id                  UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID         NOT NULL,
  client_id           TEXT         NOT NULL,

  rule_name           TEXT         NOT NULL,    -- ex: amd_salvar_save_rate
  segment_definition  JSONB        NOT NULL DEFAULT '{}'::jsonb,  -- { type, value }
  effective_pattern   TEXT         NOT NULL,    -- legível: "AMD 'salvar' produz 2.8% save_rate"

  uplift_metric       TEXT         NOT NULL,    -- save_rate | click_rate | eng_rate | conversion_rate
  uplift_value        DECIMAL(6,2) NOT NULL,    -- % uplift vs baseline (ex: 28.3)
  confidence_score    DECIMAL(3,2),             -- 0–0.95 baseado em sample_size
  sample_size         INTEGER      NOT NULL DEFAULT 0,

  is_active           BOOLEAN      NOT NULL DEFAULT true,
  last_validated_at   TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, client_id, rule_name)
);

CREATE INDEX IF NOT EXISTS idx_learning_rules_client
  ON learning_rules (tenant_id, client_id, is_active);

CREATE INDEX IF NOT EXISTS idx_learning_rules_metric
  ON learning_rules (tenant_id, client_id, uplift_metric)
  WHERE is_active = true;
