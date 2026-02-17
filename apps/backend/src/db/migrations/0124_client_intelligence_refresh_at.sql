-- Track when each client's intelligence was last refreshed
ALTER TABLE clients ADD COLUMN IF NOT EXISTS intelligence_refreshed_at TIMESTAMPTZ;
