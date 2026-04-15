-- Adds whatsapp_jid to tenant_users so internal team members (admins, managers)
-- can receive WhatsApp notifications from the Bedel worker without needing a
-- freelancer_profiles row or a person_identities entry.
ALTER TABLE tenant_users
  ADD COLUMN IF NOT EXISTS whatsapp_jid TEXT;
