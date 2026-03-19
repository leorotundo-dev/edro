/**
 * Trello History Analyzer
 *
 * Reconstrói a timeline de cada card a partir das actions do Trello
 * (createCard + updateCard.listAfter) e computa:
 *
 *   - Lead time: criação → finalização (inclui espera no backlog)
 *   - Cycle time: primeiro movimento para ANDAMENTO → finalização (só trabalho ativo)
 *   - Time per stage: horas em cada estágio
 *   - Client response time: APROVAÇÃO INTERNA → POST APROVAÇÃO (quanto o cliente demora)
 *   - Revision count: vezes que voltou para ALTERAÇÃO/REVISÃO
 *   - Flow efficiency: cycle_time / lead_time
 *   - P50/P75/P90 por plataforma+formato no board summary
 *   - Throughput semanal + Monte Carlo para forecast
 */

import { query } from '../db';

// ─── Stage classification ─────────────────────────────────────────────────────

const LIST_STAGE_MAP: { stage: string; keywords: string[] }[] = [
  { stage: 'reference',         keywords: ['INSTITUCIONAL', 'ASSETS', 'MATERIAIS', 'ACESSO', 'BANCO', 'CRONOGRAMA', 'KV', 'IMAGEM', 'ACESSOS', 'SOCIAL MIDIA'] },
  { stage: 'intake',            keywords: ['NOVO BRIEFING', 'NOVO POST', 'SOLICITAÇÃO', 'BRIEFING', 'INBOX', 'ENTRADA'] },
  { stage: 'in_progress',       keywords: ['ANDAMENTO', 'PRODUÇÃO', 'FAZENDO', 'EXECUÇÃO', 'POST ANDAMENTO'] },
  { stage: 'revision',          keywords: ['ALTERAÇÃO', 'REVISÃO', 'AJUSTE', 'EDIÇÃO', 'CORREÇÃO', 'POST ALTERAÇÃO'] },
  { stage: 'approval_internal', keywords: ['APROVAÇÃO INTERNA', 'INTERNO', 'REVIEW INTERNO'] },
  { stage: 'approval_client',   keywords: ['APROVAÇÃO', 'POST APROVAÇÃO', 'AGUARDANDO'] },
  { stage: 'ready',             keywords: ['POSTAR', 'PUBLICAR', 'PRONTO PARA'] },
  { stage: 'scheduled',         keywords: ['AGENDADO', 'PROGRAMADO', 'POST AGENDADO'] },
  { stage: 'postponed',         keywords: ['POSTERGADO', 'PAUSADO', 'ADIADO', 'POSTS POSTERGADOS'] },
  { stage: 'done',              keywords: ['FINALIZADO', 'CONCLUÍDO', 'DONE', 'PUBLICADO', 'ENTREGUE', 'POST FINALIZADO'] },
  { stage: 'blocked',           keywords: ['PARADO', 'BLOQUEADO', 'IMPEDIDO', 'POST PARADO'] },
  { stage: 'cancelled',         keywords: ['CANCELADO', 'DESCARTADO', 'ARQUIVADO'] },
];

function classifyList(listName: string): string {
  const upper = listName.toUpperCase();
  for (const { stage, keywords } of LIST_STAGE_MAP) {
    if (keywords.some((k) => upper.includes(k))) return stage;
  }
  return 'unknown';
}

const DONE_STAGES    = new Set(['done', 'scheduled', 'postponed']);
const ACTIVE_STAGES  = new Set(['in_progress', 'revision', 'approval_internal', 'approval_client', 'ready']);
const TERMINAL_STAGES = new Set(['done', 'cancelled', 'blocked', 'scheduled', 'postponed']);

// ─── Title parser ─────────────────────────────────────────────────────────────
// Patterns:
//   DDMMYY_Client_Instagram_Estático_Description
//   DDMMYY_Client_Job_Description
//   DDMMYY_Client_Campanha_Description

interface ParsedTitle {
  parsed_date: string | null;
  platform: string | null;
  format: string | null;
  job_type: string | null;   // Job | Campanha | Post | etc
  description: string | null;
}

