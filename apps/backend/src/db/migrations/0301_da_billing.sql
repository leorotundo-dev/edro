-- Migration 0301: DA Billing — slot capacity + billing rates + entries

-- Tabela de taxas por job size por freelancer
CREATE TABLE IF NOT EXISTS da_billing_rates (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    TEXT NOT NULL,
  freelancer_id UUID NOT NULL REFERENCES edro_users(id) ON DELETE CASCADE,
  job_size     TEXT NOT NULL CHECK (job_size IN ('P', 'M', 'G')),
  rate_cents   INT NOT NULL DEFAULT 0,  -- valor em centavos (BRL)
  currency     TEXT NOT NULL DEFAULT 'BRL',
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, freelancer_id, job_size, effective_from)
);

CREATE INDEX IF NOT EXISTS da_billing_rates_freelancer_idx ON da_billing_rates(freelancer_id, tenant_id);

-- Entradas de cobrança por job concluído
CREATE TABLE IF NOT EXISTS da_billing_entries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     TEXT NOT NULL,
  freelancer_id UUID NOT NULL REFERENCES edro_users(id) ON DELETE CASCADE,
  job_id        UUID NOT NULL REFERENCES edro_jobs(id) ON DELETE CASCADE,
  job_size      TEXT NOT NULL CHECK (job_size IN ('P', 'M', 'G')),
  rate_cents    INT NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'BRL',
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'disputed')),
  period_month  TEXT NOT NULL,  -- 'YYYY-MM' — mês de referência
  approved_at   TIMESTAMPTZ,
  approved_by   UUID REFERENCES edro_users(id),
  paid_at       TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, freelancer_id)  -- um entry por job por DA
);

CREATE INDEX IF NOT EXISTS da_billing_entries_freelancer_idx  ON da_billing_entries(freelancer_id, tenant_id, status);
CREATE INDEX IF NOT EXISTS da_billing_entries_period_idx      ON da_billing_entries(tenant_id, period_month, status);
CREATE INDEX IF NOT EXISTS da_billing_entries_job_idx         ON da_billing_entries(job_id);

-- Capacidade semanal por DA (slots)
CREATE TABLE IF NOT EXISTS da_capacity_slots (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     TEXT NOT NULL,
  freelancer_id UUID NOT NULL REFERENCES edro_users(id) ON DELETE CASCADE,
  week_start    DATE NOT NULL,  -- sempre segunda-feira
  slots_total   INT NOT NULL DEFAULT 5,
  slots_used    INT NOT NULL DEFAULT 0,
  slots_blocked INT NOT NULL DEFAULT 0,  -- férias, bloqueios
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, freelancer_id, week_start)
);

CREATE INDEX IF NOT EXISTS da_capacity_slots_week_idx ON da_capacity_slots(tenant_id, week_start);
