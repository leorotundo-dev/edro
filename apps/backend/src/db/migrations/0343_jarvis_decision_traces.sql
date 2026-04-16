-- 0343_jarvis_decision_traces.sql
-- Trilha auditavel do Jarvis por resposta/acao.

CREATE TABLE IF NOT EXISTS jarvis_decision_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  client_id TEXT NULL,
  edro_client_id UUID NULL,
  conversation_id UUID NULL,
  user_id TEXT NULL,
  route TEXT NOT NULL CHECK (route IN ('operations', 'planning')),
  intent TEXT NOT NULL,
  task_type TEXT NOT NULL,
  actor_profile TEXT NOT NULL,
  confidence_score NUMERIC(6,3) NOT NULL DEFAULT 0,
  confidence_band TEXT NOT NULL,
  confidence_mode TEXT NOT NULL,
  message_excerpt TEXT NOT NULL,
  response_excerpt TEXT NULL,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  suppressed_facts JSONB NOT NULL DEFAULT '[]'::jsonb,
  governance JSONB NOT NULL DEFAULT '{}'::jsonb,
  tool_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
  artifacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jarvis_decision_traces_lookup
  ON jarvis_decision_traces (tenant_id, client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jarvis_decision_traces_conversation
  ON jarvis_decision_traces (tenant_id, conversation_id, created_at DESC);