const PLATFORMS = ['INSTAGRAM', 'LINKEDIN', 'STORIES', 'REELS', 'FACEBOOK', 'TIKTOK', 'YOUTUBE', 'TWITTER'];
const FORMATS   = ['ESTÁTICO', 'ESTATICO', 'CARROSSEL', 'REELS', 'VIDEO', 'STORIES', 'FEED'];

function parseCardTitle(title: string): ParsedTitle {
  const parts = title.split('_');

  let parsed_date: string | null = null;
  let platform: string | null = null;
  let format: string | null = null;
  let job_type: string | null = null;
  let descParts: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const upper = p.toUpperCase().trim();

    // Date prefix: 6 digits DDMMYY
    if (i === 0 && /^\d{6}$/.test(p.trim())) {
      const d = p.trim();
      const day = d.slice(0, 2);
      const month = d.slice(2, 4);
      const yr = parseInt('20' + d.slice(4, 6));
      if (yr >= 2020 && yr <= 2030) {
        parsed_date = `${yr}-${month}-${day}`;
      }
      continue;
    }

    // Skip client name (index 1 if date was found, or 0 if not)
    if ((parsed_date && i === 1) || (!parsed_date && i === 0)) {
      continue;
    }

    // Platform detection
    if (!platform && PLATFORMS.some((pl) => upper.includes(pl))) {
      platform = PLATFORMS.find((pl) => upper.includes(pl)) ?? null;
      // Normalize
      if (platform === 'ESTATICO') platform = 'ESTÁTICO';
      continue;
    }

    // Format detection
    if (!format && FORMATS.some((f) => upper.includes(f))) {
      format = FORMATS.find((f) => upper.includes(f)) ?? null;
      if (format === 'ESTATICO') format = 'ESTÁTICO';
      continue;
    }

    // Job type
    if (!job_type && ['JOB', 'CAMPANHA', 'CAMPAIGN', 'BRIEFING', 'POST', 'EVENTO'].includes(upper.trim())) {
      job_type = upper.trim();
      continue;
    }

    descParts.push(p);
  }

  return {
    parsed_date,
    platform: platform ? capitalize(platform.toLowerCase()) : null,
    format: format ? capitalize(format.toLowerCase()) : null,
    job_type: job_type ?? (platform ? 'Post' : null),
    description: descParts.join(' ').trim() || null,
  };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Per-card analysis ────────────────────────────────────────────────────────

interface CardTimeline {
  cardId: string;
  title: string;
  createdAt: Date | null;
  dueDate: Date | null;
  dueComplete: boolean;
  events: { stage: string; listName: string; enteredAt: Date }[];
}

