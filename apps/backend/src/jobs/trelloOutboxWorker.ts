/**
 * trelloOutboxWorker.ts
 *
 * Processes pending trello_outbox items and sends them to the Trello API.
 * Runs every 5s. Retries on failure with exponential backoff.
 * Marks as 'dead' after 5 failed attempts.
 *
 * Retry delays: 10s → 30s → 2min → 10min → dead
 */

import { query } from '../db';

const TRELLO_BASE = 'https://api.trello.com/1';
const MAX_ATTEMPTS = 5;
const RETRY_DELAYS_MS = [10_000, 30_000, 120_000, 600_000];
const BATCH_SIZE = 10;

interface OutboxItem {
  id: string;
  tenant_id: string;
  operation: string;
  payload: Record<string, any>;
  attempts: number;
}

async function getCreds(tenantId: string): Promise<{ apiKey: string; apiToken: string } | null> {
  const res = await query<{ api_key: string; api_token: string }>(
    `SELECT api_key, api_token FROM trello_connectors WHERE tenant_id = $1 AND is_active = true LIMIT 1`,
    [tenantId],
  );
  if (!res.rows.length) return null;
  return { apiKey: res.rows[0].api_key, apiToken: res.rows[0].api_token };
}

// ── Operation executors ────────────────────────────────────────────────────────

