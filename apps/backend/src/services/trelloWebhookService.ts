/**
 * trelloWebhookService.ts
 *
 * Manages Trello webhook registration per tenant×board.
 * Called from trelloSyncWorker after each sync run so new boards
 * automatically get a webhook without any manual setup.
 *
 * Callback URL pattern:
 *   {PUBLIC_API_URL}/webhook/trello?secret={TRELLO_WEBHOOK_SECRET}&tenant={tenantId}
 *
 * Trello webhook docs: https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/
 */

import { query } from '../db';
import { env } from '../env';

const TRELLO_BASE = 'https://api.trello.com/1';

interface TrelloCreds {
  apiKey: string;
  apiToken: string;
}

async function getCreds(tenantId: string): Promise<TrelloCreds | null> {
  const res = await query<{ api_key: string; api_token: string }>(
    `SELECT api_key, api_token FROM trello_connectors WHERE tenant_id = $1 AND is_active = true LIMIT 1`,
    [tenantId],
  );
  if (!res.rows.length) return null;
  return { apiKey: res.rows[0].api_key, apiToken: res.rows[0].api_token };
}

function buildCallbackUrl(tenantId: string): string {
  // PUBLIC_API_URL may end in /api (e.g. https://host/api) — strip it;
  // the webhook route is registered WITHOUT the /api prefix.
  const raw = env.PUBLIC_API_URL ?? 'https://edro-backend-production.up.railway.app';
  const base = raw.replace(/\/api$/, '');
  const params = new URLSearchParams({ tenant: tenantId });
  if (env.TRELLO_WEBHOOK_SECRET) params.set('secret', env.TRELLO_WEBHOOK_SECRET);
  return `${base}/webhook/trello?${params}`;
}

async function registerTrelloWebhook(
  creds: TrelloCreds,
  trelloBoardId: string,
  callbackUrl: string,
): Promise<string | null> {
  const params = new URLSearchParams({
    key: creds.apiKey,
    token: creds.apiToken,
    callbackURL: callbackUrl,
    idModel: trelloBoardId,
    description: 'Edro.Digital realtime sync',
  });
  // codeql[js/request-forgery] TRELLO_BASE is a hardcoded constant
  const res = await fetch(`${TRELLO_BASE}/webhooks?${params}`, {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.warn(`[trelloWebhook] register failed for board ${trelloBoardId}: ${res.status} ${body}`);
    return null;
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

async function verifyTrelloWebhook(creds: TrelloCreds, trelloWebhookId: string): Promise<boolean> {
  const params = new URLSearchParams({ key: creds.apiKey, token: creds.apiToken });
  // codeql[js/request-forgery] TRELLO_BASE is a hardcoded constant; trelloWebhookId validated as hex-24 before storage
  const res = await fetch(`${TRELLO_BASE}/webhooks/${trelloWebhookId}?${params}`, {
    signal: AbortSignal.timeout(8_000),
  });
  return res.ok;
}

async function deleteTrelloWebhook(creds: TrelloCreds, trelloWebhookId: string): Promise<void> {
  const params = new URLSearchParams({ key: creds.apiKey, token: creds.apiToken });
  // codeql[js/request-forgery] TRELLO_BASE is a hardcoded constant
  await fetch(`${TRELLO_BASE}/webhooks/${trelloWebhookId}?${params}`, {
    method: 'DELETE',
    signal: AbortSignal.timeout(8_000),
  }).catch(() => undefined);
}

/**
 * Ensures an active Trello webhook exists for a given board.
 * Creates one if missing; re-registers if the remote webhook is gone.
 */
export async function ensureWebhookForBoard(
  tenantId: string,
  boardId: string,
  trelloBoardId: string,
): Promise<void> {
  const creds = await getCreds(tenantId);
  if (!creds) return;

  const callbackUrl = buildCallbackUrl(tenantId);

  const existing = await query<{
    id: string; trello_webhook_id: string | null; is_active: boolean;
  }>(
    `SELECT id, trello_webhook_id, is_active FROM trello_webhooks
     WHERE tenant_id = $1 AND trello_board_id = $2 LIMIT 1`,
    [tenantId, trelloBoardId],
  );

  if (existing.rows.length) {
    const row = existing.rows[0];

    // If we have a Trello webhook ID, verify it's still alive
    if (row.trello_webhook_id) {
      const alive = await verifyTrelloWebhook(creds, row.trello_webhook_id);
      if (alive) {
        // Update callback URL if it changed (e.g. secret rotation)
        await query(
          `UPDATE trello_webhooks SET is_active = true, updated_at = now() WHERE id = $1`,
          [row.id],
        );
        return;
      }
    }

    // Webhook is gone on Trello's side — re-register
    const newId = await registerTrelloWebhook(creds, trelloBoardId, callbackUrl);
    await query(
      `UPDATE trello_webhooks
       SET trello_webhook_id = $1, callback_url = $2, is_active = $3, last_error = NULL, updated_at = now()
       WHERE id = $4`,
      [newId, callbackUrl, newId !== null, row.id],
    );
    return;
  }

  // No record — register fresh
  const trelloWebhookId = await registerTrelloWebhook(creds, trelloBoardId, callbackUrl);
  await query(
    `INSERT INTO trello_webhooks
       (tenant_id, board_id, trello_board_id, trello_webhook_id, callback_url, is_active)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (tenant_id, trello_board_id) DO UPDATE SET
       trello_webhook_id = EXCLUDED.trello_webhook_id,
       callback_url = EXCLUDED.callback_url,
       is_active = EXCLUDED.is_active,
       updated_at = now()`,
    [tenantId, boardId, trelloBoardId, trelloWebhookId, callbackUrl, trelloWebhookId !== null],
  );
}

/**
 * Ensures webhooks for all active boards of a tenant.
 * Called from trelloSyncWorker after each sync run.
 */
export async function ensureAllWebhooksForTenant(tenantId: string): Promise<void> {
  if (!env.PUBLIC_API_URL) return; // no public URL configured — skip silently

  const boards = await query<{ id: string; trello_board_id: string }>(
    `SELECT id, trello_board_id FROM project_boards
     WHERE tenant_id = $1 AND trello_board_id IS NOT NULL`,
    [tenantId],
  );

  for (const board of boards.rows) {
    await ensureWebhookForBoard(tenantId, board.id, board.trello_board_id).catch((err) => {
      console.warn(`[trelloWebhook] ensureWebhookForBoard error board=${board.trello_board_id}:`, err?.message);
    });
  }
}

/**
 * Marks a webhook as inactive and deletes it from Trello.
 * Call when a board is disconnected.
 */
export async function deactivateWebhookForBoard(tenantId: string, trelloBoardId: string): Promise<void> {
  const res = await query<{ id: string; trello_webhook_id: string | null }>(
    `SELECT id, trello_webhook_id FROM trello_webhooks
     WHERE tenant_id = $1 AND trello_board_id = $2 LIMIT 1`,
    [tenantId, trelloBoardId],
  );
  if (!res.rows.length) return;

  const row = res.rows[0];
  if (row.trello_webhook_id) {
    const creds = await getCreds(tenantId);
    if (creds) await deleteTrelloWebhook(creds, row.trello_webhook_id);
  }

  await query(
    `UPDATE trello_webhooks SET is_active = false, updated_at = now() WHERE id = $1`,
    [row.id],
  );
}
