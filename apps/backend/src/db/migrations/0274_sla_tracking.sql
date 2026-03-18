-- View materializada de SLA por job: calcula se foi entregue no prazo
-- Usada pelo endpoint GET /jobs/sla e pelo painel de SLA no admin.

CREATE OR REPLACE VIEW job_sla_view AS
SELECT
  j.id                                              AS job_id,
  j.tenant_id,
  j.client_id,
  c.name                                            AS client_name,
  j.owner_id,
  COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS owner_name,
  j.title,
  j.job_type,
  j.priority_band,
  j.deadline_at,
  j.completed_at,
  j.actual_minutes,
  j.estimated_minutes,
  j.revision_count,
  -- SLA met: entregue antes ou no prazo
  CASE
    WHEN j.completed_at IS NOT NULL AND j.deadline_at IS NOT NULL
    THEN j.completed_at <= j.deadline_at
    WHEN j.completed_at IS NOT NULL AND j.deadline_at IS NULL
    THEN true  -- no deadline = always on time
    ELSE NULL  -- still open
  END                                               AS sla_met,
  -- Days variance: negative = early, positive = late
  CASE
    WHEN j.completed_at IS NOT NULL AND j.deadline_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (j.completed_at - j.deadline_at)) / 86400.0
    ELSE NULL
  END                                               AS days_variance,
  j.created_at
FROM jobs j
LEFT JOIN clients c ON c.id = j.client_id
LEFT JOIN edro_users u ON u.id = j.owner_id;

-- Index to speed up SLA queries
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_completed ON jobs(tenant_id, completed_at)
  WHERE completed_at IS NOT NULL;
