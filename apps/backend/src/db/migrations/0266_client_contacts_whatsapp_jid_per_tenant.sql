-- whatsapp_jid must be unique inside a tenant, not globally across the whole database.
DROP INDEX IF EXISTS idx_client_contacts_jid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_contacts_jid
  ON client_contacts(tenant_id, whatsapp_jid)
  WHERE whatsapp_jid IS NOT NULL;
