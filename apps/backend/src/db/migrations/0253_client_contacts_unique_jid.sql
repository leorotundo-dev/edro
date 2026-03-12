-- Make whatsapp_jid unique per tenant so we can upsert contacts from group messages
DROP INDEX IF EXISTS idx_client_contacts_jid;
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_contacts_jid
  ON client_contacts(whatsapp_jid)
  WHERE whatsapp_jid IS NOT NULL;
