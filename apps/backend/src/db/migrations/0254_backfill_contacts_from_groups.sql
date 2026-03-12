-- Backfill client_contacts from existing whatsapp_group_messages senders
INSERT INTO client_contacts (tenant_id, client_id, name, whatsapp_jid, phone)
SELECT DISTINCT ON (wgm.sender_jid)
  wgm.tenant_id,
  wg.client_id,
  wgm.sender_name,
  wgm.sender_jid,
  '+' || split_part(wgm.sender_jid, '@', 1)
FROM whatsapp_group_messages wgm
JOIN whatsapp_groups wg ON wg.id = wgm.group_id
WHERE wg.client_id IS NOT NULL
  AND wgm.sender_jid IS NOT NULL
  AND wgm.sender_jid != ''
ORDER BY wgm.sender_jid, wgm.created_at DESC
ON CONFLICT DO NOTHING;
