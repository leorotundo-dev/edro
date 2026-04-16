-- 0345_jarvis_delayed_outcomes.sql
-- Delayed reward e memoria episodica do Jarvis.

CREATE TABLE IF NOT EXISTS jarvis_outcome_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  trace_id UUID NULL REFERENCES jarvis_decision_traces(id) ON DELETE SET NULL,
  outcome_id UUID NULL REFERENCES jarvis_outcome_memory(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  reward_score NUMERIC(6,3) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'observed',
  source_type TEXT NOT NULL,
  source_id TEXT NULL,
  source_key TEXT NOT NULL DEFAULT '',
  summary TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, client_id, outcome_id, event_type, source_key)
);

CREATE INDEX IF NOT EXISTS idx_jarvis_outcome_events_lookup
  ON jarvis_outcome_events (tenant_id, client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jarvis_outcome_events_trace
  ON jarvis_outcome_events (trace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS jarvis_episode_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  trace_id UUID NULL REFERENCES jarvis_decision_traces(id) ON DELETE SET NULL,
  conversation_id UUID NULL,
  episode_key TEXT NOT NULL,
  episode_kind TEXT NOT NULL,
  task_type TEXT NULL,
  actor_profile TEXT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  source_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, client_id, episode_key)
);

CREATE INDEX IF NOT EXISTS idx_jarvis_episode_memory_lookup
  ON jarvis_episode_memory (tenant_id, client_id, created_at DESC);

