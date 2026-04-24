-- Canonical job numbering + Google Drive provisioning.
--
-- One visible code follows each job across Edro, Trello and Drive:
--   {CLIENT_CODE}-{YEAR}-{NNNN} | {job title}

CREATE TABLE IF NOT EXISTS job_counters (
  tenant_id   TEXT NOT NULL,
  client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  year        INTEGER NOT NULL,
  next_value  INTEGER NOT NULL DEFAULT 1 CHECK (next_value > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, client_id, year)
);

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS job_code TEXT,
  ADD COLUMN IF NOT EXISTS job_code_prefix TEXT,
  ADD COLUMN IF NOT EXISTS job_sequence_year INTEGER,
  ADD COLUMN IF NOT EXISTS client_job_sequence INTEGER,
  ADD COLUMN IF NOT EXISTS canonical_title TEXT,
  ADD COLUMN IF NOT EXISTS drive_folder_id TEXT,
  ADD COLUMN IF NOT EXISTS drive_folder_url TEXT,
  ADD COLUMN IF NOT EXISTS drive_provision_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS drive_provision_error TEXT,
  ADD COLUMN IF NOT EXISTS drive_provisioned_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_tenant_job_code
  ON jobs (tenant_id, job_code)
  WHERE job_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_drive_provision_status
  ON jobs (tenant_id, drive_provision_status)
  WHERE drive_provision_status IS DISTINCT FROM 'ready';

ALTER TABLE project_cards
  ADD COLUMN IF NOT EXISTS job_code TEXT,
  ADD COLUMN IF NOT EXISTS drive_folder_id TEXT,
  ADD COLUMN IF NOT EXISTS drive_folder_url TEXT;

CREATE TABLE IF NOT EXISTS google_drive_connections (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      TEXT NOT NULL UNIQUE,
  email_address  TEXT NOT NULL,
  access_token   TEXT,
  refresh_token  TEXT,
  token_expiry   TIMESTAMPTZ,
  connected_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error     TEXT
);

CREATE TABLE IF NOT EXISTS client_drive_roots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         TEXT NOT NULL,
  client_id         TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  drive_folder_id   TEXT NOT NULL,
  drive_folder_url  TEXT,
  active            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_client_drive_roots_tenant
  ON client_drive_roots (tenant_id, active);

CREATE TABLE IF NOT EXISTS google_drive_settings (
  tenant_id                 TEXT PRIMARY KEY,
  clients_root_folder_id    TEXT,
  clients_root_folder_url   TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_drive_folders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         TEXT NOT NULL,
  job_id            UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  client_id         TEXT REFERENCES clients(id) ON DELETE SET NULL,
  folder_name       TEXT NOT NULL,
  folder_id         TEXT,
  folder_url        TEXT,
  status            TEXT NOT NULL DEFAULT 'pending',
  error             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_job_drive_folders_tenant_status
  ON job_drive_folders (tenant_id, status);
