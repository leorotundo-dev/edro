-- Core operacional da Edro: jobs, taxonomia e historico de status

CREATE TABLE IF NOT EXISTS job_types (
  code                       TEXT PRIMARY KEY,
  label                      TEXT NOT NULL,
  default_skill              TEXT,
  default_definition_of_done TEXT,
  is_schedulable             BOOLEAN NOT NULL DEFAULT true,
  is_billable                BOOLEAN NOT NULL DEFAULT true,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skills (
  code       TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  category   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS channels (
  code       TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           TEXT NOT NULL,
  client_id           TEXT REFERENCES clients(id) ON DELETE SET NULL,
  title               TEXT NOT NULL,
  summary             TEXT,
  job_type            TEXT NOT NULL REFERENCES job_types(code),
  complexity          TEXT NOT NULL CHECK (complexity IN ('s', 'm', 'l')),
  channel             TEXT REFERENCES channels(code),
  source              TEXT NOT NULL,
  status              TEXT NOT NULL CHECK (
    status IN (
      'intake',
      'planned',
      'ready',
      'allocated',
      'in_progress',
      'blocked',
      'in_review',
      'awaiting_approval',
      'approved',
      'scheduled',
      'published',
      'done',
      'archived'
    )
  ),
  priority_score      INTEGER NOT NULL DEFAULT 0,
  priority_band       TEXT NOT NULL DEFAULT 'p4' CHECK (
    priority_band IN ('p0', 'p1', 'p2', 'p3', 'p4')
  ),
  impact_level        INTEGER NOT NULL DEFAULT 0 CHECK (impact_level BETWEEN 0 AND 5),
  dependency_level    INTEGER NOT NULL DEFAULT 0 CHECK (dependency_level BETWEEN 0 AND 5),
  required_skill      TEXT REFERENCES skills(code),
  owner_id            UUID REFERENCES edro_users(id) ON DELETE SET NULL,
  deadline_at         TIMESTAMPTZ,
  estimated_minutes   INTEGER,
  actual_minutes      INTEGER NOT NULL DEFAULT 0,
  blocked_minutes     INTEGER NOT NULL DEFAULT 0,
  queue_minutes       INTEGER NOT NULL DEFAULT 0,
  is_urgent           BOOLEAN NOT NULL DEFAULT false,
  urgency_reason      TEXT,
  urgency_approved_by UUID REFERENCES edro_users(id) ON DELETE SET NULL,
  definition_of_done  TEXT,
  created_by          UUID REFERENCES edro_users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ,
  archived_at         TIMESTAMPTZ,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS job_status_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  changed_by  UUID REFERENCES edro_users(id) ON DELETE SET NULL,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason      TEXT
);

CREATE TABLE IF NOT EXISTS job_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id     UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  author_id  UUID REFERENCES edro_users(id) ON DELETE SET NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_tenant_id
  ON jobs(tenant_id);

CREATE INDEX IF NOT EXISTS idx_jobs_client_id
  ON jobs(client_id);

CREATE INDEX IF NOT EXISTS idx_jobs_status
  ON jobs(status);

CREATE INDEX IF NOT EXISTS idx_jobs_priority_band
  ON jobs(priority_band);

CREATE INDEX IF NOT EXISTS idx_jobs_deadline_at
  ON jobs(deadline_at);

CREATE INDEX IF NOT EXISTS idx_jobs_owner_id
  ON jobs(owner_id);

CREATE INDEX IF NOT EXISTS idx_jobs_job_type
  ON jobs(job_type);

CREATE INDEX IF NOT EXISTS idx_jobs_created_at
  ON jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_tenant_status_priority
  ON jobs(tenant_id, status, priority_band, deadline_at);

CREATE INDEX IF NOT EXISTS idx_job_status_history_job_id
  ON job_status_history(job_id);

CREATE INDEX IF NOT EXISTS idx_job_status_history_changed_at
  ON job_status_history(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_comments_job_id
  ON job_comments(job_id, created_at DESC);

CREATE OR REPLACE FUNCTION set_jobs_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_jobs_set_updated_at ON jobs;

CREATE TRIGGER trg_jobs_set_updated_at
BEFORE UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION set_jobs_updated_at();

INSERT INTO job_types (
  code,
  label,
  default_skill,
  default_definition_of_done,
  is_schedulable,
  is_billable
) VALUES
  ('briefing', 'Briefing', 'atendimento', 'Briefing validado e pronto para producao', true, true),
  ('copy', 'Copy', 'copy', 'Texto final aprovado internamente', true, true),
  ('design_static', 'Peca estatica', 'design', 'Peca final entregue ou aprovada para publicacao', true, true),
  ('design_carousel', 'Carrossel', 'design', 'Carrossel final aprovado', true, true),
  ('video_edit', 'Video', 'video', 'Video final exportado e aprovado', true, true),
  ('campaign', 'Campanha', 'estrategia', 'Campanha estruturada com subjobs definidos', true, true),
  ('meeting', 'Reuniao', 'atendimento', 'Reuniao realizada com desdobramentos registrados', true, false),
  ('approval', 'Aprovacao', 'operacao', 'Decisao tomada', true, false),
  ('publication', 'Publicacao', 'social', 'Conteudo publicado ou agendado corretamente', true, true),
  ('urgent_request', 'Urgencia', 'operacao', 'Demanda urgente resolvida e impacto registrado', true, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO skills (code, label, category) VALUES
  ('atendimento', 'Atendimento', 'operacao'),
  ('copy', 'Copy', 'criacao'),
  ('design', 'Design', 'criacao'),
  ('video', 'Video', 'criacao'),
  ('social', 'Social Media', 'operacao'),
  ('estrategia', 'Estrategia', 'planejamento'),
  ('operacao', 'Operacao', 'operacao'),
  ('financeiro', 'Financeiro', 'backoffice')
ON CONFLICT (code) DO NOTHING;

INSERT INTO channels (code, label) VALUES
  ('instagram', 'Instagram'),
  ('linkedin', 'LinkedIn'),
  ('stories', 'Stories'),
  ('reels', 'Reels'),
  ('tiktok', 'TikTok'),
  ('youtube', 'YouTube'),
  ('blog', 'Blog'),
  ('site', 'Site'),
  ('whatsapp', 'WhatsApp'),
  ('email', 'E-mail')
ON CONFLICT (code) DO NOTHING;