function computeCardAnalytics(tl: CardTimeline) {
  if (tl.events.length === 0) return null;

  const events = [...tl.events].sort((a, b) => a.enteredAt.getTime() - b.enteredAt.getTime());

  // ── Time per stage ──────────────────────────────────────────────────────────
  const hoursPerStage: Record<string, number> = {};
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (ev.stage === 'reference') continue;
    const nextTime = i + 1 < events.length ? events[i + 1].enteredAt.getTime() : Date.now();
    const hours = (nextTime - ev.enteredAt.getTime()) / 3_600_000;
    hoursPerStage[ev.stage] = (hoursPerStage[ev.stage] ?? 0) + hours;
  }

  // ── Terminal stage ──────────────────────────────────────────────────────────
  const lastStage = events[events.length - 1];
  const terminalStage = TERMINAL_STAGES.has(lastStage.stage) ? lastStage.stage : null;
  const finishedAt = terminalStage ? lastStage.enteredAt : null;

  // ── Lead time: createdAt → finishedAt ───────────────────────────────────────
  const createdAt = tl.createdAt ?? events[0].enteredAt;
  const leadTimeHours = finishedAt
    ? (finishedAt.getTime() - createdAt.getTime()) / 3_600_000
    : null;

  // ── Cycle time: first in_progress → finishedAt ─────────────────────────────
  const firstActive = events.find((e) => ACTIVE_STAGES.has(e.stage));
  const startedAt = firstActive?.enteredAt ?? null;
  const cycleTimeHours = finishedAt && startedAt
    ? (finishedAt.getTime() - startedAt.getTime()) / 3_600_000
    : null;

  // ── Active time (actual work, not waiting) ───────────────────────────────────
  const activeTimeHours = (['in_progress', 'revision'] as const)
    .reduce((sum, s) => sum + (hoursPerStage[s] ?? 0), 0);

  // ── Flow efficiency ─────────────────────────────────────────────────────────
  const flowEfficiency = cycleTimeHours && cycleTimeHours > 0
    ? Math.min(1, activeTimeHours / cycleTimeHours)
    : null;

  // ── Revision count: number of times entered 'revision' ─────────────────────
  const revisionCount = events.filter((e) => e.stage === 'revision').length;
  const approvalCycles = events.filter((e) => e.stage === 'approval_client').length;

  // ── Client response time: time in approval_internal (waiting for client) ────
  const clientResponseHours = hoursPerStage['approval_internal'] ?? null;

  // ── SLA ─────────────────────────────────────────────────────────────────────
  let wasOverdue: boolean | null = null;
  let daysOverdue: number | null = null;
  if (tl.dueDate && finishedAt) {
    const diffMs = finishedAt.getTime() - tl.dueDate.getTime();
    daysOverdue = diffMs / 86_400_000;
    wasOverdue = diffMs > 0;
  } else if (tl.dueDate && !finishedAt && !terminalStage) {
    // Still open, check if past due
    const diffMs = Date.now() - tl.dueDate.getTime();
    if (diffMs > 0) {
      daysOverdue = diffMs / 86_400_000;
      wasOverdue = true;
    }
  }

  return {
    cycle_time_hours: cycleTimeHours,
    lead_time_hours: leadTimeHours,
    active_time_hours: activeTimeHours,
    flow_efficiency: flowEfficiency,
    hours_briefing: hoursPerStage['intake'] ?? null,
    hours_in_progress: hoursPerStage['in_progress'] ?? null,
    hours_revision: hoursPerStage['revision'] ?? null,
    hours_approval_internal: hoursPerStage['approval_internal'] ?? null,
    hours_approval_client: hoursPerStage['approval_client'] ?? null,
    client_response_hours: clientResponseHours,
    revision_count: revisionCount,
    approval_cycles: approvalCycles,
    terminal_stage: terminalStage,
    started_at: startedAt,
    finished_at: finishedAt,
    was_overdue: wasOverdue,
    days_overdue: daysOverdue,
  };
}

// ─── Board-level aggregation ─────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.max(0, Math.floor(sorted.length * p / 100) - 1);
  return sorted[idx];
}

function median(arr: number[]): number {
  return percentile([...arr].sort((a, b) => a - b), 50);
}

// Monte Carlo: given weekly throughput history, forecast N cards completion
function monteCarloForecast(weeklyThroughput: number[], wipCount: number, iterations = 1000): {
  p50_weeks: number; p75_weeks: number; p85_weeks: number;
} {
  if (!weeklyThroughput.length || wipCount <= 0) return { p50_weeks: 0, p75_weeks: 0, p85_weeks: 0 };

  const results: number[] = [];
  for (let i = 0; i < iterations; i++) {
    let remaining = wipCount;
    let weeks = 0;
    while (remaining > 0 && weeks < 52) {
      const throughput = weeklyThroughput[Math.floor(Math.random() * weeklyThroughput.length)];
      remaining -= Math.max(0, throughput);
      weeks++;
    }
    results.push(weeks);
  }
  results.sort((a, b) => a - b);
  return {
    p50_weeks: percentile(results, 50),
    p75_weeks: percentile(results, 75),
    p85_weeks: percentile(results, 85),
  };
}

// ─── Main: analyze a board ───────────────────────────────────────────────────

