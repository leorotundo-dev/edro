-- Migration 0285: Freelancer B2B Legal Compliance
-- Adds CNPJ/PJ fields, clickwrap acceptance log, supplier score, and glosa on payables.
-- All terminology enforces B2B (Fornecedor/Contratada), never CLT.

-- ── 1. CNPJ & PJ fields on freelancer_profiles ─────────────────────────────
ALTER TABLE freelancer_profiles
  ADD COLUMN IF NOT EXISTS cnpj                TEXT,
  ADD COLUMN IF NOT EXISTS razao_social        TEXT,
  ADD COLUMN IF NOT EXISTS nome_fantasia       TEXT,
  ADD COLUMN IF NOT EXISTS inscricao_municipal TEXT,
  ADD COLUMN IF NOT EXISTS address_street      TEXT,
  ADD COLUMN IF NOT EXISTS address_number      TEXT,
  ADD COLUMN IF NOT EXISTS address_complement  TEXT,
  ADD COLUMN IF NOT EXISTS address_district    TEXT,
  ADD COLUMN IF NOT EXISTS address_city        TEXT,
  ADD COLUMN IF NOT EXISTS address_state       CHAR(2),
  ADD COLUMN IF NOT EXISTS address_cep         TEXT,
  ADD COLUMN IF NOT EXISTS representante_nome  TEXT,   -- nome completo do representante legal
  ADD COLUMN IF NOT EXISTS representante_cpf   TEXT,   -- CPF do representante (NÃO para pagamento)
  ADD COLUMN IF NOT EXISTS estado_civil        TEXT,
  ADD COLUMN IF NOT EXISTS pix_key             TEXT,   -- chave pix (deve ser CNPJ/e-mail/telefone da PJ)
  ADD COLUMN IF NOT EXISTS pix_key_type        TEXT CHECK (pix_key_type IN ('cnpj','email','telefone','aleatoria')),
  ADD COLUMN IF NOT EXISTS portfolio_url       TEXT,
  ADD COLUMN IF NOT EXISTS weekly_capacity     INT DEFAULT 40,  -- horas semanais de capacidade declarada
  -- Onboarding & compliance state
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_accepted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_accepted_ip   TEXT,
  ADD COLUMN IF NOT EXISTS terms_version       TEXT DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS contract_signed_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contract_url        TEXT,
  -- Supplier score (computed by scoring worker, not a time-tracker)
  ADD COLUMN IF NOT EXISTS sla_score           NUMERIC(5,2) DEFAULT 100.00,  -- 0–100
  ADD COLUMN IF NOT EXISTS deliveries_total    INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deliveries_on_time  INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deliveries_late     INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_updated_at    TIMESTAMPTZ;

-- Unique index on CNPJ per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_freelancer_profiles_cnpj
  ON freelancer_profiles (tenant_id, cnpj)
  WHERE cnpj IS NOT NULL;

-- ── 2. Clickwrap acceptance log ─────────────────────────────────────────────
-- Each row = one "Li e concordo" click. Immutable audit trail.
CREATE TABLE IF NOT EXISTS freelancer_term_acceptances (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES edro_users(id) ON DELETE CASCADE,
  tenant_id     TEXT NOT NULL,
  terms_version TEXT NOT NULL DEFAULT '1.0',
  accepted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address    TEXT,               -- client IP at time of click
  user_agent    TEXT,               -- browser/device for audit
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_term_acceptances_user ON freelancer_term_acceptances (user_id);
CREATE INDEX IF NOT EXISTS idx_term_acceptances_tenant ON freelancer_term_acceptances (tenant_id);

-- ── 3. Glosa (SLA penalty) on freelancer_payables ───────────────────────────
ALTER TABLE freelancer_payables
  ADD COLUMN IF NOT EXISTS glosa_brl        NUMERIC(10,2) DEFAULT 0,   -- total deducted for late SLAs
  ADD COLUMN IF NOT EXISTS glosa_details    JSONB,                      -- [{job_id, title, days_late, deducted_brl}]
  ADD COLUMN IF NOT EXISTS net_amount_brl   NUMERIC(10,2),              -- amount_brl - glosa_brl
  ADD COLUMN IF NOT EXISTS nf_url           TEXT,                       -- link to Nota Fiscal uploaded by supplier
  ADD COLUMN IF NOT EXISTS nf_number        TEXT,                       -- NF number
  ADD COLUMN IF NOT EXISTS nf_uploaded_at   TIMESTAMPTZ;

-- Recompute net_amount_brl as generated column if not exists (Postgres 12+)
-- We'll handle net computation in the application layer instead for compatibility.

-- ── 4. SLA violation log per job ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS freelancer_sla_violations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       TEXT NOT NULL,
  freelancer_id   UUID NOT NULL REFERENCES edro_users(id) ON DELETE CASCADE,
  job_id          UUID REFERENCES jobs(id) ON DELETE SET NULL,
  job_title       TEXT,
  deadline_at     TIMESTAMPTZ NOT NULL,
  delivered_at    TIMESTAMPTZ,
  days_late       INT NOT NULL DEFAULT 0,
  glosa_pct       NUMERIC(5,2) DEFAULT 0,    -- % deducted from job fee
  glosa_brl       NUMERIC(10,2) DEFAULT 0,
  payable_id      UUID,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sla_violations_freelancer ON freelancer_sla_violations (freelancer_id);
CREATE INDEX IF NOT EXISTS idx_sla_violations_tenant ON freelancer_sla_violations (tenant_id);
