-- Migration 0287: Client Wallet & Pricing Calculator
--
-- Implements the "Carteira do Cliente" system:
-- Fee mensal → Pacote de Pontos → trava o custo de fornecedores.
-- Fórmula: Cp = (F/Q) × (1 - I - M)  |  Vj = Cp × W
-- Where: F=fee, Q=points, I=tax_rate, M=target_margin, W=job weight

-- ── 1. Wallet config on the clients table ──────────────────────────────────────
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS monthly_fee_brl    NUMERIC(12,2),   -- fee que o cliente paga por mês
  ADD COLUMN IF NOT EXISTS monthly_points     INT,             -- pontos incluídos no fee
  ADD COLUMN IF NOT EXISTS tax_rate_pct       NUMERIC(5,2) DEFAULT 10.00,  -- % impostos (ex: 10 = 10%)
  ADD COLUMN IF NOT EXISTS target_margin_pct  NUMERIC(5,2) DEFAULT 60.00;  -- % margem alvo (ex: 60 = 60%)

-- ── 2. Job-level fields ────────────────────────────────────────────────────────
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS job_points         INT,             -- peso em pontos (P=1, M=3, G=6, GG=12)
  ADD COLUMN IF NOT EXISTS is_refacao_cliente BOOLEAN NOT NULL DEFAULT false;  -- refação por mudança do cliente

-- Backfill job_points from job_size
UPDATE jobs SET job_points = CASE
  WHEN job_size = 'P'  THEN 1
  WHEN job_size = 'M'  THEN 3
  WHEN job_size = 'G'  THEN 6
  WHEN job_size = 'GG' THEN 12
  ELSE NULL
END
WHERE job_points IS NULL AND job_size IS NOT NULL;

-- ── 3. Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_jobs_client_month
  ON jobs (client_id, date_trunc('month', created_at))
  WHERE status NOT IN ('archived', 'cancelled');
