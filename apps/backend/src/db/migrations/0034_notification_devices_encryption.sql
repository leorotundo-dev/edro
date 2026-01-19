-- 0034_notification_devices_encryption.sql
-- Store encrypted device tokens + hash for lookups

ALTER TABLE notification_devices
  ADD COLUMN IF NOT EXISTS token_hash TEXT,
  ADD COLUMN IF NOT EXISTS token_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS token_last4 VARCHAR(8);

CREATE INDEX IF NOT EXISTS idx_notification_devices_token_hash
  ON notification_devices(token_hash);
