-- Migration 0347: Trello ↔ Jobs total bidirectional sync
--
-- Adds:
--   1. trello_card_id TEXT on jobs — links a job to its source Trello card
--   2. sla_agreed_days INTEGER — the agreed SLA tier (3, 5, or 15 days)
--   3. trello_list_name TEXT — last known Trello list name (for status mapping)
--   4. job_sla_report VIEW — computes Tempo Real, Avaliação (Estourado/No Prazo)
--   5. Unique index on (tenant_id, trello_card_id) for upserts

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS trello_card_id   TEXT,
  ADD COLUMN IF NOT EXISTS sla_agreed_days  INTEGER CHECK (sla_agreed_days IN (3, 5, 15)),
  ADD COLUMN IF NOT EXISTS trello_list_name TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_tenant_trello_card
  ON jobs (tenant_id, trello_card_id)
  WHERE trello_card_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_trello_card_id
  ON jobs (trello_card_id)
  WHERE trello_card_id IS NOT NULL;

-- ── SLA Report View ───────────────────────────────────────────────────────────
-- Replicates the spreadsheet's "Avaliação" logic:
--   - Tempo Real (Dias): actual elapsed days from created_at to completed_at (or now)
--   - Dias Overdue: Tempo Real - sla_agreed_days (positive = overdue)
--   - Avaliação: 'Estourado' or 'No Prazo'

CREATE OR REPLACE VIEW job_sla_report AS
SELECT
  j.id,
  j.tenant_id,
  j.client_id,
  c.name                                                  AS client_name,
  j.title,
  j.job_type,
  j.status,
  j.trello_card_id,
  j.trello_list_name,
  j.sla_agreed_days,
  j.deadline_at,
  j.created_at,
  j.completed_at,
  j.owner_id,
  u.name                                                  AS owner_name,

  -- Tempo Real em Dias (like spreadsheet column D)
  ROUND(
    EXTRACT(EPOCH FROM (COALESCE(j.completed_at, now()) - j.created_at)) / 86400.0,
    1
  )::NUMERIC(10,1)                                        AS tempo_real_dias,

  -- Days overdue relative to agreed SLA
  CASE
    WHEN j.sla_agreed_days IS NOT NULL THEN
      ROUND(
        EXTRACT(EPOCH FROM (COALESCE(j.completed_at, now()) - j.created_at)) / 86400.0
        - j.sla_agreed_days,
        1
      )::NUMERIC(10,1)
    WHEN j.deadline_at IS NOT NULL THEN
      ROUND(
        EXTRACT(EPOCH FROM (COALESCE(j.completed_at, now()) - j.deadline_at)) / 86400.0,
        1
      )::NUMERIC(10,1)
    ELSE NULL
  END                                                     AS dias_overdue,

  -- Avaliação: matches spreadsheet emoji logic
  CASE
    WHEN j.status IN ('done', 'published', 'archived') THEN
      CASE
        WHEN j.sla_agreed_days IS NOT NULL AND
             EXTRACT(EPOCH FROM (COALESCE(j.completed_at, now()) - j.created_at)) / 86400.0
             <= j.sla_agreed_days
          THEN 'No Prazo'
        WHEN j.deadline_at IS NOT NULL AND COALESCE(j.completed_at, now()) <= j.deadline_at
          THEN 'No Prazo'
        ELSE 'Estourado'
      END
    ELSE -- open jobs
      CASE
        WHEN j.deadline_at IS NOT NULL AND now() > j.deadline_at
          THEN 'Estourado'
        WHEN j.sla_agreed_days IS NOT NULL AND
             EXTRACT(EPOCH FROM (now() - j.created_at)) / 86400.0 > j.sla_agreed_days
          THEN 'Estourado'
        ELSE 'Em andamento'
      END
  END                                                     AS avaliacao,

  -- SLA met boolean (for aggregations)
  CASE
    WHEN j.status NOT IN ('done', 'published', 'archived') THEN NULL
    WHEN j.sla_agreed_days IS NOT NULL THEN
      EXTRACT(EPOCH FROM (COALESCE(j.completed_at, now()) - j.created_at)) / 86400.0
      <= j.sla_agreed_days
    WHEN j.deadline_at IS NOT NULL THEN
      COALESCE(j.completed_at, now()) <= j.deadline_at
    ELSE NULL
  END                                                     AS sla_met

FROM jobs j
LEFT JOIN clients c ON c.id = j.client_id
LEFT JOIN edro_users u ON u.id = j.owner_id;
