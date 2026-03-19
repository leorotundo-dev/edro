import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, requirePerm } from '../auth/rbac';
import {
  upsertTrelloConnector,
  listTrelloBoards,
  syncTrelloBoard,
  syncAllTrelloBoardsForTenant,
} from '../services/trelloSyncService';
import { getBoardInsights, analyzeAllBoardsForTenant, analyzeBoardHistory } from '../services/trelloHistoryAnalyzer';
import { query } from '../db';

export default async function trelloRoutes(app: FastifyInstance) {

  // POST /trello/connect — salva credenciais e valida
  app.post('/trello/connect', { preHandler: [authGuard, requirePerm('admin')] }, async (request: any, reply) => {
    const body = z.object({
      api_key: z.string().min(10),
      api_token: z.string().min(10),
    }).parse(request.body);

    const tenantId = request.user?.tenant_id as string;
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' });

    try {
      const info = await upsertTrelloConnector(tenantId, body.api_key, body.api_token);
      return reply.send({ ok: true, member_id: info.memberId, full_name: info.fullName });
    } catch (err: any) {
      return reply.status(400).send({ ok: false, error: err?.message ?? 'Credenciais inválidas.' });
    }
  });

  // GET /trello/connector — retorna status do conector
  app.get('/trello/connector', { preHandler: [authGuard, requirePerm('admin')] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const res = await query<{ member_id: string; is_active: boolean; last_synced_at: string }>(
      `SELECT member_id, is_active, last_synced_at FROM trello_connectors WHERE tenant_id = $1`,
      [tenantId],
    );
    if (!res.rows.length) return reply.send({ connected: false });
    return reply.send({ connected: true, ...res.rows[0] });
  });

  // DELETE /trello/connector — desconecta
  app.delete('/trello/connector', { preHandler: [authGuard, requirePerm('admin')] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    await query(`UPDATE trello_connectors SET is_active = false WHERE tenant_id = $1`, [tenantId]);
    return reply.send({ ok: true });
  });

  // GET /trello/boards — lista boards disponíveis no Trello (para mapear)
  app.get('/trello/boards', { preHandler: [authGuard, requirePerm('admin')] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    try {
      const boards = await listTrelloBoards(tenantId);
      return reply.send({ boards });
    } catch (err: any) {
      return reply.status(400).send({ error: err?.message ?? 'Erro ao listar boards.' });
    }
  });

  // POST /trello/boards/:trelloBoardId/sync — importa (ou re-sincroniza) um board
  app.post('/trello/boards/:trelloBoardId/sync', { preHandler: [authGuard, requirePerm('admin')] }, async (request: any, reply) => {
    const { trelloBoardId } = request.params as { trelloBoardId: string };
    const { client_id } = request.body as { client_id?: string };
    const tenantId = request.user?.tenant_id as string;

    try {
      const result = await syncTrelloBoard(tenantId, trelloBoardId, client_id);
      return reply.send({ ok: true, ...result });
    } catch (err: any) {
      return reply.status(500).send({ ok: false, error: err?.message ?? 'Erro na sincronização.' });
    }
  });

  // POST /trello/sync-all — re-sincroniza todos os boards mapeados do tenant
  app.post('/trello/sync-all', { preHandler: [authGuard, requirePerm('admin')] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    try {
      void syncAllTrelloBoardsForTenant(tenantId); // fire and forget — pode demorar
      return reply.send({ ok: true, message: 'Sincronização iniciada em background.' });
    } catch (err: any) {
      return reply.status(500).send({ ok: false, error: err?.message });
    }
  });

  // GET /trello/sync-log — últimas sincronizações
  app.get('/trello/sync-log', { preHandler: [authGuard, requirePerm('admin')] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const res = await query<any>(
      `SELECT l.id, l.trello_board_id, l.status, l.cards_synced, l.actions_synced,
              l.error_message, l.started_at, l.finished_at,
              b.name AS board_name
       FROM trello_sync_log l
       LEFT JOIN project_boards b ON b.id = l.board_id
       WHERE l.tenant_id = $1
       ORDER BY l.created_at DESC
       LIMIT 30`,
      [tenantId],
    );
    return reply.send({ logs: res.rows });
  });

  // GET /trello/project-boards — boards já importados no Edro
  app.get('/trello/project-boards', { preHandler: authGuard }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const { client_id } = request.query as { client_id?: string };

    const res = await query<any>(
      `SELECT b.id, b.name, b.description, b.color, b.client_id, b.trello_board_id, b.last_synced_at,
              b.is_archived, b.created_at,
              COUNT(c.id)::int AS card_count
       FROM project_boards b
       LEFT JOIN project_cards c ON c.board_id = b.id AND c.is_archived = false
       WHERE b.tenant_id = $1
         AND b.is_archived = false
         AND ($2::text IS NULL OR b.client_id = $2)
       GROUP BY b.id
       ORDER BY b.updated_at DESC`,
      [tenantId, client_id ?? null],
    );
    return reply.send({ boards: res.rows });
  });

  // GET /trello/project-boards/:boardId — board completo com listas + cards
  app.get('/trello/project-boards/:boardId', { preHandler: authGuard }, async (request: any, reply) => {
    const { boardId } = request.params as { boardId: string };
    const tenantId = request.user?.tenant_id as string;

    // Board
    const boardRes = await query<any>(
      `SELECT * FROM project_boards WHERE id = $1 AND tenant_id = $2`,
      [boardId, tenantId],
    );
    if (!boardRes.rows.length) return reply.status(404).send({ error: 'Board não encontrado.' });

    // Lists
    const listsRes = await query<any>(
      `SELECT * FROM project_lists WHERE board_id = $1 ORDER BY position ASC`,
      [boardId],
    );

    // Cards with members
    const cardsRes = await query<any>(
      `SELECT c.*,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', m.id,
                    'display_name', m.display_name,
                    'avatar_url', m.avatar_url,
                    'freelancer_id', m.freelancer_id
                  )
                ) FILTER (WHERE m.id IS NOT NULL),
                '[]'
              ) AS members
       FROM project_cards c
       LEFT JOIN project_card_members m ON m.card_id = c.id
       WHERE c.board_id = $1
       GROUP BY c.id
       ORDER BY c.position ASC`,
      [boardId],
    );

    // Group cards by list
    const cardsByList: Record<string, any[]> = {};
    for (const card of cardsRes.rows) {
      if (!cardsByList[card.list_id]) cardsByList[card.list_id] = [];
      cardsByList[card.list_id].push(card);
    }

    const lists = listsRes.rows.map((l: any) => ({
      ...l,
      cards: cardsByList[l.id] ?? [],
    }));

    return reply.send({ board: { ...boardRes.rows[0], lists } });
  });

  // GET /trello/project-boards/:boardId/cards/:cardId — card com checklists + comentários
  app.get('/trello/project-boards/:boardId/cards/:cardId', { preHandler: authGuard }, async (request: any, reply) => {
    const { cardId } = request.params as { boardId: string; cardId: string };
    const tenantId = request.user?.tenant_id as string;

    const cardRes = await query<any>(
      `SELECT * FROM project_cards WHERE id = $1 AND tenant_id = $2`,
      [cardId, tenantId],
    );
    if (!cardRes.rows.length) return reply.status(404).send({ error: 'Card não encontrado.' });

    const [membersRes, checklistsRes, commentsRes] = await Promise.all([
      query<any>(`SELECT * FROM project_card_members WHERE card_id = $1`, [cardId]),
      query<any>(`SELECT * FROM project_card_checklists WHERE card_id = $1 ORDER BY created_at ASC`, [cardId]),
      query<any>(`SELECT * FROM project_card_comments WHERE card_id = $1 ORDER BY commented_at DESC LIMIT 100`, [cardId]),
    ]);

    return reply.send({
      card: {
        ...cardRes.rows[0],
        members: membersRes.rows,
        checklists: checklistsRes.rows,
        comments: commentsRes.rows,
      },
    });
  });

  // PATCH /trello/project-boards/:boardId/cards/:cardId — atualiza card (nativo, sem Trello)
  app.patch('/trello/project-boards/:boardId/cards/:cardId', { preHandler: authGuard }, async (request: any, reply) => {
    const { cardId } = request.params as { boardId: string; cardId: string };
    const tenantId = request.user?.tenant_id as string;

    const body = z.object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      list_id: z.string().uuid().optional(),
      due_date: z.string().nullable().optional(),
      due_complete: z.boolean().optional(),
      position: z.number().optional(),
      labels: z.array(z.object({ color: z.string(), name: z.string() })).optional(),
      is_archived: z.boolean().optional(),
    }).parse(request.body);

    const sets: string[] = [];
    const vals: any[] = [];
    let i = 1;

    for (const [key, val] of Object.entries(body)) {
      if (val !== undefined) {
        sets.push(`${key} = $${i++}`);
        vals.push(key === 'labels' ? JSON.stringify(val) : val);
      }
    }

    if (!sets.length) return reply.send({ ok: true });

    sets.push(`updated_at = now()`);
    vals.push(cardId, tenantId);

    await query(
      `UPDATE project_cards SET ${sets.join(', ')} WHERE id = $${i} AND tenant_id = $${i + 1}`,
      vals,
    );

    return reply.send({ ok: true });
  });

  // ── Analytics ──────────────────────────────────────────────────────────────

  // GET /trello/project-boards/:boardId/insights — full analytics for a board
  app.get('/trello/project-boards/:boardId/insights', { preHandler: authGuard }, async (request: any, reply) => {
    const { boardId } = request.params as { boardId: string };
    const tenantId = request.user?.tenant_id as string;

    const insights = await getBoardInsights(boardId, tenantId);
    if (!insights) return reply.status(404).send({ error: 'Board não encontrado.' });

    return reply.send({ insights });
  });

  // POST /trello/project-boards/:boardId/analyze — trigger analysis on-demand
  app.post('/trello/project-boards/:boardId/analyze', { preHandler: [authGuard, requirePerm('admin')] }, async (request: any, reply) => {
    const { boardId } = request.params as { boardId: string };
    const tenantId = request.user?.tenant_id as string;

    try {
      void analyzeBoardHistory(boardId, tenantId); // async, fire & forget
      return reply.send({ ok: true, message: 'Análise iniciada.' });
    } catch (err: any) {
      return reply.status(500).send({ ok: false, error: err?.message });
    }
  });

  // POST /trello/analyze-all — re-analyze all boards (admin trigger)
  app.post('/trello/analyze-all', { preHandler: [authGuard, requirePerm('admin')] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    void analyzeAllBoardsForTenant(tenantId);
    return reply.send({ ok: true, message: 'Análise iniciada para todos os boards.' });
  });

  // GET /trello/insights/overview — cross-board summary for all clients
  app.get('/trello/insights/overview', { preHandler: [authGuard, requirePerm('admin')] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;

    const res = await query<any>(
      `SELECT
         b.id AS board_id, b.name AS board_name, b.client_id,
         ba.total_cards, ba.cards_done, ba.cards_in_progress,
         ba.median_cycle_time_hours,
         ba.pct_on_time,
         ba.pct_approved_first_try,
         ba.avg_revision_count,
         ba.cards_per_week_avg,
         ba.cards_per_week_last_4w,
         ba.bottleneck_list,
         ba.bottleneck_avg_hours,
         ba.analyzed_at
       FROM project_boards b
       JOIN project_board_analytics ba ON ba.board_id = b.id
       WHERE b.tenant_id = $1 AND b.is_archived = false
       ORDER BY ba.cards_done DESC`,
      [tenantId],
    );

    // Cross-board aggregates
    const rows = res.rows;
    const totalDone    = rows.reduce((s: number, r: any) => s + (r.cards_done ?? 0), 0);
    const totalInFlight = rows.reduce((s: number, r: any) => s + (r.cards_in_progress ?? 0), 0);
    const avgCycleMins = rows.filter((r: any) => r.median_cycle_time_hours)
      .map((r: any) => Number(r.median_cycle_time_hours));
    const overallMedianCycle = avgCycleMins.length
      ? avgCycleMins.sort((a: number, b: number) => a - b)[Math.floor(avgCycleMins.length / 2)]
      : null;

    return reply.send({
      boards: rows,
      aggregate: {
        total_boards: rows.length,
        total_cards_done: totalDone,
        total_cards_in_flight: totalInFlight,
        overall_median_cycle_hours: overallMedianCycle,
      },
    });
  });

  // ── Production Calendar overlay ────────────────────────────────────────────

  // GET /trello/calendar — all cards with due_date in range, for the calendar overlay
  app.get('/trello/calendar', { preHandler: authGuard }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const { month, start, end } = request.query as { month?: string; start?: string; end?: string };

    let startDate: string;
    let endDate: string;

    if (month) {
      const [yr, mn] = month.split('-').map(Number);
      // Expand range by ±7 days to cover calendar grid overflow
      const d1 = new Date(yr, mn - 1, 1);
      d1.setDate(d1.getDate() - 7);
      const d2 = new Date(yr, mn, 0);
      d2.setDate(d2.getDate() + 7);
      startDate = d1.toISOString().slice(0, 10);
      endDate = d2.toISOString().slice(0, 10);
    } else if (start && end) {
      startDate = start;
      endDate = end;
    } else {
      return reply.status(400).send({ error: 'Provide ?month=YYYY-MM or ?start=&end=' });
    }

    const res = await query<any>(
      `SELECT
         c.id, c.title, c.due_date::text, c.due_complete, c.labels, c.trello_url,
         c.is_archived,
         l.name AS stage_name,
         b.id AS board_id, b.name AS board_name, b.client_id,
         ca.parsed_job_type AS format,
         ca.parsed_description,
         ca.terminal_stage
       FROM project_cards c
       JOIN project_lists l ON l.id = c.list_id
       JOIN project_boards b ON b.id = c.board_id
       LEFT JOIN project_card_analytics ca ON ca.card_id = c.id
       WHERE b.tenant_id = $1
         AND c.due_date BETWEEN $2::date AND $3::date
         AND c.is_archived = false
       ORDER BY c.due_date ASC, b.name ASC`,
      [tenantId, startDate, endDate],
    );

    const now = new Date();

    // Classify list → stage string
    const STAGE_KEYWORDS: [string, string][] = [
      ['reference', 'INSTITUCIONAL,ASSETS,MATERIAIS,ACESSO,BANCO,CRONOGRAMA,KV'],
      ['done',      'FINALIZADO,CONCLUÍDO,DONE,PUBLICADO,ENTREGUE'],
      ['cancelled', 'CANCELADO,DESCARTADO'],
      ['blocked',   'PARADO,BLOQUEADO'],
      ['approval_client', 'APROVAÇÃO,POST APROVAÇÃO,AGUARDANDO'],
      ['approval_internal', 'APROVAÇÃO INTERNA,INTERNO'],
      ['revision',  'ALTERAÇÃO,REVISÃO,AJUSTE,EDIÇÃO,CORREÇÃO'],
      ['scheduled', 'AGENDADO,PROGRAMADO'],
      ['in_progress','ANDAMENTO,PRODUÇÃO,FAZENDO'],
      ['intake',    'NOVO BRIEFING,NOVO POST,BRIEFING,SOLICITAÇÃO'],
    ];

    function classifyStage(listName: string): string {
      const upper = (listName ?? '').toUpperCase();
      for (const [stage, keywords] of STAGE_KEYWORDS) {
        if (keywords.split(',').some((k) => upper.includes(k))) return stage;
      }
      return 'unknown';
    }

    // Parse display title from "DDMMYY_Client_Platform_Format_Desc"
    function parseDisplayTitle(raw: string): { display: string; platform: string | null } {
      const parts = raw.split('_');
      const PLATFORMS = ['INSTAGRAM', 'LINKEDIN', 'STORIES', 'REELS', 'FACEBOOK', 'TIKTOK'];
      const FORMATS = ['ESTÁTICO', 'ESTATICO', 'CARROSSEL', 'VIDEO', 'REELS'];
      let platform: string | null = null;
      let format: string | null = null;
      const descParts: string[] = [];
      for (let i = 0; i < parts.length; i++) {
        const up = parts[i].toUpperCase().trim();
        if (i === 0 && /^\d{6}$/.test(parts[i].trim())) continue; // date prefix
        if (i === 1 && /^\d{6}$/.test(parts[0]?.trim() ?? '')) continue; // client name
        if (!platform && PLATFORMS.some((p) => up.includes(p))) { platform = parts[i].trim(); continue; }
        if (!format && FORMATS.some((f) => up.includes(f))) { format = parts[i].trim(); continue; }
        if (['JOB', 'CAMPANHA', 'POST', 'BRIEFING'].includes(up)) continue;
        descParts.push(parts[i]);
      }
      const desc = descParts.join(' ').trim();
      const display = [platform, format, desc].filter(Boolean).join(' · ') || raw;
      return { display, platform };
    }

    // Build board color index (stable order)
    const boardOrder: string[] = [];
    const boardMeta: Record<string, { name: string; client_id: string | null }> = {};
    for (const r of res.rows) {
      if (!boardOrder.includes(r.board_id)) {
        boardOrder.push(r.board_id);
        boardMeta[r.board_id] = { name: r.board_name, client_id: r.client_id };
      }
    }

    const cards = res.rows.map((r: any) => {
      const dueDate = new Date(r.due_date);
      const terminalDone = r.terminal_stage === 'done' || r.due_complete;
      const stageClass = classifyStage(r.stage_name ?? '');
      const isOverdue = !terminalDone && dueDate < now && stageClass !== 'cancelled';
      const { display, platform } = parseDisplayTitle(r.title);
      return {
        id: r.id,
        raw_title: r.title,
        display_title: display,
        due_date: r.due_date,
        due_complete: r.due_complete,
        is_overdue: isOverdue,
        stage_name: r.stage_name,
        stage_class: stageClass,
        board_id: r.board_id,
        board_name: r.board_name,
        client_id: r.client_id,
        platform,
        format: r.format,
        trello_url: r.trello_url,
        labels: r.labels ?? [],
        color_index: boardOrder.indexOf(r.board_id),
      };
    });

    const boards = boardOrder.map((id, idx) => ({
      id,
      name: boardMeta[id].name,
      client_id: boardMeta[id].client_id,
      color_index: idx,
    }));

    return reply.send({ cards, boards });
  });
}
