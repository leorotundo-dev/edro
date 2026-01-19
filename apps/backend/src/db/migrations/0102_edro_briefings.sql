CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS edro_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  segment TEXT,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS edro_clients_name_idx
  ON edro_clients (LOWER(name));

CREATE TABLE IF NOT EXISTS edro_briefings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES edro_clients(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  payload JSONB NOT NULL,
  created_by TEXT,
  traffic_owner TEXT,
  meeting_url TEXT,
  due_at TIMESTAMPTZ,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS edro_briefings_client_idx
  ON edro_briefings (client_id);
CREATE INDEX IF NOT EXISTS edro_briefings_status_idx
  ON edro_briefings (status);
CREATE INDEX IF NOT EXISTS edro_briefings_created_idx
  ON edro_briefings (created_at DESC);

CREATE TABLE IF NOT EXISTS edro_copy_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  briefing_id UUID NOT NULL REFERENCES edro_briefings(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'pt',
  model TEXT,
  prompt TEXT,
  output TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS edro_copy_versions_briefing_idx
  ON edro_copy_versions (briefing_id);

CREATE TABLE IF NOT EXISTS edro_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  briefing_id UUID REFERENCES edro_briefings(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to TEXT,
  channels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS edro_tasks_briefing_idx
  ON edro_tasks (briefing_id);
CREATE INDEX IF NOT EXISTS edro_tasks_status_idx
  ON edro_tasks (status);

CREATE TABLE IF NOT EXISTS edro_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  briefing_id UUID REFERENCES edro_briefings(id) ON DELETE SET NULL,
  task_id UUID REFERENCES edro_tasks(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payload JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS edro_notifications_briefing_idx
  ON edro_notifications (briefing_id);
CREATE INDEX IF NOT EXISTS edro_notifications_task_idx
  ON edro_notifications (task_id);
CREATE INDEX IF NOT EXISTS edro_notifications_status_idx
  ON edro_notifications (status);
