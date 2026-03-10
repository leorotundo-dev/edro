-- Thread context for WhatsApp group messages
ALTER TABLE whatsapp_group_messages ADD COLUMN IF NOT EXISTS reply_to_wa_id TEXT;
ALTER TABLE whatsapp_group_messages ADD COLUMN IF NOT EXISTS thread_id UUID;
