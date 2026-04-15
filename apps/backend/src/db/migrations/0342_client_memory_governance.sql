-- 0342_client_memory_governance.sql
-- Governanca persistida da memoria do cliente: expiracao, supersession e conflitos.

ALTER TABLE client_memory_facts
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS superseded_by_fingerprint TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_client_memory_facts_expires
  ON client_memory_facts (tenant_id, client_id, status, expires_at);

CREATE INDEX IF NOT EXISTS idx_client_memory_facts_superseded
  ON client_memory_facts (tenant_id, client_id, superseded_by_fingerprint);

CREATE TABLE IF NOT EXISTS client_memory_fact_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  conflict_key TEXT NOT NULL,
  primary_fingerprint TEXT NOT NULL,
  conflicting_fingerprint TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('medium', 'high')),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (tenant_id, client_id, conflict_key)
);

CREATE INDEX IF NOT EXISTS idx_client_memory_fact_conflicts_lookup
  ON client_memory_fact_conflicts (tenant_id, client_id, status, detected_at DESC);
