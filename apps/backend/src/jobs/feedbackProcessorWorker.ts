/**
 * feedbackProcessorWorker.ts
 *
 * Closes the DA feedback loop:
 *   da_feedback_events (unprocessed) → trust_score updates → trend recompute
 *
 * Runs every 5 min. For each unprocessed event:
 *   1. Update global trust_score on da_references
 *   2. Upsert da_client_reference_scores (per-client isolation)
 *   3. Propagate signal (×0.3) to references sharing style_tags/mood_words
 *   4. Mark event as processed
 *   5. After RECOMPUTE_THRESHOLD events → recomputeArtDirectionTrendSnapshots
 *
 * Feedback weights:
 *   performed  +0.25  (published + above-average result)
 *   approved   +0.15
 *   used       +0.08
 *   saved      +0.05
 *   rejected   -0.20  (penalidade maior que boost — sistema conservador)
 *
 * Bounds: 0.10 (min) … 1.00 (max)
 * Archive threshold: trust_score < 0.30 → status = 'archived'
 */

import { query } from '../db';
import { recomputeArtDirectionTrendSnapshots } from '../services/ai/artDirectionMemoryService';

const BATCH_SIZE = 50;
const RECOMPUTE_THRESHOLD = 10;
const PROPAGATION_FACTOR = 0.3;

const FEEDBACK_WEIGHTS: Record<string, number> = {
  performed:  +0.25,
  approved:   +0.15,
  used:       +0.08,
  saved:      +0.05,
  edited:      0.00,
  rejected:   -0.20,
};

const SCORE_MIN = 0.10;
const SCORE_MAX = 1.00;
const ARCHIVE_THRESHOLD = 0.30;

let running = false;

export async function runFeedbackProcessorWorkerOnce(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await processBatch();
  } catch (err: any) {
    console.error('[feedbackProcessor] failed:', err?.message);
  } finally {
    running = false;
  }
}

async function processBatch(): Promise<void> {
  // Fetch unprocessed events with reference data
  const { rows: events } = await query<{
    id: string;
    tenant_id: string;
    client_id: string | null;
    reference_id: string | null;
    event_type: string;
    score: string | null;
  }>(
    `SELECT id, tenant_id, client_id, reference_id, event_type, score::text
     FROM da_feedback_events
     WHERE processed_at IS NULL
       AND reference_id IS NOT NULL
     ORDER BY created_at ASC
     LIMIT $1`,
    [BATCH_SIZE],
  );

  if (!events.length) return;

  // Group by tenant for threshold tracking
  const recomputeNeeded = new Set<string>();
  const tenantEventCounts: Record<string, number> = {};

  for (const evt of events) {
    const delta = FEEDBACK_WEIGHTS[evt.event_type] ?? 0;
    if (delta === 0 && evt.event_type !== 'edited') {
      await markProcessed(evt.id);
      continue;
    }

    const refId = evt.reference_id!;
    const tenantId = evt.tenant_id;
    const clientId = evt.client_id ?? null;

    // 1. Update global trust_score on da_references
    await query(
      `UPDATE da_references
       SET trust_score = GREATEST($2, LEAST($3, trust_score + $4)),
           status = CASE
             WHEN GREATEST($2, LEAST($3, trust_score + $4)) < $5 THEN 'archived'
             ELSE status
           END,
           updated_at = now()
       WHERE id = $1`,
      [refId, SCORE_MIN, SCORE_MAX, delta, ARCHIVE_THRESHOLD],
    );

    // 2. Upsert per-client trust score
    if (clientId) {
      await query(
        `INSERT INTO da_client_reference_scores
           (tenant_id, client_id, reference_id, trust_score, feedback_count, last_feedback_at)
         VALUES ($1, $2, $3,
           GREATEST($4, LEAST($5, 0.60 + $6)),
           1, now())
         ON CONFLICT (tenant_id, client_id, reference_id)
         DO UPDATE SET
           trust_score   = GREATEST($4, LEAST($5, da_client_reference_scores.trust_score + $6)),
           feedback_count = da_client_reference_scores.feedback_count + 1,
           last_feedback_at = now(),
           updated_at    = now()`,
        [tenantId, clientId, refId, SCORE_MIN, SCORE_MAX, delta],
      );
    }

    // 3. Semantic propagation — boost/penalize references with shared tags (×PROPAGATION_FACTOR)
    if (Math.abs(delta) >= 0.08) {
      await propagateToSimilarReferences(tenantId, clientId, refId, delta * PROPAGATION_FACTOR);
    }

    // 4. Mark event as processed
    await markProcessed(evt.id);

    // Track for recompute
    tenantEventCounts[tenantId] = (tenantEventCounts[tenantId] ?? 0) + 1;
  }

  // 5. Recompute trends for tenants that hit the threshold
  for (const [tenantId, count] of Object.entries(tenantEventCounts)) {
    if (count >= RECOMPUTE_THRESHOLD) {
      recomputeNeeded.add(tenantId);
    }
  }

  for (const tenantId of recomputeNeeded) {
    try {
      await recomputeArtDirectionTrendSnapshots({ windowDays: 30, recentDays: 7 });
      console.log(`[feedbackProcessor] recomputed trends for tenant ${tenantId}`);
    } catch (err: any) {
      console.warn(`[feedbackProcessor] trend recompute failed for ${tenantId}:`, err?.message);
    }
  }

  if (events.length > 0) {
    console.log(`[feedbackProcessor] processed ${events.length} feedback events`);
  }
}

async function propagateToSimilarReferences(
  tenantId: string,
  clientId: string | null,
  sourceRefId: string,
  propagatedDelta: number,
): Promise<void> {
  // Fetch style_tags + mood_words of the source reference
  const { rows } = await query<{ style_tags: string[]; mood_words: string[] }>(
    `SELECT style_tags, mood_words FROM da_references WHERE id = $1`,
    [sourceRefId],
  );
  const ref = rows[0];
  if (!ref) return;

  const allTags = [...(ref.style_tags ?? []), ...(ref.mood_words ?? [])];
  if (!allTags.length) return;

  // Update global scores for similar references (share ≥1 tag, exclude source)
  await query(
    `UPDATE da_references
     SET trust_score = GREATEST($3, LEAST($4, trust_score + $5)),
         status = CASE
           WHEN GREATEST($3, LEAST($4, trust_score + $5)) < $6 THEN 'archived'
           ELSE status
         END,
         updated_at = now()
     WHERE tenant_id = $1
       AND id != $2
       AND status != 'archived'
       AND (style_tags ?| $7 OR mood_words ?| $7)`,
    [tenantId, sourceRefId, SCORE_MIN, SCORE_MAX, propagatedDelta, ARCHIVE_THRESHOLD, allTags],
  );

  // Update per-client scores if clientId provided
  if (clientId) {
    await query(
      `UPDATE da_client_reference_scores dcrs
       SET trust_score  = GREATEST($3, LEAST($4, dcrs.trust_score + $5)),
           updated_at   = now()
       FROM da_references dr
       WHERE dcrs.reference_id = dr.id
         AND dcrs.tenant_id    = $1
         AND dcrs.client_id    = $2
         AND dr.id             != $6
         AND dr.status         != 'archived'
         AND (dr.style_tags ?| $7 OR dr.mood_words ?| $7)`,
      [tenantId, clientId, SCORE_MIN, SCORE_MAX, propagatedDelta, sourceRefId, allTags],
    );
  }
}

async function markProcessed(eventId: string): Promise<void> {
  await query(
    `UPDATE da_feedback_events SET processed_at = now() WHERE id = $1`,
    [eventId],
  );
}
