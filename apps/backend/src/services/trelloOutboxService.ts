/**
 * trelloOutboxService.ts
 *
 * Enqueue and flush Trello outbound operations.
 *
 * Operations:
 *   card.create        — { localCardId, trelloListId, name, desc?, due?, pos? }
 *   card.update        — { trelloCardId, fields: { name?, desc?, due?, dueComplete? } }
 *   member.sync        — { trelloCardId, toRemove: string[], toAdd: string[] }
 *   comment.add        — { trelloCardId, text }
 *   checklist.toggle   — { trelloCardId, checkItemId, state: 'complete'|'incomplete' }
 *   checklist.create   — { trelloCardId, name, items: string[], localChecklistId }
 *   attachment.add     — { trelloCardId, url, name }
 *
 * Dedupe: pass a dedupeKey to upsert the payload instead of inserting a
 * second row (e.g. rapid title edits coalesce into one outbound call).
 */

import { query } from '../db';

export type OutboxOperation =
  | 'card.create'
  | 'card.update'
  | 'member.sync'
  | 'comment.add'
  | 'checklist.toggle'
  | 'checklist.create'
  | 'attachment.add';

export async function enqueueOutbox(
  tenantId: string,
  operation: OutboxOperation,
  payload: Record<string, unknown>,
  dedupeKey?: string,
): Promise<void> {
  if (dedupeKey) {
    // Upsert: if a pending/error row with this key exists, update its payload
    await query(
      `INSERT INTO trello_outbox (tenant_id, operation, payload, dedupe_key)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (dedupe_key) DO UPDATE
         SET payload = EXCLUDED.payload,
             status = CASE WHEN trello_outbox.status = 'dead' THEN 'pending' ELSE trello_outbox.status END,
             next_retry_at = CASE WHEN trello_outbox.status IN ('error','pending') THEN now() ELSE trello_outbox.next_retry_at END,
             updated_at = now()`,
      [tenantId, operation, JSON.stringify(payload), dedupeKey],
    );
  } else {
    await query(
      `INSERT INTO trello_outbox (tenant_id, operation, payload) VALUES ($1, $2, $3)`,
      [tenantId, operation, JSON.stringify(payload)],
    );
  }
}

export async function reviveDeadOutboxItems(tenantId: string, limit = 50) {
  const { rows } = await query<{ id: string }>(
    `UPDATE trello_outbox
        SET status = 'pending',
            attempts = 0,
            next_retry_at = now(),
            updated_at = now()
      WHERE id IN (
        SELECT id
          FROM trello_outbox
         WHERE tenant_id = $1
           AND status = 'dead'
         ORDER BY updated_at ASC
         LIMIT $2
         FOR UPDATE SKIP LOCKED
      )
      RETURNING id`,
    [tenantId, Math.max(1, Math.min(limit, 200))],
  );

  return {
    revived: rows.length,
  };
}

export async function recoverStaleOutboxItems(tenantId: string, limit = 50, staleMinutes = 15) {
  const safeLimit = Math.max(1, Math.min(limit, 200));
  const safeMinutes = Math.max(5, Math.min(staleMinutes, 240));

  const { rows } = await query<{ id: string }>(
    `UPDATE trello_outbox
        SET status = 'error',
            next_retry_at = now(),
            last_error = COALESCE(NULLIF(last_error, ''), 'trello_outbox_processing_stale'),
            updated_at = now()
      WHERE id IN (
        SELECT id
          FROM trello_outbox
         WHERE tenant_id = $1
           AND status = 'processing'
           AND updated_at < now() - make_interval(mins => $3::int)
         ORDER BY updated_at ASC
         LIMIT $2
         FOR UPDATE SKIP LOCKED
      )
      RETURNING id`,
    [tenantId, safeLimit, safeMinutes],
  );

  return {
    recovered: rows.length,
  };
}