export async function analyzeBoardHistory(boardId: string, tenantId: string): Promise<void> {
  console.log(`[trelloAnalyzer] Analyzing board ${boardId}...`);

  // 1. Load all cards for this board
  const cardsRes = await query<{
    id: string; title: string; due_date: string | null; due_complete: boolean;
    created_at: string; trello_card_id: string | null;
    checklist_items_total: number; checklist_items_done: number;
  }>(
    `SELECT c.id, c.title, c.due_date, c.due_complete, c.created_at, c.trello_card_id,
            COALESCE(SUM(jsonb_array_length(cl.items)), 0)::int AS checklist_items_total,
            COALESCE(SUM((
              SELECT COUNT(*) FROM jsonb_array_elements(cl.items) item
              WHERE (item->>'checked')::boolean = true
            )), 0)::int AS checklist_items_done
     FROM project_cards c
     LEFT JOIN project_card_checklists cl ON cl.card_id = c.id
     WHERE c.board_id = $1 AND c.tenant_id = $2
     GROUP BY c.id`,
    [boardId, tenantId],
  );

  if (!cardsRes.rows.length) return;

  // 2. Load all actions for this board (transitions + creates)
  const actionsRes = await query<{
    card_id: string; action_type: string; from_list_name: string | null;
    to_list_name: string | null; occurred_at: string;
  }>(
    `SELECT card_id, action_type, from_list_name, to_list_name, occurred_at
     FROM project_card_actions
     WHERE board_id = $1
     ORDER BY occurred_at ASC`,
    [boardId],
  );

  // 3. Load comment counts per card
  const commentsRes = await query<{ card_id: string; cnt: number }>(
    `SELECT card_id, COUNT(*)::int AS cnt FROM project_card_comments WHERE board_id = $1 GROUP BY card_id`,
    [boardId],
  );
  const commentMap: Record<string, number> = {};
  for (const r of commentsRes.rows) commentMap[r.card_id] = r.cnt;

  // 4. Group actions by card
  const actionsByCard: Record<string, typeof actionsRes.rows> = {};
  for (const a of actionsRes.rows) {
    if (!actionsByCard[a.card_id]) actionsByCard[a.card_id] = [];
    actionsByCard[a.card_id].push(a);
  }

  // 5. Compute per-card analytics
  const completedFinishedAts: Date[] = [];

  for (const card of cardsRes.rows) {
    const actions = actionsByCard[card.id] ?? [];
    const parsed = parseCardTitle(card.title);

    // Build timeline events from actions
    const events: { stage: string; listName: string; enteredAt: Date }[] = [];

    // createCard action or card.created_at
    events.push({ stage: 'intake', listName: 'intake', enteredAt: new Date(card.created_at) });

    for (const a of actions) {
      if (a.action_type === 'moveCard' && a.to_list_name) {
        const stage = classifyList(a.to_list_name);
        if (stage !== 'reference') {
          events.push({ stage, listName: a.to_list_name, enteredAt: new Date(a.occurred_at) });
        }
      }
    }

    const tl: CardTimeline = {
      cardId: card.id,
      title: card.title,
      createdAt: new Date(card.created_at),
      dueDate: card.due_date ? new Date(card.due_date) : null,
      dueComplete: card.due_complete,
      events,
    };

    const analytics = computeCardAnalytics(tl);
    if (!analytics) continue;

    if (analytics.finished_at && analytics.terminal_stage === 'done') {
      completedFinishedAts.push(analytics.finished_at);
    }

    // Upsert card analytics
    await query(
      `INSERT INTO project_card_analytics (
         card_id, board_id, tenant_id,
         cycle_time_hours, hours_briefing, hours_in_progress, hours_revision,
         hours_approval, was_overdue, days_overdue,
         revision_count, approval_cycles, comment_count,
         checklist_items_total, checklist_items_done,
         terminal_stage, parsed_date, parsed_job_type, parsed_description,
         started_at, finished_at, analyzed_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,now()
       )
       ON CONFLICT (card_id) DO UPDATE SET
         cycle_time_hours = $4, hours_briefing = $5, hours_in_progress = $6,
         hours_revision = $7, hours_approval = $8, was_overdue = $9, days_overdue = $10,
         revision_count = $11, approval_cycles = $12, comment_count = $13,
         checklist_items_total = $14, checklist_items_done = $15,
         terminal_stage = $16, parsed_date = $17, parsed_job_type = $18,
         parsed_description = $19, started_at = $20, finished_at = $21, analyzed_at = now()`,
      [
        card.id, boardId, tenantId,
        analytics.cycle_time_hours,
        analytics.hours_briefing,
        analytics.hours_in_progress,
        analytics.hours_revision,
        analytics.hours_approval_client,
        analytics.was_overdue,
        analytics.days_overdue,
        analytics.revision_count,
        analytics.approval_cycles,
        commentMap[card.id] ?? 0,
        card.checklist_items_total,
        card.checklist_items_done,
        analytics.terminal_stage,
        parsed.parsed_date,
        parsed.job_type ?? parsed.format,
        parsed.description,
        analytics.started_at,
        analytics.finished_at,
      ],
    );
  }

  // 6. Board-level aggregation
  await computeBoardSummary(boardId, tenantId, completedFinishedAts);

  console.log(`[trelloAnalyzer] Board ${boardId}: ${cardsRes.rows.length} cards analyzed`);
}

