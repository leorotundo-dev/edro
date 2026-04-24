/**
 * trelloJobBridgeService.ts
 *
 * THE BRIDGE: bidirectional sync between project_cards (Trello) and jobs (Edro).
 *
 * Trello → Jobs:
 *   upsertJobFromCard(tenantId, trelloCardId) — called after every webhook event
 *   syncAllProjectCardsToJobs(tenantId)       — called after every full board sync
 *
 * Jobs → Trello:
 *   enqueueJobChangeToTrello(tenantId, jobId, changes) — called after PATCH /jobs/:id
 *
 * SLA mapping:
 *   Material Solicitado / design / copy / video → 5 dias
 *   Post / publicação / meeting / briefing     → 3 dias
 *   Projeto / campaign                         → 15 dias
 *
 * Status mapping (Trello list name → Edro job status):
 *   See LIST_STATUS_MAP below — uses fuzzy matching on list name.
 */

import { query } from '../db';
import { enqueueOutbox } from './trelloOutboxService';
import { inferJobTypeFromLabels, normalizeTrelloLabels, stripTrelloTitle } from './trelloCardMapper';
import { ensureJobCode } from './jobs/jobCodeService';
import { provisionDriveForJob } from './jobs/jobDriveProvisioningService';

// ── SLA by category ───────────────────────────────────────────────────────────

const SLA_BY_JOB_TYPE: Record<string, number> = {
  campaign:       15,
  briefing:        3,
  meeting:         3,
  approval:        3,
  copy:            5,
  design_static:   5,
  design_carousel: 5,
  video_edit:      5,
  publication:     3,
  urgent_request:  3,
};

/**
 * Infer SLA days from Trello label names.
 * Priority: explicit "Material Solicitado" / "Post" / "Projeto" labels > job_type default.
 */
function inferSlaFromLabels(labels: { name: string; color: string | null }[], jobType: string): number {
  const text = labels.map((l) => (l.name ?? '').toLowerCase()).join(' ');
  if (/projeto|project|campanha/.test(text)) return 15;
  if (/post\b/.test(text)) return 3;
  if (/material\s*solicitado|material/.test(text)) return 5;
  return SLA_BY_JOB_TYPE[jobType] ?? 5;
}

// ── List name → job status ────────────────────────────────────────────────────

type JobStatus =
  | 'intake' | 'planned' | 'ready' | 'allocated' | 'in_progress'
  | 'blocked' | 'in_review' | 'awaiting_approval' | 'approved'
  | 'scheduled' | 'published' | 'done' | 'archived';

const LIST_STATUS_MAP: Array<{ pattern: RegExp; status: JobStatus }> = [
  { pattern: /cancelad|arquivad|encerrad/i,                                     status: 'archived'           },
  { pattern: /publicad|published|finalizado|feito|done|entregue/i,              status: 'done'               },
  { pattern: /agendad|scheduled|programad/i,                                    status: 'scheduled'           },
  { pattern: /aprovad.*client|client.*aprovad|aprovação.*client/i,             status: 'approved'            },
  { pattern: /aguardando\s*aprov|aprovação\s*interna|internal\s*approv/i,       status: 'awaiting_approval'   },
  { pattern: /revisão|em\s*revisão|em\s*review|in\s*review|revision/i,          status: 'in_review'           },
  { pattern: /bloqueado|blocked|stand.by|impedido|parado/i,                     status: 'blocked'             },
  { pattern: /em\s*exec|in\s*prog|produção|producao|execução|criação/i,         status: 'in_progress'         },
  { pattern: /aloc|assigned|allocated/i,                                        status: 'allocated'           },
  { pattern: /pronto|ready|preparado/i,                                         status: 'ready'               },
  { pattern: /planejamento|planning|planned/i,                                  status: 'planned'             },
  { pattern: /novos?\s*jobs?|novo|entrada|intake|backlog|fila/i,                status: 'intake'              },
];

export function mapListNameToJobStatus(listName: string): JobStatus {
  const norm = listName.trim();
  for (const { pattern, status } of LIST_STATUS_MAP) {
    if (pattern.test(norm)) return status;
  }
  return 'intake'; // safe default
}

// ── Priority mapping ──────────────────────────────────────────────────────────

function mapPriorityToBand(priority: string | null | undefined): string {
  switch ((priority ?? '').toLowerCase()) {
    case 'urgent':   return 'p0';
    case 'high':     return 'p1';
    case 'medium':   return 'p2';
    case 'low':      return 'p3';
    default:         return 'p4';
  }
}

// ── Core: upsert one job from a project_card ─────────────────────────────────

interface ProjectCardRow {
  id: string;
  tenant_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;  // DATE as string
  due_complete: boolean;
  is_archived: boolean;
  labels: unknown;
  priority: string | null;
  trello_card_id: string;
  trello_url: string | null;
  completed_at: string | null;
  list_name: string | null;   // joined from project_lists
  client_name: string | null; // joined from clients
}

