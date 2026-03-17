-- operational_signals stores app-level client ids like "cs-foo", not tenant UUIDs.
ALTER TABLE operational_signals
  ALTER COLUMN client_id TYPE TEXT
  USING client_id::text;