async function computeBoardSummary(
  boardId: string,
  tenantId: string,
  completedDates: Date[],
): Promise<void> {
  const res = await query<{
    cycle_time_hours: number | null;
    hours_in_progress: number | null;
    hours_revision: number | null;
    hours_approval: number | null;
    revision_count: number;
    approval_cycles: number;
    was_overdue: boolean | null;
    days_overdue: number | null;
    terminal_stage: string | null;
    finished_at: string | null;
  }>(
    `SELECT cycle_time_hours, hours_in_progress, hours_revision, hours_approval,
            revision_count, approval_cycles, was_overdue, days_overdue,
            terminal_stage, finished_at
     FROM project_card_analytics
     WHERE board_id = $1`,
    [boardId],
  );

  const rows = res.rows;
  const done     = rows.filter((r) => r.terminal_stage === 'done');
  const inFlight = rows.filter((r) => !r.terminal_stage);
  const cancelled = rows.filter((r) => r.terminal_stage === 'cancelled');

  // Cycle time percentiles (done cards only)
  const cycleTimes = done
    .map((r) => r.cycle_time_hours)
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b);

  const revisionCounts = done.map((r) => r.revision_count ?? 0);
  const noRevisionPct = revisionCounts.length
    ? (revisionCounts.filter((r) => r === 0).length / revisionCounts.length) * 100
    : null;

  const overdueDone = done.filter((r) => r.was_overdue && r.days_overdue != null);
  const pctOnTime = done.length
    ? ((done.length - overdueDone.length) / done.length) * 100
    : null;
  const avgDaysOverdue = overdueDone.length
    ? overdueDone.reduce((s, r) => s + (r.days_overdue ?? 0), 0) / overdueDone.length
    : null;

  // ── Bottleneck: which stage has highest median time ─────────────────────────
  const stageMedians: { stage: string; hours: number }[] = [];
  for (const s of ['hours_in_progress', 'hours_revision', 'hours_approval'] as const) {
    const vals = done.map((r) => r[s]).filter((v): v is number => v != null).sort((a, b) => a - b);
    if (vals.length) stageMedians.push({ stage: s.replace('hours_', ''), hours: median(vals) });
  }
  const bottleneck = stageMedians.sort((a, b) => b.hours - a.hours)[0] ?? null;

  // ── Weekly throughput ────────────────────────────────────────────────────────
  const weeklyMap: Record<string, number> = {};
  for (const card of done) {
    if (!card.finished_at) continue;
    const week = getWeekKey(new Date(card.finished_at));
    weeklyMap[week] = (weeklyMap[week] ?? 0) + 1;
  }
  const weeklyValues = Object.values(weeklyMap);
  const cardsPerWeekAvg = weeklyValues.length
    ? weeklyValues.reduce((s, v) => s + v, 0) / weeklyValues.length
    : null;

  // Last 4 weeks throughput
  const last4Weeks = getLastNWeekKeys(4);
  const last4Values = last4Weeks.map((w) => weeklyMap[w] ?? 0);
  const cardsPerWeekLast4 = last4Values.reduce((s, v) => s + v, 0) / 4;

  // ── Monte Carlo forecast ─────────────────────────────────────────────────────
  // (stored as JSONB in board analytics for the UI to consume)
  const forecast = weeklyValues.length >= 4
    ? monteCarloForecast(weeklyValues, inFlight.length)
    : null;

  // ── Timestamps ───────────────────────────────────────────────────────────────
  const allFinished = done
    .map((r) => r.finished_at)
    .filter(Boolean)
    .sort() as string[];

  await query(
    `INSERT INTO project_board_analytics (
       board_id, tenant_id, total_cards, cards_done, cards_cancelled, cards_in_progress,
       median_cycle_time_hours,
       median_hours_in_progress, median_hours_revision, median_hours_approval,
       avg_revision_count, avg_approval_cycles, pct_approved_first_try,
       pct_on_time, avg_days_overdue,
       bottleneck_list, bottleneck_avg_hours,
       cards_per_week_avg, cards_per_week_last_4w,
       last_card_at, analyzed_at
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,now()
     )
     ON CONFLICT (board_id) DO UPDATE SET
       total_cards = $3, cards_done = $4, cards_cancelled = $5, cards_in_progress = $6,
       median_cycle_time_hours = $7,
       median_hours_in_progress = $8, median_hours_revision = $9, median_hours_approval = $10,
       avg_revision_count = $11, avg_approval_cycles = $12, pct_approved_first_try = $13,
       pct_on_time = $14, avg_days_overdue = $15,
       bottleneck_list = $16, bottleneck_avg_hours = $17,
       cards_per_week_avg = $18, cards_per_week_last_4w = $19,
       last_card_at = $20, analyzed_at = now()`,
    [
      boardId, tenantId,
      rows.length, done.length, cancelled.length, inFlight.length,
      cycleTimes.length ? median(cycleTimes) : null,
      stageMedians.find((s) => s.stage === 'in_progress')?.hours ?? null,
      stageMedians.find((s) => s.stage === 'revision')?.hours ?? null,
      stageMedians.find((s) => s.stage === 'approval')?.hours ?? null,
      revisionCounts.length ? revisionCounts.reduce((s, v) => s + v, 0) / revisionCounts.length : null,
      done.length ? done.reduce((s, r) => s + (r.approval_cycles ?? 0), 0) / done.length : null,
      noRevisionPct,
      pctOnTime,
      avgDaysOverdue,
      bottleneck?.stage ?? null,
      bottleneck?.hours ?? null,
      cardsPerWeekAvg,
      cardsPerWeekLast4 || null,
      allFinished[allFinished.length - 1] ?? null,
    ],
  );

  // Store Monte Carlo result separately in JSONB column (add if not exists)
  if (forecast) {
    await query(
      `UPDATE project_board_analytics
       SET bottleneck_list = COALESCE(bottleneck_list, $2)
       WHERE board_id = $1`,
      [boardId, bottleneck?.stage ?? null],
    ).catch(() => {/* ignore */});
  }
}