/**
 * Upsert a job row from a project_card identified by its trello_card_id.
 * Creates the job if it doesn't exist; updates if it does.
 * Returns the job id, or null if the card isn't found.
 */
export async function upsertJobFromCard(
  tenantId: string,
  trelloCardId: string,
): Promise<string | null> {
  // Fetch card with joined list name and client name
  const cardRes = await query<ProjectCardRow>(
    `SELECT
       pc.id, pc.tenant_id, pb.client_id, pc.title, pc.description,
       pc.due_date, pc.due_complete, pc.is_archived, pc.labels, pc.priority,
       pc.trello_card_id, pc.trello_url, pc.completed_at,
       pl.name   AS list_name,
       c.name    AS client_name
     FROM project_cards pc
     LEFT JOIN project_lists pl ON pl.id = pc.list_id
     LEFT JOIN project_boards pb ON pb.id = pc.board_id
     LEFT JOIN clients c        ON c.id::text = pb.client_id
     WHERE pc.tenant_id = $1 AND pc.trello_card_id = $2
     LIMIT 1`,
    [tenantId, trelloCardId],
  );

  const card = cardRes.rows[0];
  if (!card) return null;

  return upsertJobFromCardRow(card);
}

async function upsertJobFromCardRow(card: ProjectCardRow): Promise<string | null> {
  const labels = normalizeTrelloLabels(card.labels);
  const jobType = inferJobTypeFromLabels(labels);
  const slaAgreedDays = inferSlaFromLabels(labels, jobType);
  const listName = card.list_name ?? '';

  // Status from list name — archived cards get 'done'
  let status: JobStatus = card.is_archived
    ? (card.due_complete ? 'done' : 'archived')
    : mapListNameToJobStatus(listName);

  const priorityBand = mapPriorityToBand(card.priority);

  // deadline_at from Trello due_date (date only → assume end of day UTC)
  const deadlineAt = card.due_date ? new Date(`${card.due_date}T23:59:59Z`) : null;

  // completed_at: use Trello due_complete timestamp or the stored completed_at
  const completedAt = card.due_complete && card.completed_at
    ? new Date(card.completed_at)
    : (card.due_complete ? new Date() : null);

  // Clean title
  const title = stripTrelloTitle(card.title, card.client_name) || card.title;

  // Upsert: match on (tenant_id, trello_card_id)
  const result = await query<{ id: string }>(
    `INSERT INTO jobs (
       id, tenant_id, client_id, title, summary,
       job_type, complexity, source,
       status, priority_band, priority_score,
       impact_level, dependency_level,
       deadline_at, completed_at,
       sla_agreed_days, trello_card_id, trello_list_name,
       metadata
     ) VALUES (
       $1, $2, $3, $4, $5,
       $6, 's', 'trello',
       $7, $8, 0,
       0, 0,
       $9, $10,
       $11, $12, $13,
       $14
     )
     ON CONFLICT (tenant_id, trello_card_id)
     WHERE trello_card_id IS NOT NULL
     DO UPDATE SET
       title           = EXCLUDED.title,
       summary         = EXCLUDED.summary,
       status          = EXCLUDED.status,
       priority_band   = EXCLUDED.priority_band,
       deadline_at     = EXCLUDED.deadline_at,
       completed_at    = CASE
                           WHEN EXCLUDED.status IN ('done','published','archived') AND jobs.completed_at IS NULL
                           THEN EXCLUDED.completed_at
                           ELSE jobs.completed_at
                         END,
       trello_list_name = EXCLUDED.trello_list_name,
       sla_agreed_days  = COALESCE(jobs.sla_agreed_days, EXCLUDED.sla_agreed_days),
       updated_at       = now()
     RETURNING id`,
    [
      card.id,          // $1  — use same UUID as project_card for easy cross-referencing
      card.tenant_id,   // $2
      card.client_id,   // $3
      title,            // $4
      card.description || null, // $5
      jobType,          // $6
      status,           // $7
      priorityBand,     // $8
      deadlineAt,       // $9
      completedAt,      // $10
      slaAgreedDays,    // $11
      card.trello_card_id, // $12
      listName || null, // $13
      JSON.stringify({  // $14
        trello_url: card.trello_url,
        source_card_id: card.id,
      }),
    ],
  );

  const jobId = result.rows[0]?.id ?? null;
  if (!jobId) return null;

  try {
    const code = await ensureJobCode(card.tenant_id, jobId);
    if (code.jobCode && code.canonicalTitle && code.trelloCardId && card.title !== code.canonicalTitle) {
      await enqueueOutbox(
        card.tenant_id,
        'card.update',
        { trelloCardId: code.trelloCardId, fields: { name: code.canonicalTitle } },
        `job.${jobId}.canonical-title`,
      ).catch(() => {});
    }

    provisionDriveForJob(card.tenant_id, jobId).catch((err: any) => {
      console.error(`[trelloJobBridge] Drive provisioning failed for job ${jobId}: ${err?.message || err}`);
    });
  } catch (err: any) {
    console.error(`[trelloJobBridge] Failed to ensure job code for ${jobId}: ${err?.message || err}`);
  }

  return jobId;
}

