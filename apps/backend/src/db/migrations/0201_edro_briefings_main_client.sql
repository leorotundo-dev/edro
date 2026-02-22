-- Migration: Link edro_briefings directly to clients table
-- This fixes the data architecture: clients is the single source of truth.
-- edro_clients still exists for backward compatibility but main_client_id
-- is the canonical FK that should be used for all profile data lookups.

-- 1. Add main_client_id column (TEXT, matches clients.id format)
ALTER TABLE edro_briefings
  ADD COLUMN IF NOT EXISTS main_client_id TEXT REFERENCES clients(id) ON DELETE SET NULL;

-- 2. Index for fast lookups by client
CREATE INDEX IF NOT EXISTS edro_briefings_main_client_idx
  ON edro_briefings (main_client_id);

-- 3. Auto-populate main_client_id for existing briefings where:
--    the payload.client_ref.id is a valid clients.id (non-UUID TEXT)
UPDATE edro_briefings b
SET main_client_id = (payload->'client_ref'->>'id')
WHERE main_client_id IS NULL
  AND payload->'client_ref'->>'id' IS NOT NULL
  AND payload->'client_ref'->>'id' NOT SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  AND EXISTS (
    SELECT 1 FROM clients c WHERE c.id = payload->'client_ref'->>'id'
  );

-- 4. Auto-populate main_client_id for existing briefings via name match
UPDATE edro_briefings b
SET main_client_id = (
  SELECT c.id FROM clients c
  WHERE LOWER(c.name) = LOWER(ec.name)
  LIMIT 1
)
FROM edro_clients ec
WHERE ec.id = b.client_id
  AND b.main_client_id IS NULL
  AND EXISTS (
    SELECT 1 FROM clients c WHERE LOWER(c.name) = LOWER(ec.name)
  );
