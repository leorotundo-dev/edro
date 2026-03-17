-- Meeting participants linked to the global people directory.
CREATE TABLE IF NOT EXISTS meeting_participants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id        UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  tenant_id         TEXT NOT NULL,
  client_id         TEXT NOT NULL,
  dedupe_key        TEXT NOT NULL,
  person_id         UUID REFERENCES people(id) ON DELETE SET NULL,
  client_contact_id UUID REFERENCES client_contacts(id) ON DELETE SET NULL,
  edro_user_id      UUID REFERENCES edro_users(id) ON DELETE SET NULL,
  display_name      TEXT NOT NULL,
  email             TEXT,
  phone             TEXT,
  whatsapp_jid      TEXT,
  is_internal       BOOLEAN NOT NULL DEFAULT false,
  is_organizer      BOOLEAN NOT NULL DEFAULT false,
  is_attendee       BOOLEAN NOT NULL DEFAULT true,
  is_invited        BOOLEAN NOT NULL DEFAULT false,
  is_speaker        BOOLEAN NOT NULL DEFAULT false,
  response_status   TEXT,
  invited_via       TEXT,
  source_type       TEXT,
  source_ref_id     TEXT,
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT meeting_participants_meeting_dedupe_unique UNIQUE (meeting_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting
  ON meeting_participants(meeting_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_meeting_participants_person
  ON meeting_participants(tenant_id, person_id)
  WHERE person_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meeting_participants_client_contact
  ON meeting_participants(client_contact_id)
  WHERE client_contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meeting_participants_internal
  ON meeting_participants(meeting_id, is_internal, is_organizer);

ALTER TABLE calendar_auto_joins
  ADD COLUMN IF NOT EXISTS organizer_name TEXT;
