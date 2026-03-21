-- Migration 0294: Add representative fields to tenant_config (needed for contracts)

ALTER TABLE tenant_config
  ADD COLUMN IF NOT EXISTS agency_representative      TEXT,
  ADD COLUMN IF NOT EXISTS agency_representative_cpf  TEXT;
