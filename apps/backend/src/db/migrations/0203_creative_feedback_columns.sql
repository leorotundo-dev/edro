-- Expande preference_feedback para suportar feedback de criativos (imagens IA)
-- Espelha o loop de aprendizado do copy: aprovado/descartado → sync no perfil → injeta no próximo prompt

-- 1. Expandir constraint feedback_type para incluir 'creative'
ALTER TABLE preference_feedback DROP CONSTRAINT IF EXISTS preference_feedback_feedback_type_check;
ALTER TABLE preference_feedback ADD CONSTRAINT preference_feedback_feedback_type_check
  CHECK (feedback_type IN ('pauta', 'copy', 'creative'));

-- 2. Colunas específicas para feedback de criativo
ALTER TABLE preference_feedback ADD COLUMN IF NOT EXISTS creative_briefing_id TEXT;
ALTER TABLE preference_feedback ADD COLUMN IF NOT EXISTS creative_prompt TEXT;
ALTER TABLE preference_feedback ADD COLUMN IF NOT EXISTS creative_format TEXT;
ALTER TABLE preference_feedback ADD COLUMN IF NOT EXISTS creative_style TEXT;
ALTER TABLE preference_feedback ADD COLUMN IF NOT EXISTS creative_used_custom_prompt BOOLEAN DEFAULT false;

-- 3. Índice para consultas de histórico por cliente
CREATE INDEX IF NOT EXISTS idx_pref_feedback_creative_client
  ON preference_feedback (client_id, feedback_type, action, created_at DESC)
  WHERE feedback_type = 'creative';