// ── Bulk sync: all project_cards → jobs ──────────────────────────────────────

/**
 * Promotes ALL project_cards (including archived) to jobs for a given tenant.
 * Safe to run repeatedly — uses upsert semantics.
 * Returns the count of cards processed.
 */
export async function syncAllProjectCardsToJobs(tenantId: string): Promise<number> {
  const cardsRes = await query<ProjectCardRow>(
    `SELECT
       pc.id, pc.tenant_id, pb.client_id, pc.title, pc.description,
       pc.due_date, pc.due_complete, pc.is_archived, pc.labels, pc.priority,
       pc.trello_card_id, pc.trello_url, pc.completed_at,
       pl.name   AS list_name,
       c.name    AS client_name
     FROM project_cards pc
     LEFT JOIN project_lists pl ON pl.id = pc.list_id
     LEFT JOIN project_boards pb ON pb.id = pc.board_id
     LEFT JOIN clients c        ON c.id::text = pb.client_id
     WHERE pc.tenant_id = $1
       AND pc.trello_card_id IS NOT NULL
     ORDER BY pc.last_activity_at DESC`,
    [tenantId],
  );

  let processed = 0;
  for (const card of cardsRes.rows) {
    try {
      await upsertJobFromCardRow(card);
      processed++;
    } catch (err: any) {
      // Log but don't abort — one bad card shouldn't stop the batch
      console.error(`[trelloJobBridge] Failed to upsert job for card ${card.trello_card_id}: ${err.message}`);
    }
  }

  console.log(`[trelloJobBridge] syncAllProjectCardsToJobs: ${processed}/${cardsRes.rows.length} cards → jobs for tenant ${tenantId}`);
  return processed;
}

// ── Jobs → Trello: enqueue outbox on job change ───────────────────────────────

interface JobChanges {
  status?: string;
  deadline_at?: string | null;
  title?: string;
  owner_trello_member_id?: string | null;
  trello_list_id_for_status?: string | null; // resolved by caller
}

/**
 * Enqueue changes from a job update back to Trello via the outbox.
 * Called from PATCH /jobs/:id after writing to DB.
 */
export async function enqueueJobChangeToTrello(
  tenantId: string,
  jobId: string,
  changes: JobChanges,
): Promise<void> {
  // Fetch trello_card_id for this job
  const jobRes = await query<{ trello_card_id: string | null }>(
    `SELECT trello_card_id FROM jobs WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
    [jobId, tenantId],
  );
  const trelloCardId = jobRes.rows[0]?.trello_card_id;
  if (!trelloCardId) return; // job didn't come from Trello — nothing to sync back

  const fields: Record<string, unknown> = {};

  if (changes.title !== undefined) {
    fields.name = changes.title;
  }

  if (changes.deadline_at !== undefined) {
    fields.due = changes.deadline_at ? new Date(changes.deadline_at).toISOString() : null;
  }

  // Map status → Trello due_complete
  if (changes.status !== undefined) {
    if (['done', 'published'].includes(changes.status)) {
      fields.dueComplete = true;
    } else if (['intake', 'planned', 'in_progress', 'in_review'].includes(changes.status)) {
      fields.dueComplete = false;
    }

    // If caller resolved the target Trello list, move the card
    if (changes.trello_list_id_for_status) {
      fields.idList = changes.trello_list_id_for_status;
    }
  }

  if (Object.keys(fields).length > 0) {
    await enqueueOutbox(
      tenantId,
      'card.update',
      { trelloCardId, fields },
      `job.${jobId}.update`,  // dedupeKey — coalesces rapid edits
    ).catch(() => {}); // best-effort
  }
}

// ── Resolve Trello list ID for a given status ─────────────────────────────────

/**
 * Finds the Trello list ID that best matches the desired job status on a board.
 * Uses the trello_list_status_map if configured, else fuzzy-matches project_lists.name.
 */
export async function resolveTrelloListForStatus(
  tenantId: string,
  boardId: string,   // project_boards.id (internal UUID)
  jobStatus: string,
): Promise<string | null> {
  // 1. Check tenant-specific override table
  const mapRes = await query<{ trello_list_id: string }>(
    `SELECT trello_list_id FROM trello_list_status_map
     WHERE tenant_id = $1 AND board_id = $2 AND job_status = $3
     LIMIT 1`,
    [tenantId, boardId, jobStatus],
  );
  if (mapRes.rows[0]) return mapRes.rows[0].trello_list_id;

  // 2. Fuzzy-match by list name using our LIST_STATUS_MAP patterns
  const listsRes = await query<{ trello_list_id: string; name: string }>(
    `SELECT trello_list_id, name FROM project_lists
     WHERE board_id = $1 AND tenant_id = $2 AND is_archived = false
     ORDER BY position ASC`,
    [boardId, tenantId],
  );
  for (const list of listsRes.rows) {
    if (mapListNameToJobStatus(list.name) === jobStatus) {
      return list.trello_list_id;
    }
  }

  return null;
}
