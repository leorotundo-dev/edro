-- Migration 0162: Adicionar campos de persona e AMD em preference_feedback
-- Permite rastrear para qual persona a copy foi gerada, qual AMD foi definido
-- e se o comportamento mínimo desejado foi efetivamente alcançado.

ALTER TABLE preference_feedback
  ADD COLUMN IF NOT EXISTS persona_id          TEXT,
  ADD COLUMN IF NOT EXISTS momento_consciencia TEXT,
  ADD COLUMN IF NOT EXISTS amd                 TEXT,
  ADD COLUMN IF NOT EXISTS amd_achieved        TEXT; -- 'sim' | 'parcial' | 'nao' | NULL

CREATE INDEX IF NOT EXISTS idx_pref_feedback_amd_client
  ON preference_feedback (client_id, amd, amd_achieved)
  WHERE amd IS NOT NULL;
