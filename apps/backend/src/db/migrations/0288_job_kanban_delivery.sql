-- Migration 0288: Job Kanban — Delivery Tracking
--
-- Adds delivery and adjustment tracking fields to support the B2B Kanban flow:
-- Mercado de Escopos → Em Execução → Em Homologação → Ajuste de Escopo → Entregável Aprovado
--
-- SLA behavior:
--   - Clock runs in 'allocated' (Em Execução) and 'adjustment' (Ajuste de Escopo)
--   - Clock PAUSES when job enters 'in_review' (sla_paused_at set)
--   - Clock RESUMES (+ extra 24h) when agency sends back to 'adjustment'

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS delivered_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_link      TEXT,
  ADD COLUMN IF NOT EXISTS delivery_notes      TEXT,
  ADD COLUMN IF NOT EXISTS sla_paused_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS adjustment_feedback TEXT,
  ADD COLUMN IF NOT EXISTS approved_at         TIMESTAMPTZ;

-- Index for admin homologation queue
CREATE INDEX IF NOT EXISTS idx_jobs_in_review
  ON jobs (tenant_id, delivered_at)
  WHERE status = 'in_review';

-- Index for adjustment queue
CREATE INDEX IF NOT EXISTS idx_jobs_adjustment
  ON jobs (tenant_id, updated_at)
  WHERE status = 'adjustment';
