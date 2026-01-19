-- 0034_notifications_inapp_read.sql
-- Read state for in-app notifications

ALTER TABLE notifications_log
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notifications_log_user_unread
  ON notifications_log(user_id, read_at)
  WHERE read_at IS NULL;
