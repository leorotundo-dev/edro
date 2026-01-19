-- 0026_notifications_log.sql
-- Notification log + rate limiting support

CREATE TABLE IF NOT EXISTS notifications_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL DEFAULT 'manual',
  channel VARCHAR(20) NOT NULL DEFAULT 'push',
  title TEXT,
  body TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_log_user ON notifications_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_log_status ON notifications_log(status);
