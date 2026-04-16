-- 0346_client_memory_resolution.sql
-- Resolução humana e trilha de edição da memória do cliente.

CREATE TABLE IF NOT EXISTS client_memory_resolution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  conflict_key TEXT NULL,
  fingerprint TEXT NULL,
  action TEXT NOT NULL,
  actor_id TEXT NULL,
  actor_email TEXT NULL,
  note TEXT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_memory_resolution_log_lookup
  ON client_memory_resolution_log (tenant_id, client_id, created_at DESC);

