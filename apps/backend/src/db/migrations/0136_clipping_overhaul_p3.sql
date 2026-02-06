-- Phase 3: Feedback system for clipping quality improvement

CREATE TABLE IF NOT EXISTS clipping_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  clipping_item_id UUID NOT NULL REFERENCES clipping_items(id),
  client_id TEXT,
  user_id UUID,
  feedback TEXT NOT NULL CHECK (feedback IN ('relevant','irrelevant','wrong_client')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, clipping_item_id, client_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_clipping_feedback_tenant
  ON clipping_feedback(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clipping_feedback_item
  ON clipping_feedback(clipping_item_id);
