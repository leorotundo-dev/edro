-- Add contact fields to freelancer_profiles for phone, WhatsApp, department, notes
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS whatsapp_jid TEXT;
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS role_title TEXT;
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS email_personal TEXT;
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_freelancer_profiles_whatsapp ON freelancer_profiles(whatsapp_jid) WHERE whatsapp_jid IS NOT NULL;
