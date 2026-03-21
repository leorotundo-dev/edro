-- Migration 0290: Billing Cycles — B2B payment flow
--
-- Adds glosa_brl to jobs (SLA penalty at approval) and a
-- freelancer_billing_cycles table that freezes monthly snapshots.
--
-- Payment calendar:
--   D0  (último dia do mês):  ciclo fecha, saldo congelado
--   D1–D5 (1º a 5º):          janela de upload da NF-e
--   D6–D9:                    NF em análise pelo financeiro
--   D10:                      agência clica "Pagamento Efetuado"

-- ── 1. SLA penalty on jobs ────────────────────────────────────────────────────
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS glosa_brl NUMERIC(10,2) DEFAULT 0;

-- ── 2. Billing cycles ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS freelancer_billing_cycles (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  freelancer_id    UUID NOT NULL REFERENCES freelancer_profiles(id) ON DELETE CASCADE,
  tenant_id        TEXT NOT NULL,
  period_month     TEXT NOT NULL,             -- 'YYYY-MM' of the CLOSED cycle
  status           TEXT NOT NULL DEFAULT 'nf_pending'
                     CHECK (status IN ('nf_pending','nf_submitted','nf_analysis','paid','overdue')),

  -- Frozen amounts (snapshot at D0)
  approved_brl     NUMERIC(12,2) NOT NULL DEFAULT 0,
  glosa_brl        NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- NF submission (D1–D5)
  nf_number        TEXT,
  nf_url           TEXT,
  nf_submitted_at  TIMESTAMPTZ,

  -- Payment (D10)
  paid_at          TIMESTAMPTZ,
  payment_notes    TEXT,

  -- Deadlines
  nf_due_date      DATE,        -- day 5 of next month
  payment_date     DATE,        -- day 10 of next month

  frozen_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(freelancer_id, period_month)
);

CREATE INDEX IF NOT EXISTS idx_billing_cycles_freelancer ON freelancer_billing_cycles(freelancer_id, status);
CREATE INDEX IF NOT EXISTS idx_billing_cycles_period     ON freelancer_billing_cycles(period_month, status);
