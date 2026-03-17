-- Global tenant-scoped people directory shared across channels and modules

CREATE TABLE IF NOT EXISTS people (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  is_internal   BOOLEAN NOT NULL DEFAULT false,
  avatar_url    TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_people_tenant_name
  ON people (tenant_id, display_name);

CREATE TABLE IF NOT EXISTS person_identities (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        TEXT NOT NULL,
  person_id        UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  identity_type    TEXT NOT NULL CHECK (identity_type IN ('email', 'phone_e164', 'whatsapp_jid', 'edro_user_id')),
  identity_value   TEXT NOT NULL,
  normalized_value TEXT NOT NULL,
  is_primary       BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_person_identities_unique
  ON person_identities (tenant_id, identity_type, normalized_value);

CREATE INDEX IF NOT EXISTS idx_person_identities_person
  ON person_identities (person_id, identity_type, is_primary DESC);

ALTER TABLE client_contacts
  ADD COLUMN IF NOT EXISTS person_id UUID;

ALTER TABLE freelancer_profiles
  ADD COLUMN IF NOT EXISTS person_id UUID;

ALTER TABLE whatsapp_group_messages
  ADD COLUMN IF NOT EXISTS sender_person_id UUID;

ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS sender_person_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'client_contacts_person_id_fkey'
  ) THEN
    ALTER TABLE client_contacts
      ADD CONSTRAINT client_contacts_person_id_fkey
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'freelancer_profiles_person_id_fkey'
  ) THEN
    ALTER TABLE freelancer_profiles
      ADD CONSTRAINT freelancer_profiles_person_id_fkey
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'whatsapp_group_messages_sender_person_id_fkey'
  ) THEN
    ALTER TABLE whatsapp_group_messages
      ADD CONSTRAINT whatsapp_group_messages_sender_person_id_fkey
      FOREIGN KEY (sender_person_id) REFERENCES people(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'whatsapp_messages_sender_person_id_fkey'
  ) THEN
    ALTER TABLE whatsapp_messages
      ADD CONSTRAINT whatsapp_messages_sender_person_id_fkey
      FOREIGN KEY (sender_person_id) REFERENCES people(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_client_contacts_person
  ON client_contacts (person_id)
  WHERE person_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_freelancer_profiles_person
  ON freelancer_profiles (person_id)
  WHERE person_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_group_messages_sender_person
  ON whatsapp_group_messages (sender_person_id, created_at DESC)
  WHERE sender_person_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sender_person
  ON whatsapp_messages (sender_person_id, created_at DESC)
  WHERE sender_person_id IS NOT NULL;
