/**
 * pautaAutoGenWorker.ts
 *
 * Closes the intelligence → planning loop by automatically turning high-scoring
 * clipping items into Pauta Inbox suggestions every 4 hours.
 *
 * Flow:
 *  1. Find all tenants that have scored clipping items (status=NEW, relevance>=0.55)
 *     from the last 5 days that haven't yet generated a pauta for any matched client
 *  2. For each clipping × client pair, call generatePautaSuggestions()
 *     (which internally dedupes by source_id + client_id)
 *  3. Cap at MAX_PER_TICK suggestions per run (each one uses 3 AI calls)
 *
 * The generated suggestions appear in the Pauta Inbox (/admin/operacoes/pauta)
 * for human review — approve A, approve B, or reject.
 */

import { query } from '../db';
import { generatePautaSuggestions } from '../services/pautaSuggestionService';
import { notifyEvent } from '../services/notificationService';

// ── Config ────────────────────────────────────────────────────────────────────

/** How many pauta suggestions to generate per tick (each = ~3 AI calls) */
const MAX_PER_TICK = 5;

/** Minimum relevance_score on clipping_items to consider */
const MIN_RELEVANCE = 0.55;

/** Only look at clipping items published in the last N days */
const LOOKBACK_DAYS = 5;

/** Self-throttle: re-runs every 4 hours */
const INTERVAL_MS = 4 * 60 * 60 * 1000;

let lastRunAt = 0;

// ── Types ─────────────────────────────────────────────────────────────────────

type ClippingCandidate = {
  item_id: string;
  client_id: string;
  tenant_id: string;
  title: string;
  summary: string | null;
  source_domain: string | null;
  published_at: string | null;
  relevance_score: number | null;
};

// ── Main ──────────────────────────────────────────────────────────────────────

export async function runPautaAutoGenWorkerOnce(): Promise<void> {
  const now = Date.now();
  if (now - lastRunAt < INTERVAL_MS) return;
  lastRunAt = now;

  let generated = 0;

  try {
    // Expand suggested_client_ids array to individual (clipping_item, client) rows,
    // then filter to pairs that haven't had a pending pauta generated yet.
    const { rows: candidates } = await query<ClippingCandidate>(
      `SELECT
         ci.id           AS item_id,
         sid.cid         AS client_id,
         ci.tenant_id,
         ci.title,
         ci.summary,
         ci.source_domain,
         ci.published_at,
         ci.relevance_score
       FROM clipping_items ci
       CROSS JOIN LATERAL UNNEST(ci.suggested_client_ids) AS sid(cid)
       JOIN clients c
         ON c.id::text = sid.cid::text
        AND c.tenant_id::text = ci.tenant_id::text
      WHERE ci.status = 'NEW'
        AND ci.relevance_score >= $1
        AND ci.published_at > NOW() - INTERVAL '${LOOKBACK_DAYS} days'
        AND ci.suggested_client_ids IS NOT NULL
        AND ARRAY_LENGTH(ci.suggested_client_ids, 1) > 0
        AND NOT EXISTS (
          SELECT 1
            FROM pauta_suggestions ps
           WHERE ps.source_id    = ci.id::text
             AND ps.source_type  = 'clipping'
             AND ps.client_id    = sid.cid
             AND ps.tenant_id::text = ci.tenant_id::text
        )
      ORDER BY ci.relevance_score DESC, ci.published_at DESC
      LIMIT $2`,
      [MIN_RELEVANCE, MAX_PER_TICK],
    );

    for (const row of candidates) {
      if (generated >= MAX_PER_TICK) break;

      try {
        await generatePautaSuggestions({
          client_id: row.client_id,
          tenant_id: row.tenant_id,
          sources: [
            {
              type: 'clipping',
              id: row.item_id,
              title: row.title,
              summary: row.summary || row.title,
              domain: row.source_domain || undefined,
              date: row.published_at ? row.published_at.slice(0, 10) : undefined,
              score: row.relevance_score != null ? row.relevance_score * 100 : undefined,
            },
          ],
        });
        generated++;
      } catch (err: any) {
        console.error(
          `[pautaAutoGen] failed for item ${row.item_id} × client ${row.client_id}: ${err?.message}`,
        );
      }
    }

    if (generated > 0) {
      console.log(`[pautaAutoGen] generated ${generated} pauta suggestion(s) from clipping`);

      // Notify all admins/managers across tenants that processed new pautas
      try {
        const { rows: tenantAdmins } = await query<{ user_id: string; tenant_id: string; email: string }>(
          `SELECT DISTINCT ON (tu.user_id) tu.user_id, tu.tenant_id, u.email
             FROM tenant_users tu
             JOIN edro_users u ON u.id = tu.user_id
            WHERE tu.role IN ('admin', 'manager', 'gestor')
              AND tu.tenant_id IN (
                SELECT DISTINCT tenant_id FROM pauta_suggestions
                 WHERE status = 'pending'
                   AND generated_at > NOW() - INTERVAL '5 minutes'
              )`,
          [],
        );

        for (const admin of tenantAdmins) {
          await notifyEvent({
            event: 'pauta.auto_generated',
            tenantId: admin.tenant_id,
            userId: admin.user_id,
            title: `📋 ${generated} nova${generated !== 1 ? 's' : ''} sugestão${generated !== 1 ? 'ões' : ''} de pauta`,
            body: 'O Motor gerou novas abordagens A/B a partir do clipping. Acesse a Pauta Inbox para revisar.',
            link: '/admin/operacoes/pauta',
            recipientEmail: admin.email,
            defaultChannels: ['in_app', 'whatsapp'],
          }).catch(() => {});
        }
      } catch {
        // non-blocking — don't fail the worker if notifications error
      }
    }
  } catch (err: any) {
    console.error(`[pautaAutoGen] outer error: ${err?.message}`);
  }
}
