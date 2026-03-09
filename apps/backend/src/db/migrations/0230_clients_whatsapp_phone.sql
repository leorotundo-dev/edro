-- 0230_clients_whatsapp_phone.sql
-- Add whatsapp_phone to clients for inbound briefing-by-WhatsApp routing

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;

CREATE INDEX IF NOT EXISTS idx_clients_whatsapp_phone ON clients (whatsapp_phone)
  WHERE whatsapp_phone IS NOT NULL;

COMMENT ON COLUMN clients.whatsapp_phone IS
  'WhatsApp phone in E.164 format (e.g. +5511999887766) used to route inbound messages to this client';
