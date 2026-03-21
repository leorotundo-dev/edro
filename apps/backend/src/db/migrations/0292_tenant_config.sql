-- Migration 0292: Tenant Configuration
-- Stores per-tenant settings: agency CNPJ, billing info, etc.

CREATE TABLE IF NOT EXISTS tenant_config (
  tenant_id   TEXT PRIMARY KEY,
  agency_name TEXT,
  agency_cnpj TEXT,
  agency_ie   TEXT,           -- Inscrição Estadual
  agency_address TEXT,
  agency_city TEXT,
  agency_email TEXT,
  agency_phone TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