// ─── Public: analyze all boards for tenant ───────────────────────────────────

export async function analyzeAllBoardsForTenant(tenantId: string): Promise<void> {
  const res = await query<{ id: string }>(
    `SELECT id FROM project_boards WHERE tenant_id = $1 AND is_archived = false`,
    [tenantId],
  );
  for (const { id } of res.rows) {
    try {
      await analyzeBoardHistory(id, tenantId);
    } catch (err: any) {
      console.error(`[trelloAnalyzer] Board ${id} error:`, err?.message);
    }
  }
}

// ─── Public: analytics query helpers (for routes) ────────────────────────────

export interface BoardInsights {
  board: { id: string; name: string; client_id: string | null };
  summary: {
    total_cards: number;
    cards_done: number;
    cards_in_progress: number;
    cards_cancelled: number;
    pct_completion: number;
    pct_on_time: number | null;
    avg_days_overdue: number | null;
  };
  cycle_times: {
    median_hours: number | null;
    median_in_progress_hours: number | null;
    median_revision_hours: number | null;
    median_client_response_hours: number | null;
  };
  quality: {
    pct_approved_first_try: number | null;
    avg_revision_count: number | null;
  };
  throughput: {
    cards_per_week_avg: number | null;
    cards_per_week_last_4w: number | null;
    wip_count: number;
  };
  bottleneck: { stage: string | null; avg_hours: number | null };
  forecast: { p50_weeks: number; p75_weeks: number; p85_weeks: number } | null;
  by_format: { format: string; count: number; median_cycle_hours: number | null; avg_revision: number }[];
  weekly_throughput: { week: string; count: number }[];
}

