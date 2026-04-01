-- Migration 0321: Fix portal client_id — use clients.id (TEXT slug) instead of edro_clients.id (UUID)
-- Portal JWT carries clients.id (TEXT like "cs-infra-holding"), not edro_clients.id (UUID)

-- portal_contacts
ALTER TABLE portal_contacts
  DROP CONSTRAINT IF EXISTS portal_contacts_client_id_fkey;
ALTER TABLE portal_contacts
  ALTER COLUMN client_id TYPE TEXT USING client_id::text;
ALTER TABLE portal_contacts
  ADD CONSTRAINT portal_contacts_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- portal_briefing_requests
ALTER TABLE portal_briefing_requests
  DROP CONSTRAINT IF EXISTS portal_briefing_requests_client_id_fkey;
ALTER TABLE portal_briefing_requests
  ALTER COLUMN client_id TYPE TEXT USING client_id::text;
ALTER TABLE portal_briefing_requests
  ADD CONSTRAINT portal_briefing_requests_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
