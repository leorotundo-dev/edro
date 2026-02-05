-- Planning conversations table
-- Stores AI chat conversations for client planning

CREATE TABLE IF NOT EXISTS planning_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES edro_clients(id) ON DELETE CASCADE,
  user_id TEXT,
  title TEXT,
  provider TEXT DEFAULT 'openai' CHECK (provider IN ('openai', 'anthropic', 'google')),
  messages JSONB DEFAULT '[]'::jsonb,
  context_summary TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_planning_conversations_tenant ON planning_conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_planning_conversations_client ON planning_conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_planning_conversations_user ON planning_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_planning_conversations_created ON planning_conversations(created_at DESC);

-- AI opportunities table
-- Stores AI-generated insights and opportunities based on clipping, trends, etc.
CREATE TABLE IF NOT EXISTS ai_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES edro_clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  source TEXT CHECK (source IN ('clipping', 'trend', 'calendar', 'social', 'manual')),
  source_ids TEXT[],
  confidence NUMERIC(5,2),
  suggested_action TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'actioned', 'dismissed')),
  actioned_at TIMESTAMPTZ,
  actioned_by TEXT,
  expires_at TIMESTAMPTZ,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for ai_opportunities
CREATE INDEX IF NOT EXISTS idx_ai_opportunities_tenant ON ai_opportunities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_opportunities_client ON ai_opportunities(client_id);
CREATE INDEX IF NOT EXISTS idx_ai_opportunities_status ON ai_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_ai_opportunities_created ON ai_opportunities(created_at DESC);
