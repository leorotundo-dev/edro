-- Client contacts: people associated with each client
CREATE TABLE IF NOT EXISTS client_contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL,
  client_id     TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  role          TEXT,              -- cargo: Diretor de Marketing, CEO, etc.
  department    TEXT,              -- departamento: Marketing, Comercial, etc.
  email         TEXT,
  phone         TEXT,              -- E.164 format
  whatsapp_jid  TEXT,              -- sender_jid from WhatsApp (e.g. 5511999@s.whatsapp.net)
  is_primary    BOOLEAN DEFAULT false,
  notes         TEXT,
  avatar_url    TEXT,
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_contacts_client ON client_contacts(client_id, active);
CREATE INDEX IF NOT EXISTS idx_client_contacts_tenant ON client_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_jid ON client_contacts(whatsapp_jid) WHERE whatsapp_jid IS NOT NULL;
