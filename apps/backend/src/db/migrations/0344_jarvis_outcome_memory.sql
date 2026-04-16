-- 0344_jarvis_outcome_memory.sql
-- Memoria de resultado do Jarvis para fechar o loop com execucao.

CREATE TABLE IF NOT EXISTS jarvis_outcome_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  trace_id UUID NULL REFERENCES jarvis_decision_traces(id) ON DELETE SET NULL,
  conversation_id UUID NULL,
  outcome_type TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NULL,
  source_key TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  summary TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ NULL,
  UNIQUE (tenant_id, client_id, outcome_type, source_type, source_key)
);

CREATE INDEX IF NOT EXISTS idx_jarvis_outcome_memory_lookup
  ON jarvis_outcome_memory (tenant_id, client_id, created_at DESC);
