/**
 * Trello Sync Worker — Fase 4: reconciliação seletiva.
 *
 * Com webhooks ativos, boards que receberam evento recente são pulados.
 * Apenas boards "dark" (sem webhook há >2h) fazem sync completo.
 *
 * Intervalo do worker: 2h (reduzido de 30min — webhooks cobrem o tempo real).
 * Boards sem webhook configurado continuam com sync completo como fallback.
 */

import { query } from '../db';
import { syncTrelloBoard } from '../services/trelloSyncService';
import { analyzeAllBoardsForTenant } from '../services/trelloHistoryAnalyzer';
import { ensureAllWebhooksForTenant } from '../services/trelloWebhookService';

let lastRunAt = 0;
const MIN_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2h (era 30min)
const WEBHOOK_LIVE_WINDOW_MS = 2 * 60 * 60 * 1000; // board com evento < 2h → skip reconciliation

export async function triggerTrelloSyncNow(): Promise<void> {
  lastRunAt = 0;
  return runTrelloSyncWorkerOnce();
}

export async function runTrelloSyncWorkerOnce(): Promise<void> {
  const now = Date.now();
  if (now - lastRunAt < MIN_INTERVAL_MS) return;
  lastRunAt = now;

  const tenantsRes = await query<{ tenant_id: string }>(
    `SELECT DISTINCT tc.tenant_id
     FROM trello_connectors tc
     JOIN project_boards pb ON pb.tenant_id = tc.tenant_id
       AND pb.trello_board_id IS NOT NULL
       AND pb.is_archived = false
     WHERE tc.is_active = true`,
    [],
  );

  if (!tenantsRes.rows.length) return;

  for (const { tenant_id } of tenantsRes.rows) {
    try {
      // Find boards that need reconciliation: no active webhook OR webhook silent > 2h
      const boardsRes = await query<{
        id: string; trello_board_id: string; client_id: string | null; name: string;
        webhook_last_seen: string | null; webhook_active: boolean | null;
      }>(
        `SELECT pb.id, pb.trello_board_id, pb.client_id, pb.name,
                tw.last_seen_at AS webhook_last_seen,
                tw.is_active    AS webhook_active
         FROM project_boards pb
         LEFT JOIN trello_webhooks tw
           ON tw.tenant_id = pb.tenant_id AND tw.trello_board_id = pb.trello_board_id
         WHERE pb.tenant_id = $1
           AND pb.trello_board_id IS NOT NULL
           AND pb.is_archived = false`,
        [tenant_id],
      );

      let synced = 0;
      let skipped = 0;

      for (const board of boardsRes.rows) {
        const lastSeen = board.webhook_last_seen ? new Date(board.webhook_last_seen).getTime() : 0;
        const webhookLive = board.webhook_active && lastSeen > now - WEBHOOK_LIVE_WINDOW_MS;

        if (webhookLive) {
          // Board is receiving realtime events — skip full sync, just ensure webhook exists
          skipped++;
          continue;
        }

        // Board is dark (no webhook or stale) — do full reconciliation sync
        await syncTrelloBoard(tenant_id, board.trello_board_id, board.client_id ?? undefined).catch((err) => {
          console.error(`[trelloSync] Board ${board.name} failed:`, err?.message);
        });
        synced++;
      }

      if (synced > 0 || skipped > 0) {
        console.log(`[trelloSync] tenant=${tenant_id} reconciled=${synced} skipped(webhook_live)=${skipped}`);
      }

      await analyzeAllBoardsForTenant(tenant_id);
      await ensureAllWebhooksForTenant(tenant_id);
      await query(
        `UPDATE trello_connectors SET last_synced_at = now() WHERE tenant_id = $1`,
        [tenant_id],
      );
    } catch (err: any) {
      console.error(`[trelloSync] Error for tenant ${tenant_id}:`, err?.message);
    }
  }
}
