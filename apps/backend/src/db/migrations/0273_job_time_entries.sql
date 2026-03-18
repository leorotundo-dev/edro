-- job_time_entries: registra horas efetivamente trabalhadas por job
CREATE TABLE IF NOT EXISTS job_time_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES edro_users(id),
  minutes     INTEGER NOT NULL CHECK (minutes > 0),
  notes       TEXT,
  logged_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_time_entries_job  ON job_time_entries(job_id);
CREATE INDEX IF NOT EXISTS idx_job_time_entries_user ON job_time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_job_time_entries_tenant ON job_time_entries(tenant_id);

-- View útil: minutos totais por job
CREATE OR REPLACE VIEW job_time_summary AS
SELECT
  job_id,
  SUM(minutes) AS total_minutes,
  COUNT(*) AS entry_count,
  MAX(logged_at) AS last_entry_at
FROM job_time_entries
GROUP BY job_id;
