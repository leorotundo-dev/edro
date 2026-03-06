-- Migration 0222: Portal do Cliente
-- Fase 3 do ERP: copy approval thread, portal auth, operational agent dedup

-- Vincular cliente ao portal_user (edro_user com role='client')
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS portal_user_id UUID REFERENCES edro_users(id);

-- Campos de aprovação de copy no briefing
ALTER TABLE edro_briefings
  ADD COLUMN IF NOT EXISTS copy_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS copy_approval_comment TEXT;

-- Thread de aprovação de copy (diálogo agência ↔ cliente)
CREATE TABLE IF NOT EXISTS copy_approval_thread (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_id UUID NOT NULL REFERENCES edro_briefings(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL CHECK (author_type IN ('agency', 'client')),
  author_name TEXT,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS copy_approval_thread_briefing_idx
  ON copy_approval_thread (briefing_id, created_at);

-- Log de deduplicação do agente operacional (1 disparo por trigger_key por dia)
CREATE TABLE IF NOT EXISTS agent_action_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id),
  trigger_key TEXT NOT NULL,
  fired_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  fired_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata    JSONB
);

CREATE UNIQUE INDEX IF NOT EXISTS agent_action_log_dedup_idx
  ON agent_action_log (trigger_key, fired_date);

-- Client health scores (gerado semanalmente pelo clientHealthWorker)
CREATE TABLE IF NOT EXISTS client_health_scores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  period_date DATE NOT NULL,
  score       INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  factors     JSONB NOT NULL DEFAULT '{}',
  trend       TEXT CHECK (trend IN ('up', 'stable', 'down')),
  UNIQUE (client_id, period_date)
);

CREATE INDEX IF NOT EXISTS client_health_scores_client_idx
  ON client_health_scores (client_id, period_date DESC);