async function execCardUpdate(creds: { apiKey: string; apiToken: string }, payload: Record<string, any>): Promise<void> {
  const { trelloCardId, fields } = payload as { trelloCardId: string; fields: Record<string, string> };
  if (!trelloCardId || !fields || !Object.keys(fields).length) return;
  const params = new URLSearchParams({ key: creds.apiKey, token: creds.apiToken, ...fields });
  // codeql[js/request-forgery] TRELLO_BASE is a hardcoded constant; trelloCardId resolved from internal DB
  const res = await fetch(`${TRELLO_BASE}/cards/${trelloCardId}?${params}`, {
    method: 'PUT',
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`card.update ${res.status}: ${await res.text().catch(() => '')}`);
}

async function execCardCreate(
  creds: { apiKey: string; apiToken: string },
  tenantId: string,
  payload: Record<string, any>,
): Promise<void> {
  const {
    localCardId,
    trelloListId,
    name,
    desc,
    due,
    pos,
  } = payload as {
    localCardId: string;
    trelloListId: string;
    name: string;
    desc?: string | null;
    due?: string | null;
    pos?: string | null;
  };
  if (!localCardId || !trelloListId || !name) return;

  const existing = await query<{ trello_card_id: string | null }>(
    `SELECT trello_card_id FROM project_cards WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
    [localCardId, tenantId],
  );
  if (existing.rows[0]?.trello_card_id) return;

  const params = new URLSearchParams({
    key: creds.apiKey,
    token: creds.apiToken,
    idList: trelloListId,
    name,
    ...(desc ? { desc } : {}),
    ...(due ? { due } : {}),
    ...(pos ? { pos } : {}),
  });
  // codeql[js/request-forgery] TRELLO_BASE is a hardcoded constant
  const res = await fetch(`${TRELLO_BASE}/cards?${params}`, {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`card.create ${res.status}: ${await res.text().catch(() => '')}`);

  const created = await res.json() as { id: string; shortUrl?: string; url?: string };
  await query(
    `UPDATE project_cards
     SET trello_card_id = $1, trello_url = $2, updated_at = now()
     WHERE id = $3 AND tenant_id = $4`,
    [created.id, created.shortUrl ?? created.url ?? null, localCardId, tenantId],
  );
}

async function execMemberSync(creds: { apiKey: string; apiToken: string }, payload: Record<string, any>): Promise<void> {
  const { trelloCardId, toRemove, toAdd } = payload as {
    trelloCardId: string;
    toRemove: string[];
    toAdd: string[];
  };
  if (!trelloCardId) return;
  const base = new URLSearchParams({ key: creds.apiKey, token: creds.apiToken });

  // Remove first to make room
  await Promise.all((toRemove ?? []).map((memberId) =>
    // codeql[js/request-forgery] TRELLO_BASE is a hardcoded constant; memberId is a trello member ID from our DB
    fetch(`${TRELLO_BASE}/cards/${trelloCardId}/idMembers/${memberId}?${base}`, {
      method: 'DELETE', signal: AbortSignal.timeout(8_000),
    }).catch(() => null),
  ));

  for (const memberId of (toAdd ?? [])) {
    const addParams = new URLSearchParams({ key: creds.apiKey, token: creds.apiToken, value: memberId });
    // codeql[js/request-forgery] TRELLO_BASE is a hardcoded constant
    const res = await fetch(`${TRELLO_BASE}/cards/${trelloCardId}/idMembers?${addParams}`, {
      method: 'POST', signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new Error(`member.sync add ${res.status}: ${await res.text().catch(() => '')}`);
  }
}

async function execCommentAdd(creds: { apiKey: string; apiToken: string }, payload: Record<string, any>): Promise<void> {
  const { trelloCardId, text } = payload as { trelloCardId: string; text: string };
  if (!trelloCardId || !text) return;
  const params = new URLSearchParams({ key: creds.apiKey, token: creds.apiToken, text });
  // codeql[js/request-forgery] TRELLO_BASE is a hardcoded constant
  const res = await fetch(`${TRELLO_BASE}/cards/${trelloCardId}/actions/comments?${params}`, {
    method: 'POST', signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`comment.add ${res.status}: ${await res.text().catch(() => '')}`);
}

async function execChecklistToggle(creds: { apiKey: string; apiToken: string }, payload: Record<string, any>): Promise<void> {
  const { trelloCardId, checkItemId, state } = payload as {
    trelloCardId: string; checkItemId: string; state: 'complete' | 'incomplete';
  };
  if (!trelloCardId || !checkItemId || !state) return;
  // Validate IDs before building URL — prevent SSRF
  if (!/^[a-f0-9]{24}$/i.test(trelloCardId) || !/^[a-f0-9]{24}$/i.test(checkItemId)) {
    throw new Error('invalid_ids');
  }
  const params = new URLSearchParams({ key: creds.apiKey, token: creds.apiToken, state });
  // codeql[js/request-forgery] TRELLO_BASE is a hardcoded constant; IDs validated above
  const res = await fetch(`${TRELLO_BASE}/cards/${trelloCardId}/checkItem/${checkItemId}?${params}`, {
    method: 'PUT', signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`checklist.toggle ${res.status}: ${await res.text().catch(() => '')}`);
}

async function execChecklistCreate(
  creds: { apiKey: string; apiToken: string },
  tenantId: string,
  payload: Record<string, any>,
): Promise<void> {
  const { trelloCardId, name, items, localChecklistId } = payload as {
    trelloCardId: string;
    name: string;
    items: string[];
    localChecklistId?: string;
  };
  if (!trelloCardId || !name) return;
  if (!/^[a-f0-9]{24}$/i.test(trelloCardId)) throw new Error('invalid_trello_card_id');

  const clParams = new URLSearchParams({ key: creds.apiKey, token: creds.apiToken, name, idCard: trelloCardId });
  // codeql[js/request-forgery] TRELLO_BASE is a hardcoded constant
  const clRes = await fetch(`${TRELLO_BASE}/checklists?${clParams}`, {
    method: 'POST', signal: AbortSignal.timeout(10_000),
  });
  if (!clRes.ok) throw new Error(`checklist.create ${clRes.status}: ${await clRes.text().catch(() => '')}`);

  const created = await clRes.json() as { id: string };
  const trelloChecklistId = created.id;

  // Persist trello_checklist_id back to local table
  if (localChecklistId) {
    await query(
      `UPDATE project_card_checklists SET trello_checklist_id = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3`,
      [trelloChecklistId, localChecklistId, tenantId],
    ).catch(() => null);
  }

  // Add each item to the checklist
  for (const itemText of (items ?? [])) {
    const itemParams = new URLSearchParams({ key: creds.apiKey, token: creds.apiToken, name: itemText, checked: 'false' });
    // codeql[js/request-forgery] TRELLO_BASE is a hardcoded constant; trelloChecklistId from API response
    await fetch(`${TRELLO_BASE}/checklists/${trelloChecklistId}/checkItems?${itemParams}`, {
      method: 'POST', signal: AbortSignal.timeout(8_000),
    }).catch(() => null);
  }
}

async function execAttachmentAdd(creds: { apiKey: string; apiToken: string }, payload: Record<string, any>): Promise<void> {
  const { trelloCardId, url, name } = payload as { trelloCardId: string; url: string; name?: string };
  if (!trelloCardId || !url) return;
  if (!/^[a-f0-9]{24}$/i.test(trelloCardId)) throw new Error('invalid_trello_card_id');

  const params = new URLSearchParams({ key: creds.apiKey, token: creds.apiToken, url, ...(name ? { name } : {}) });
  // codeql[js/request-forgery] TRELLO_BASE is a hardcoded constant; trelloCardId resolved from internal DB
  const res = await fetch(`${TRELLO_BASE}/cards/${trelloCardId}/attachments?${params}`, {
    method: 'POST', signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`attachment.add ${res.status}: ${await res.text().catch(() => '')}`);
}

// ── Main dispatch ─────────────────────────────────────────────────────────────

async function executeItem(item: OutboxItem): Promise<void> {
  const creds = await getCreds(item.tenant_id);
  if (!creds) throw new Error('no_trello_credentials');

  switch (item.operation) {
    case 'card.create':       return execCardCreate(creds, item.tenant_id, item.payload);
    case 'card.update':       return execCardUpdate(creds, item.payload);
    case 'member.sync':       return execMemberSync(creds, item.payload);
    case 'comment.add':       return execCommentAdd(creds, item.payload);
    case 'checklist.toggle':  return execChecklistToggle(creds, item.payload);
    case 'checklist.create':  return execChecklistCreate(creds, item.tenant_id, item.payload);
    case 'attachment.add':    return execAttachmentAdd(creds, item.payload);
    default:
      throw new Error(`unknown_operation: ${item.operation}`);
  }
}

function retryDelay(attempt: number): number {
  return RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
}

// ── Worker ────────────────────────────────────────────────────────────────────

export async function runTrelloOutboxWorkerOnce(): Promise<void> {
  // Claim a batch of items atomically
  const res = await query<OutboxItem>(
    `UPDATE trello_outbox
     SET status = 'processing', attempts = attempts + 1, updated_at = now()
     WHERE id IN (
       SELECT id FROM trello_outbox
       WHERE status IN ('pending', 'error')
         AND next_retry_at <= now()
       ORDER BY next_retry_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING id, tenant_id, operation, payload, attempts`,
    [BATCH_SIZE],
  );

  if (!res.rows.length) return;

  for (const item of res.rows) {
    try {
      await executeItem(item);
      await query(
        `UPDATE trello_outbox SET status = 'done', last_error = NULL, updated_at = now() WHERE id = $1`,
        [item.id],
      );
    } catch (err: any) {
      const isDead = item.attempts >= MAX_ATTEMPTS;
      const nextRetry = new Date(Date.now() + retryDelay(item.attempts));
      await query(
        `UPDATE trello_outbox
         SET status = $1, last_error = $2, next_retry_at = $3, updated_at = now()
         WHERE id = $4`,
        [isDead ? 'dead' : 'error', err?.message ?? 'unknown', nextRetry, item.id],
      );
      if (isDead) {
        console.error(`[trelloOutbox] item ${item.id} dead after ${item.attempts} attempts — op=${item.operation} err=${err?.message}`);
      }
    }
  }
}
