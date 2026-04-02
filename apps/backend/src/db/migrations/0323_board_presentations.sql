-- Migration 0323: Board presentations for monthly executive decks
-- Separate product from the existing monthly PDF report.

CREATE TABLE IF NOT EXISTS client_board_presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  period_month TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  template_version TEXT NOT NULL DEFAULT 'board-v1',
  source_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  manual_inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_draft JSONB NOT NULL DEFAULT '[]'::jsonb,
  edited_slides JSONB NOT NULL DEFAULT '[]'::jsonb,
  pptx_key TEXT,
  generated_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  exported_at TIMESTAMPTZ,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT client_board_presentations_status_check
    CHECK (status IN ('draft', 'review', 'approved', 'exported')),
  CONSTRAINT client_board_presentations_period_month_check
    CHECK (period_month ~ '^[0-9]{4}-[0-9]{2}$'),
  CONSTRAINT client_board_presentations_unique
    UNIQUE (client_id, period_month, template_version)
);

CREATE INDEX IF NOT EXISTS idx_client_board_presentations_client_period
  ON client_board_presentations (client_id, period_month DESC);

CREATE INDEX IF NOT EXISTS idx_client_board_presentations_tenant_status
  ON client_board_presentations (tenant_id, status);
