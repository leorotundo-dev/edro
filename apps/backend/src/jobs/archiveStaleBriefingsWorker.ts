/**
 * archiveStaleBriefingsWorker
 *
 * Roda 1× por dia. Arquiva automaticamente briefings cujo prazo (due_at)
 * já passou e que não foram concluídos (done / iclips_out).
 *
 * Ao arquivar, salva no payload:
 *   archived_reason:   'date_passed'
 *   archived_at:       ISO timestamp
 *   historical_copy:   snapshot do melhor copy gerado (se existir), para
 *                      referência futura ao criar briefings para o mesmo evento
 */

import { query } from '../db';

let lastRunDate: string | null = null;

const COMPLETED_STATUSES = ['done', 'archived', 'iclips_out', 'cancelled'] as const;

interface StaleBriefing {
  id: string;
  title: string;
  due_at: string;
  payload: Record<string, any>;
}

interface BestCopy {
  id: string;
  body: string | null;
  title: string | null;
  quality_score: number | null;
  created_at: string;
}

/** Busca o melhor copy gerado para um briefing (maior quality_score ou mais recente) */
async function fetchBestCopy(briefingId: string): Promise<BestCopy | null> {
  const { rows } = await query<BestCopy>(
    `SELECT id,
            payload->>'body'          AS body,
            payload->>'title'         AS title,
            (payload->>'overall_score')::numeric  AS quality_score,
            created_at::text          AS created_at
     FROM edro_copy_versions
     WHERE briefing_id = $1
     ORDER BY
       (payload->>'overall_score')::numeric DESC NULLS LAST,
       created_at DESC
     LIMIT 1`,
    [briefingId]
  );
  return rows[0] ?? null;
}

export async function runArchiveStaleBriefingsOnce(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  if (lastRunDate === today) return; // run at most once per calendar day

  const { rows: stale } = await query<StaleBriefing>(
    `SELECT id, title, due_at::text AS due_at, payload
     FROM edro_briefings
     WHERE due_at < NOW() - INTERVAL '1 day'
       AND status NOT IN (${COMPLETED_STATUSES.map((_, i) => `$${i + 1}`).join(', ')})
     LIMIT 200`,
    [...COMPLETED_STATUSES]
  );

  if (!stale.length) {
    lastRunDate = today;
    return;
  }

  let archived = 0;
  for (const brief of stale) {
    try {
      // Snapshot do melhor copy para referência futura
      const bestCopy = await fetchBestCopy(brief.id);

      const updatedPayload: Record<string, any> = {
        ...(brief.payload ?? {}),
        archived_reason: 'date_passed',
        archived_at: new Date().toISOString(),
        ...(bestCopy
          ? {
              historical_copy: {
                copy_id: bestCopy.id,
                title: bestCopy.title,
                body: bestCopy.body,
                quality_score: bestCopy.quality_score,
                generated_at: bestCopy.created_at,
              },
            }
          : {}),
      };

      await query(
        `UPDATE edro_briefings
         SET status     = 'archived',
             payload    = $1::jsonb,
             updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(updatedPayload), brief.id]
      );
      archived++;
    } catch (err: any) {
      console.error(`[archiveStale] failed to archive briefing ${brief.id}:`, err?.message);
    }
  }

  if (archived > 0) {
    console.log(`[archiveStale] archived ${archived} stale briefings (date_passed)`);
  }

  lastRunDate = today;
}
