CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  scope TEXT NOT NULL CHECK (scope IN ('global', 'team', 'studio', 'client', 'job', 'briefing', 'meeting', 'direct')),
  context_type TEXT,
  context_id TEXT,
  client_id TEXT,
  edro_client_id UUID,
  created_by UUID REFERENCES edro_users(id) ON DELETE SET NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rooms_tenant_scope_idx ON rooms (tenant_id, scope, updated_at DESC);
CREATE INDEX IF NOT EXISTS rooms_tenant_context_idx ON rooms (tenant_id, context_type, context_id);
CREATE UNIQUE INDEX IF NOT EXISTS rooms_context_unique_idx
  ON rooms (tenant_id, scope, context_type, context_id)
  WHERE context_type IS NOT NULL AND context_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES edro_users(id) ON DELETE CASCADE,
  membership_role TEXT NOT NULL DEFAULT 'member' CHECK (membership_role IN ('owner', 'member', 'viewer')),
  notification_level TEXT NOT NULL DEFAULT 'all' CHECK (notification_level IN ('all', 'mentions', 'mute')),
  pinned_at TIMESTAMPTZ,
  last_read_message_id UUID,
  last_read_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS room_members_tenant_user_idx ON room_members (tenant_id, user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES edro_users(id) ON DELETE SET NULL,
  author_kind TEXT NOT NULL DEFAULT 'user' CHECK (author_kind IN ('user', 'jarvis', 'system')),
  message_type TEXT NOT NULL DEFAULT 'message' CHECK (message_type IN ('message', 'system', 'artifact', 'summary', 'decision', 'task', 'alert')),
  body TEXT NOT NULL,
  body_format TEXT NOT NULL DEFAULT 'plain' CHECK (body_format IN ('plain', 'markdown')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  client_id TEXT,
  edro_client_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS room_messages_room_created_idx ON room_messages (room_id, created_at ASC);
CREATE INDEX IF NOT EXISTS room_messages_tenant_room_idx ON room_messages (tenant_id, room_id, created_at DESC);

CREATE TABLE IF NOT EXISTS room_presence (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES edro_users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'idle', 'away')),
  pathname TEXT,
  page_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS room_presence_tenant_room_idx ON room_presence (tenant_id, room_id, updated_at DESC);