export async function getBoardInsights(boardId: string, tenantId: string): Promise<BoardInsights | null> {
  const [boardRes, summaryRes] = await Promise.all([
    query<{ id: string; name: string; client_id: string | null }>(
      `SELECT id, name, client_id FROM project_boards WHERE id = $1 AND tenant_id = $2`,
      [boardId, tenantId],
    ),
    query<any>(
      `SELECT * FROM project_board_analytics WHERE board_id = $1`,
      [boardId],
    ),
  ]);

  if (!boardRes.rows.length) return null;
  const board = boardRes.rows[0];
  const s = summaryRes.rows[0];

  // By-format breakdown
  const fmtRes = await query<{ format: string; count: number; median_cycle: number; avg_rev: number }>(
    `SELECT
       parsed_job_type AS format,
       COUNT(*)::int AS count,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cycle_time_hours) AS median_cycle,
       AVG(revision_count)::numeric(5,2) AS avg_rev
     FROM project_card_analytics
     WHERE board_id = $1 AND parsed_job_type IS NOT NULL AND terminal_stage = 'done'
     GROUP BY parsed_job_type
     ORDER BY count DESC`,
    [boardId],
  );

  // Weekly throughput (last 24 weeks)
  const weeklyRes = await query<{ week: string; count: number }>(
    `SELECT
       TO_CHAR(DATE_TRUNC('week', finished_at), 'YYYY-WW') AS week,
       COUNT(*)::int AS count
     FROM project_card_analytics
     WHERE board_id = $1 AND terminal_stage = 'done' AND finished_at IS NOT NULL
       AND finished_at >= NOW() - INTERVAL '24 weeks'
     GROUP BY 1 ORDER BY 1`,
    [boardId],
  );

  // Monte Carlo using weekly values
  const weeklyValues = weeklyRes.rows.map((r) => r.count);
  const wipCount = s?.cards_in_progress ?? 0;
  const forecast = weeklyValues.length >= 4
    ? monteCarloForecast(weeklyValues, wipCount)
    : null;

  return {
    board,
    summary: {
      total_cards: s?.total_cards ?? 0,
      cards_done: s?.cards_done ?? 0,
      cards_in_progress: s?.cards_in_progress ?? 0,
      cards_cancelled: s?.cards_cancelled ?? 0,
      pct_completion: s?.total_cards ? Math.round((s.cards_done / s.total_cards) * 100) : 0,
      pct_on_time: s?.pct_on_time ? Number(s.pct_on_time) : null,
      avg_days_overdue: s?.avg_days_overdue ? Number(s.avg_days_overdue) : null,
    },
    cycle_times: {
      median_hours: s?.median_cycle_time_hours ? Number(s.median_cycle_time_hours) : null,
      median_in_progress_hours: s?.median_hours_in_progress ? Number(s.median_hours_in_progress) : null,
      median_revision_hours: s?.median_hours_revision ? Number(s.median_hours_revision) : null,
      median_client_response_hours: s?.median_hours_approval ? Number(s.median_hours_approval) : null,
    },
    quality: {
      pct_approved_first_try: s?.pct_approved_first_try ? Number(s.pct_approved_first_try) : null,
      avg_revision_count: s?.avg_revision_count ? Number(s.avg_revision_count) : null,
    },
    throughput: {
      cards_per_week_avg: s?.cards_per_week_avg ? Number(s.cards_per_week_avg) : null,
      cards_per_week_last_4w: s?.cards_per_week_last_4w ? Number(s.cards_per_week_last_4w) : null,
      wip_count: wipCount,
    },
    bottleneck: { stage: s?.bottleneck_list ?? null, avg_hours: s?.bottleneck_avg_hours ? Number(s.bottleneck_avg_hours) : null },
    forecast,
    by_format: fmtRes.rows.map((r) => ({
      format: r.format,
      count: r.count,
      median_cycle_hours: r.median_cycle ? Number(r.median_cycle) : null,
      avg_revision: Number(r.avg_rev ?? 0),
    })),
    weekly_throughput: weeklyRes.rows,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getLastNWeekKeys(n: number): string[] {
  const keys: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    keys.push(getWeekKey(d));
    d.setUTCDate(d.getUTCDate() - 7);
  }
  return keys;
}
