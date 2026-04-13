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
  | 'checklist.toggle';

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
