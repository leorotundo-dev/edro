-- Migration 0286: T-Shirt Pricing — B2B per-escopo billing model
--
-- Adds job_size (P/M/G/GG) and fee_brl to the jobs table.
-- This enables the "padrão ouro B2B": payment tied to the deliverable card,
-- not to hours worked. Freelancer sees what, when, and how much before accepting.

-- ── 1. job_size reference table ────────────────────────────────────────────────
-- Stores the agency's internal pricing table per size tier.
-- Prices are REFERENCES only — actual fee_brl is set per-job at creation time.
CREATE TABLE IF NOT EXISTS job_size_prices (
  size          TEXT PRIMARY KEY CHECK (size IN ('P','M','G','GG')),
  label         TEXT NOT NULL,
  description   TEXT NOT NULL,
  ref_price_brl NUMERIC(10,2) NOT NULL,
  sort_order    INT NOT NULL DEFAULT 0
);

-- Default T-shirt sizing table (per Gemini's B2B spec)
INSERT INTO job_size_prices (size, label, description, ref_price_brl, sort_order)
VALUES
  ('P',  'Pequeno',       'Alteração de formato, adaptação de stories, arte simples sem manipulação',     80.00,  1),
  ('M',  'Médio',         'Arte do zero com manipulação de imagem, edição de reels de até 30s',          250.00, 2),
  ('G',  'Grande',        'Key Visual de campanha, edição de vídeo YouTube (10min), Landing Page simples', 600.00, 3),
  ('GG', 'Extra Grande',  'Identidade Visual completa, E-commerce, Vídeo Manifesto 3D',                1500.00, 4)
ON CONFLICT (size) DO NOTHING;

-- ── 2. Add fields to jobs table ─────────────────────────────────────────────────
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS job_size  TEXT CHECK (job_size IN ('P','M','G','GG')),
  ADD COLUMN IF NOT EXISTS fee_brl   NUMERIC(10,2);   -- honorário desta demanda

-- Backfill job_size from existing complexity field
UPDATE jobs SET job_size = CASE
  WHEN complexity = 's' THEN 'P'
  WHEN complexity = 'm' THEN 'M'
  WHEN complexity = 'l' THEN 'G'
  ELSE NULL
END
WHERE job_size IS NULL;

-- ── 3. Pool-related fields ───────────────────────────────────────────────────────
-- pool_visible: job is published to the freelancer pool for self-selection
-- pool_at: when it entered the pool
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS pool_visible BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pool_at      TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_jobs_pool_visible
  ON jobs (tenant_id, pool_visible, status)
  WHERE pool_visible = true;
