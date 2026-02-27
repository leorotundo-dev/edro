-- Add intelligence_refreshed_at column referenced in 0159 index but missing from ALTER TABLE
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS intelligence_refreshed_at TIMESTAMPTZ;
