-- 0210: CopyEthicsLog — auditoria ética de conteúdo gerado
--
-- Cada copy gerada passa pelo PolicyChecker antes de ser salva.
-- Esta tabela registra o resultado de cada avaliação:
--   approved  → nenhuma política violada
--   flagged   → uma ou mais políticas sinalizadas (copy salva, mas marcada)
--   blocked   → violação grave (copy não entregue sem revisão humana)
--
-- As políticas avaliadas ficam em policies_evaluated[].
-- As políticas acionadas (que contribuíram para o status) ficam em policies_triggered[].
-- O rationale explica o raciocínio.

CREATE TABLE IF NOT EXISTS copy_ethics_log (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID         NOT NULL,
  client_id        TEXT         NOT NULL,
  briefing_id      UUID         NOT NULL,
  copy_version_id  UUID,                        -- preenchido após criar a copy

  -- Resultado da classificação emocional (EmotionTagger)
  emotional_valence   TEXT       CHECK (emotional_valence IN ('positive', 'neutral', 'negative')),
  arousal_level       TEXT       CHECK (arousal_level    IN ('low', 'medium', 'high')),
  sensitive_topics    TEXT[]     NOT NULL DEFAULT '{}',

  -- Resultado do PolicyChecker
  status              TEXT       NOT NULL
                      CHECK (status IN ('approved', 'flagged', 'blocked')),
  policies_evaluated  TEXT[]     NOT NULL DEFAULT '{}',   -- todos os IDs avaliados
  policies_triggered  TEXT[]     NOT NULL DEFAULT '{}',   -- apenas os acionados
  rationale           TEXT,                               -- explicação legível

  -- Revisão humana (quando gestor override o status)
  reviewed_by         TEXT,
  reviewed_at         TIMESTAMPTZ,
  override_status     TEXT       CHECK (override_status IN ('approved', 'blocked', NULL)),
  override_note       TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ethics_log_briefing
  ON copy_ethics_log (briefing_id);

CREATE INDEX IF NOT EXISTS idx_ethics_log_tenant_status
  ON copy_ethics_log (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ethics_log_copy_version
  ON copy_ethics_log (copy_version_id)
  WHERE copy_version_id IS NOT NULL;
