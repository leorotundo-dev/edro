-- ERP Financeiro: contratos, propostas, faturas, budgets de mídia, estimativas de escopo

-- Contratos de serviço por cliente
CREATE TABLE IF NOT EXISTS service_contracts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id         TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type              TEXT NOT NULL DEFAULT 'retainer', -- 'retainer'|'project'|'hourly'
  title             TEXT NOT NULL,
  monthly_value_brl NUMERIC(12,2),    -- retainer mensal
  project_value_brl NUMERIC(12,2),    -- projeto lump sum
  hourly_rate_brl   NUMERIC(10,2),    -- por hora
  start_date        DATE,
  end_date          DATE,
  status            TEXT NOT NULL DEFAULT 'active', -- 'draft'|'active'|'paused'|'ended'
  notes             TEXT,
  omie_client_id    BIGINT,           -- ID do cliente sincronizado no Omie
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS service_contracts_tenant_idx ON service_contracts(tenant_id);
CREATE INDEX IF NOT EXISTS service_contracts_client_idx ON service_contracts(client_id);

-- Propostas comerciais com aceite digital
CREATE TABLE IF NOT EXISTS proposals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id     TEXT REFERENCES clients(id) ON DELETE SET NULL,
  contract_id   UUID REFERENCES service_contracts(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  items         JSONB NOT NULL DEFAULT '[]',
  -- item format: [{ "description": str, "qty": number, "unit_price": number, "total": number }]
  subtotal_brl  NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_brl  NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_brl     NUMERIC(12,2) NOT NULL DEFAULT 0,
  validity_days INTEGER NOT NULL DEFAULT 15,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'draft', -- 'draft'|'sent'|'accepted'|'rejected'|'expired'
  sent_at       TIMESTAMPTZ,
  accepted_at   TIMESTAMPTZ,
  rejected_at   TIMESTAMPTZ,
  accept_token  TEXT UNIQUE,          -- token único para aceite digital via link público
  pdf_url       TEXT,
  created_by    UUID REFERENCES edro_users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS proposals_tenant_idx  ON proposals(tenant_id);
CREATE INDEX IF NOT EXISTS proposals_client_idx  ON proposals(client_id);
CREATE INDEX IF NOT EXISTS proposals_token_idx   ON proposals(accept_token) WHERE accept_token IS NOT NULL;

-- Faturas (retainer mensal ou por projeto)
CREATE TABLE IF NOT EXISTS invoices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id     TEXT NOT NULL REFERENCES clients(id),
  contract_id   UUID REFERENCES service_contracts(id) ON DELETE SET NULL,
  period_month  TEXT,                 -- 'YYYY-MM' para retainers
  description   TEXT NOT NULL,
  amount_brl    NUMERIC(12,2) NOT NULL,
  due_date      DATE,
  status        TEXT NOT NULL DEFAULT 'draft', -- 'draft'|'sent'|'paid'|'overdue'|'cancelled'
  paid_at       TIMESTAMPTZ,
  omie_os_id    BIGINT,               -- OS criada no Omie
  omie_nfe_id   BIGINT,               -- NFS-e emitida no Omie
  omie_nfe_numero TEXT,               -- Número da NF
  pdf_url       TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS invoices_tenant_idx  ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS invoices_client_idx  ON invoices(client_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx  ON invoices(status);

-- Budget de mídia por cliente/mês/plataforma
CREATE TABLE IF NOT EXISTS media_budgets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  client_id     TEXT NOT NULL REFERENCES clients(id),
  period_month  TEXT NOT NULL,        -- 'YYYY-MM'
  platform      TEXT NOT NULL,        -- 'meta_ads'|'google_ads'|'linkedin'|'tiktok'
  planned_brl   NUMERIC(12,2) NOT NULL DEFAULT 0,
  realized_brl  NUMERIC(12,2) NOT NULL DEFAULT 0,
  markup_pct    NUMERIC(5,2) NOT NULL DEFAULT 15,
  notes         TEXT,
  UNIQUE (tenant_id, client_id, period_month, platform)
);

CREATE INDEX IF NOT EXISTS media_budgets_tenant_idx ON media_budgets(tenant_id, period_month);

-- Estimativas de escopo por briefing (histórico para Scope AI)
CREATE TABLE IF NOT EXISTS job_estimations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID REFERENCES tenants(id),
  briefing_id         UUID REFERENCES edro_briefings(id) ON DELETE CASCADE,
  estimated_hours     NUMERIC(8,2),
  estimated_cost_brl  NUMERIC(10,2),
  complexity          TEXT,           -- 'simple'|'medium'|'complex'|'premium'
  confidence          NUMERIC(4,3),   -- 0.000–1.000
  factors             JSONB,          -- {platform, format, labels, has_video, revision_risk}
  similar_jobs_count  INTEGER DEFAULT 0,
  rationale           TEXT,
  actual_hours        NUMERIC(8,2),   -- preenchido quando job fecha
  deviation_pct       NUMERIC(8,2),   -- ((actual-estimated)/estimated)*100
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS job_estimations_briefing_idx ON job_estimations(briefing_id);
