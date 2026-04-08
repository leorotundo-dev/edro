-- 0327_client_memory_facts.sql
-- Fatos tipados da memoria viva do cliente para o Jarvis.

CREATE TABLE IF NOT EXISTS client_memory_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  fact_type TEXT NOT NULL
    CHECK (fact_type IN ('directive', 'evidence', 'commitment')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'resolved', 'archived')),
  fingerprint TEXT NOT NULL,
  source_type TEXT NULL,
  source_id TEXT NULL,
  title TEXT NOT NULL,
  summary TEXT NULL,
  fact_text TEXT NOT NULL,
  related_at TIMESTAMPTZ NULL,
  deadline DATE NULL,
  priority TEXT NULL,
  confidence_score NUMERIC(5,2) NOT NULL DEFAULT 0.70,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, client_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_client_memory_facts_lookup
  ON client_memory_facts (tenant_id, client_id, fact_type, status, related_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_memory_facts_deadline
  ON client_memory_facts (tenant_id, client_id, deadline, status);

