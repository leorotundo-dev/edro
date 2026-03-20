import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, requirePerm } from '../auth/rbac';
import {
  upsertTrelloConnector,
  listTrelloBoards,
  syncTrelloBoard,
  syncAllTrelloBoardsForTenant,
  getTrelloCredentials,
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

  // PATCH /trello/project-boards/:boardId/cards/:cardId — atualiza card + sync Trello
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

    if (sets.length) {
      sets.push(`updated_at = now()`);
      vals.push(cardId, tenantId);
      await query(
        `UPDATE project_cards SET ${sets.join(', ')} WHERE id = $${i} AND tenant_id = $${i + 1}`,
        vals,
      );
    }

    // Sync move/edit back to Trello
    if (body.list_id !== undefined || body.due_complete !== undefined || body.title !== undefined || body.is_archived !== undefined) {
      try {
        const creds = await getTrelloCredentials(tenantId);
        if (creds) {
          const { rows: cardRows } = await query<{ trello_card_id: string }>(
            `SELECT trello_card_id FROM project_cards WHERE id = $1 AND tenant_id = $2`,
            [cardId, tenantId]
          );
          const trelloCardId = cardRows[0]?.trello_card_id;

          if (trelloCardId) {
            const trelloUpdate: Record<string, string> = {};

            if (body.list_id !== undefined) {
              const { rows: listRows } = await query<{ trello_list_id: string }>(
                `SELECT trello_list_id FROM project_lists WHERE id = $1 AND tenant_id = $2`,
                [body.list_id, tenantId]
              );
              if (listRows[0]?.trello_list_id) trelloUpdate.idList = listRows[0].trello_list_id;
              if (body.position !== undefined) trelloUpdate.pos = String(body.position);
            }
            if (body.due_complete !== undefined) trelloUpdate.dueComplete = String(body.due_complete);
            if (body.title !== undefined) trelloUpdate.name = body.title;
            if (body.is_archived !== undefined) trelloUpdate.closed = String(body.is_archived);

            if (Object.keys(trelloUpdate).length) {
              const params = new URLSearchParams({ key: creds.apiKey, token: creds.apiToken, ...trelloUpdate });
              await fetch(`https://api.trello.com/1/cards/${trelloCardId}?${params}`, {
                method: 'PUT',
                signal: AbortSignal.timeout(8_000),
              });
            }
          }
        }
      } catch (err) {
        // Non-fatal — local update already applied
        console.warn('[trello] sync-back failed:', (err as any)?.message);
      }
    }

    return reply.send({ ok: true });
  });

  // POST /trello/project-boards/:boardId/cards — cria novo card (Edro + Trello)
  app.post('/trello/project-boards/:boardId/cards', { preHandler: authGuard }, async (request: any, reply) => {
    const { boardId } = request.params as { boardId: string };
    const tenantId = request.user?.tenant_id as string;

    const body = z.object({
      list_id: z.string().uuid(),
      title: z.string().min(1),
      due_date: z.string().nullable().optional(),
    }).parse(request.body);

    // Get list's trello_list_id and position for new card
    const { rows: listRows } = await query<{ trello_list_id: string; board_id: string }>(
      `SELECT trello_list_id, board_id FROM project_lists WHERE id = $1 AND tenant_id = $2`,
      [body.list_id, tenantId]
    );
    if (!listRows[0]) return reply.status(404).send({ error: 'Lista não encontrada.' });

    const { rows: posRows } = await query<{ max_pos: string }>(
      `SELECT COALESCE(MAX(position), 0) + 65536 AS max_pos FROM project_cards WHERE list_id = $1 AND tenant_id = $2 AND NOT is_archived`,
      [body.list_id, tenantId]
    );
    const position = parseFloat(posRows[0]?.max_pos ?? '65536');

    let trelloCardId: string | null = null;
    let trelloUrl: string | null = null;

    // Create in Trello if connected
    try {
      const creds = await getTrelloCredentials(tenantId);
      if (creds && listRows[0].trello_list_id) {
        const params = new URLSearchParams({
          key: creds.apiKey, token: creds.apiToken,
          idList: listRows[0].trello_list_id,
          name: body.title,
          pos: 'bottom',
          ...(body.due_date ? { due: body.due_date } : {}),
        });
        const res = await fetch(`https://api.trello.com/1/cards?${params}`, {
          method: 'POST',
          signal: AbortSignal.timeout(8_000),
        });
        if (res.ok) {
          const created = await res.json() as { id: string; shortUrl: string };
          trelloCardId = created.id;
          trelloUrl = created.shortUrl;
        }
      }
    } catch (err) {
      console.warn('[trello] create card on Trello failed:', (err as any)?.message);
    }

    // Insert locally
    const { rows: inserted } = await query<{ id: string }>(
      `INSERT INTO project_cards (board_id, list_id, tenant_id, title, position, due_date, trello_card_id, trello_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [boardId, body.list_id, tenantId, body.title, position, body.due_date ?? null, trelloCardId, trelloUrl]
    );

    return reply.send({ ok: true, card: { id: inserted[0].id, title: body.title, list_id: body.list_id } });
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

  // ── Operations Center feed — cards as OperationsJob[] ────────────────────

  function listNameToOpsStatus(name: string): string {
    const n = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (/bloqueado|blocked|impedido/.test(n)) return 'blocked';
    if (/conclu|done|fechad|arquivad|closed|finaliz|finish/.test(n)) return 'done';
    if (/publicad|entregue|delivered|published/.test(n)) return 'published';
    if (/aprovado\b/.test(n) && !/aguard|wait/.test(n)) return 'approved';
    if (/aprovacao|aprovação|aguard.*aprov|approval|waiting/.test(n)) return 'awaiting_approval';
    if (/revisao|revisão|review|revisar/.test(n)) return 'in_review';
    if (/producao|produção|andamento|in.?progress|fazendo|doing|execucao|execução/.test(n)) return 'in_progress';
    if (/alocad|allocated/.test(n)) return 'allocated';
    if (/pronto\b|ready\b/.test(n)) return 'ready';
    if (/planej|classif/.test(n)) return 'planned';
    return 'intake';
  }

  function computePriorityBand(dueDate: string | null, dueComplete: boolean): { band: string; score: number } {
    if (dueComplete) return { band: 'p4', score: 1 };
    if (!dueDate) return { band: 'p3', score: 5 };
    const diffHours = (new Date(dueDate).getTime() - Date.now()) / 3600000;
    if (diffHours <= 0) return { band: 'p0', score: 24 };
    if (diffHours <= 24) return { band: 'p0', score: 22 };
    if (diffHours <= 48) return { band: 'p1', score: 18 };
    if (diffHours <= 72) return { band: 'p1', score: 16 };
    if (diffHours <= 168) return { band: 'p2', score: 12 };
    return { band: 'p3', score: 6 };
  }

  // GET /trello/ops-feed — all active cards mapped to OperationsJob format
  app.get('/trello/ops-feed', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;

    const { rows: cards } = await query<{
      id: string; title: string; description: string | null;
      due_date: string | null; due_complete: boolean; labels: any;
      cover_color: string | null; trello_url: string | null; trello_card_id: string | null;
      list_id: string; list_name: string;
      board_id: string; board_name: string;
      client_id: string | null; client_name: string | null;
      client_logo_url: string | null; client_brand_color: string | null;
      owner_name: string | null; owner_email: string | null; owner_user_id: string | null;
    }>(
      `SELECT
         pc.id, pc.title, pc.description, pc.due_date, pc.due_complete, pc.labels,
         pc.cover_color, pc.trello_url, pc.trello_card_id,
         pl.id as list_id, pl.name as list_name,
         pb.id as board_id, pb.name as board_name,
         pb.client_id,
         cl.name as client_name,
         cl.logo_url as client_logo_url,
         cl.brand_color as client_brand_color,
         -- first assigned member
         (SELECT pcm.display_name FROM project_card_members pcm WHERE pcm.card_id = pc.id LIMIT 1) as owner_name,
         (SELECT pcm.email FROM project_card_members pcm WHERE pcm.card_id = pc.id LIMIT 1) as owner_email,
         (SELECT eu.id FROM project_card_members pcm JOIN edro_users eu ON LOWER(eu.email) = LOWER(pcm.email) WHERE pcm.card_id = pc.id LIMIT 1) as owner_user_id
       FROM project_cards pc
       JOIN project_lists pl ON pl.id = pc.list_id
       JOIN project_boards pb ON pb.id = pc.board_id
       LEFT JOIN clients cl ON cl.id::text = pb.client_id
       WHERE pc.tenant_id = $1 AND pc.is_archived = false AND pl.is_archived = false
       ORDER BY pc.due_date ASC NULLS LAST, pc.position ASC`,
      [tenantId],
    );

    const jobs = cards.map((c) => {
      const { band, score } = computePriorityBand(c.due_date, c.due_complete);
      const status = listNameToOpsStatus(c.list_name);
      const labels: { color: string; name: string }[] = Array.isArray(c.labels) ? c.labels : [];
      const labelNames = labels.map((l) => l.name?.toLowerCase() ?? '').join(' ');
      const jobType = /design|arte|artes|visual|criativo/.test(labelNames) ? 'design_static'
        : /video|vídeo|reels|stories/.test(labelNames) ? 'video_edit'
        : /reunion|meeting|reunião/.test(labelNames) ? 'meeting'
        : 'copy';

      return {
        id: c.id,
        title: c.title,
        summary: c.description ?? null,
        client_id: c.client_id ?? null,
        client_name: c.client_name ?? c.board_name,
        client_logo_url: c.client_logo_url ?? null,
        client_brand_color: c.client_brand_color ?? null,
        job_type: jobType,
        complexity: 'm' as const,
        channel: null,
        source: 'trello',
        status,
        priority_score: score,
        priority_band: band as 'p0' | 'p1' | 'p2' | 'p3' | 'p4',
        impact_level: 2,
        dependency_level: 2,
        required_skill: null,
        owner_id: c.owner_user_id ?? null,
        owner_name: c.owner_name ?? null,
        owner_email: c.owner_email ?? null,
        deadline_at: c.due_date ? `${c.due_date}T23:59:00` : null,
        estimated_minutes: null,
        actual_minutes: null,
        metadata: {
          trello_card_id: c.trello_card_id,
          trello_url: c.trello_url,
          board_id: c.board_id,
          board_name: c.board_name,
          list_id: c.list_id,
          list_name: c.list_name,
          labels,
          due_complete: c.due_complete,
        },
      };
    });

    // Owners: distinct members across all boards
    const { rows: members } = await query<{ display_name: string; email: string; user_id: string | null }>(
      `SELECT DISTINCT pcm.display_name, pcm.email,
              eu.id as user_id
       FROM project_card_members pcm
       JOIN project_boards pb ON pb.id = (
         SELECT board_id FROM project_cards WHERE id = pcm.card_id LIMIT 1
       )
       LEFT JOIN edro_users eu ON LOWER(eu.email) = LOWER(pcm.email)
       WHERE pb.tenant_id = $1`,
      [tenantId],
    );

    const owners = members
      .filter((m) => m.display_name)
      .map((m) => ({
        id: m.user_id ?? m.email,
        name: m.display_name,
        email: m.email ?? '',
        role: 'staff',
        specialty: null,
        person_type: 'freelancer' as const,
      }));

    // Clients
    const { rows: clientRows } = await query<{ id: string; name: string; logo_url: string | null; brand_color: string | null }>(
      `SELECT DISTINCT cl.id, cl.name, cl.logo_url, cl.brand_color
       FROM clients cl
       JOIN project_boards pb ON pb.client_id = cl.id::text
       WHERE pb.tenant_id = $1 AND pb.is_archived = false`,
      [tenantId],
    );

    return reply.send({
      jobs,
      owners,
      clients: clientRows,
    });
  });

  // POST /trello/ops-cards/:cardId/status — move card to best matching list
  app.post('/trello/ops-cards/:cardId/status', { preHandler: [authGuard] }, async (request: any, reply) => {
    const { cardId } = request.params as { cardId: string };
    const { status } = request.body as { status: string };
    const tenantId = request.user?.tenant_id as string;

    const { rows: cardRows } = await query<{ board_id: string; trello_card_id: string | null }>(
      `SELECT board_id, trello_card_id FROM project_cards WHERE id = $1 AND tenant_id = $2`,
      [cardId, tenantId],
    );
    if (!cardRows.length) return reply.status(404).send({ error: 'Card não encontrado.' });
    const { board_id, trello_card_id } = cardRows[0];

    // Find best matching list on the same board
    const { rows: lists } = await query<{ id: string; name: string; trello_list_id: string | null }>(
      `SELECT id, name, trello_list_id FROM project_lists WHERE board_id = $1 AND is_archived = false ORDER BY position`,
      [board_id],
    );

    const targetStatus = status.toLowerCase();
    // Score each list: higher = better match
    const scored = lists.map((l) => {
      const mapped = listNameToOpsStatus(l.name);
      return { ...l, score: mapped === targetStatus ? 10 : 0 };
    });
    const best = scored.sort((a, b) => b.score - a.score)[0];
    if (!best) return reply.status(400).send({ error: 'Nenhuma lista encontrada.' });

    // Update DB
    await query(
      `UPDATE project_cards SET list_id = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3`,
      [best.id, cardId, tenantId],
    );

    // Sync to Trello
    if (trello_card_id && best.trello_list_id) {
      try {
        const creds = await getTrelloCredentials(tenantId);
        if (creds) {
          await fetch(
            `https://api.trello.com/1/cards/${trello_card_id}?key=${creds.apiKey}&token=${creds.apiToken}&idList=${best.trello_list_id}`,
            { method: 'PUT', signal: AbortSignal.timeout(8_000) },
          );
        }
      } catch (err: any) {
        console.warn('[trello ops] status sync failed:', err?.message);
      }
    }

    // Return the updated card as OperationsJob shape
    const { rows: updated } = await query(
      `SELECT pc.id, pc.title, pc.due_date, pc.due_complete, pc.labels,
              pl.name as list_name, pb.name as board_name, pb.client_id,
              cl.name as client_name
       FROM project_cards pc
       JOIN project_lists pl ON pl.id = pc.list_id
       JOIN project_boards pb ON pb.id = pc.board_id
       LEFT JOIN clients cl ON cl.id::text = pb.client_id
       WHERE pc.id = $1`,
      [cardId],
    );
    if (!updated.length) return reply.send({ ok: true });
    const c = updated[0];
    const { band, score } = computePriorityBand(c.due_date, c.due_complete);
    return reply.send({
      ok: true,
      data: {
        id: c.id, title: c.title, status: listNameToOpsStatus(c.list_name),
        client_name: c.client_name ?? c.board_name, deadline_at: c.due_date ? `${c.due_date}T23:59:00` : null,
        source: 'trello', job_type: 'copy', complexity: 'm', impact_level: 2, dependency_level: 2,
        priority_band: band, priority_score: score,
        metadata: { board_name: c.board_name, list_name: c.list_name },
      },
    });
  });

  // ── Shared helper ─────────────────────────────────────────────────────────

  function _cardToJob(c: Record<string, any>): Record<string, any> {
    const { band, score } = computePriorityBand(c.due_date as string | null, c.due_complete as boolean);
    const status = listNameToOpsStatus(c.list_name as string);
    const labels: { color: string; name: string }[] = Array.isArray(c.labels) ? c.labels : [];
    const labelNames = labels.map((l) => (l.name?.toLowerCase() ?? '')).join(' ');
    const jobType = /design|arte|visual|criativo/.test(labelNames) ? 'design_static'
      : /video|vídeo|reels|stories/.test(labelNames) ? 'video_edit'
      : /reunion|meeting|reunião/.test(labelNames) ? 'meeting'
      : 'copy';
    return {
      id: c.id, title: c.title, summary: c.description ?? null,
      client_id: c.client_id ?? null, client_name: c.client_name ?? c.board_name,
      client_logo_url: c.client_logo_url ?? null, client_brand_color: c.client_brand_color ?? null,
      job_type: jobType, complexity: 'm', channel: null, source: 'trello', status,
      priority_score: score, priority_band: band, impact_level: 2, dependency_level: 2,
      required_skill: null,
      owner_id: c.owner_user_id ?? null,
      owner_name: c.owner_name ?? null,
      owner_email: c.owner_email ?? null,
      deadline_at: c.due_date ? `${c.due_date}T23:59:00` : null,
      estimated_minutes: null, actual_minutes: null,
      metadata: {
        trello_card_id: c.trello_card_id, trello_url: c.trello_url,
        board_id: c.board_id, board_name: c.board_name,
        list_id: c.list_id, list_name: c.list_name,
        labels, due_complete: c.due_complete,
      },
    };
  }

  // GET /trello/ops-planner — workload per Trello member for the Planner tab
  app.get('/trello/ops-planner', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;

    // One row per (card × member); cards without members appear once with null owner fields
    const { rows } = await query<Record<string, any>>(
      `SELECT
         pc.id, pc.title, pc.description, pc.due_date, pc.due_complete, pc.labels,
         pc.trello_url, pc.trello_card_id,
         pl.id as list_id, pl.name as list_name,
         pb.id as board_id, pb.name as board_name, pb.client_id,
         cl.name as client_name, cl.logo_url as client_logo_url, cl.brand_color as client_brand_color,
         pcm.display_name as owner_name, pcm.email as owner_email,
         eu.id as owner_user_id
       FROM project_cards pc
       JOIN project_lists pl ON pl.id = pc.list_id
       JOIN project_boards pb ON pb.id = pc.board_id
       LEFT JOIN clients cl ON cl.id::text = pb.client_id
       LEFT JOIN project_card_members pcm ON pcm.card_id = pc.id
       LEFT JOIN edro_users eu ON LOWER(eu.email) = LOWER(pcm.email)
       WHERE pc.tenant_id = $1 AND pc.is_archived = false AND pl.is_archived = false
       ORDER BY pc.due_date ASC NULLS LAST`,
      [tenantId],
    );

    const ownerMap = new Map<string, { name: string; email: string | null; user_id: string | null; jobs: Record<string, any>[] }>();
    const unassigned: Record<string, any>[] = [];
    const seenUnassigned = new Set<string>();

    for (const row of rows) {
      const job = _cardToJob(row);
      if (!row.owner_email) {
        if (!seenUnassigned.has(row.id as string)) {
          seenUnassigned.add(row.id as string);
          unassigned.push(job);
        }
        continue;
      }
      const key = (row.owner_user_id as string | null) ?? (row.owner_email as string);
      if (!ownerMap.has(key)) {
        ownerMap.set(key, {
          name: row.owner_name as string,
          email: row.owner_email as string,
          user_id: row.owner_user_id as string | null,
          jobs: [],
        });
      }
      ownerMap.get(key)!.jobs.push(job);
    }

    const ALLOCABLE = 960; // 16h/week heuristic
    const owners = Array.from(ownerMap.values()).map((m) => {
      const committed = m.jobs.length * 120; // 2h per card heuristic
      return {
        owner: {
          id: m.user_id ?? m.email ?? m.name,
          name: m.name,
          email: m.email,
          role: 'staff',
          specialty: null,
          person_type: 'freelancer' as const,
          freelancer_profile_id: null,
        },
        allocable_minutes: ALLOCABLE,
        committed_minutes: committed,
        tentative_minutes: 0,
        usage: Math.min(2, committed / ALLOCABLE),
        jobs: m.jobs,
      };
    });

    return reply.send({ data: { owners, unassigned_jobs: unassigned } });
  });

  // GET /trello/ops-calendar — cards grouped by due_date for the Agenda tab
  app.get('/trello/ops-calendar', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - 7);
    const windowEnd = new Date();
    windowEnd.setDate(windowEnd.getDate() + 28);

    const { rows } = await query<Record<string, any>>(
      `SELECT
         pc.id, pc.title, pc.description, pc.due_date, pc.due_complete, pc.labels,
         pc.trello_url, pc.trello_card_id,
         pl.id as list_id, pl.name as list_name,
         pb.id as board_id, pb.name as board_name, pb.client_id,
         cl.name as client_name, cl.logo_url as client_logo_url, cl.brand_color as client_brand_color,
         (SELECT pcm.display_name FROM project_card_members pcm WHERE pcm.card_id = pc.id LIMIT 1) as owner_name,
         (SELECT pcm.email FROM project_card_members pcm WHERE pcm.card_id = pc.id LIMIT 1) as owner_email,
         (SELECT eu.id FROM project_card_members pcm
          JOIN edro_users eu ON LOWER(eu.email) = LOWER(pcm.email)
          WHERE pcm.card_id = pc.id LIMIT 1) as owner_user_id
       FROM project_cards pc
       JOIN project_lists pl ON pl.id = pc.list_id
       JOIN project_boards pb ON pb.id = pc.board_id
       LEFT JOIN clients cl ON cl.id::text = pb.client_id
       WHERE pc.tenant_id = $1 AND pc.is_archived = false AND pl.is_archived = false
         AND pc.due_date BETWEEN $2::date AND $3::date
       ORDER BY pc.due_date ASC, pc.position ASC`,
      [tenantId, windowStart.toISOString().slice(0, 10), windowEnd.toISOString().slice(0, 10)],
    );

    const dayMap = new Map<string, Record<string, any>[]>();
    for (const row of rows) {
      const day = (row.due_date as string).slice(0, 10);
      if (!dayMap.has(day)) dayMap.set(day, []);
      dayMap.get(day)!.push(_cardToJob(row));
    }

    const days = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, jobs]) => ({ day, jobs, layerSummary: [] }));

    return reply.send({ data: { days } });
  });

  // GET /trello/ops-suggest-owner/:cardId — ranked list of best people for this card
  app.get('/trello/ops-suggest-owner/:cardId', { preHandler: [authGuard] }, async (request: any, reply) => {
    const { cardId } = request.params as { cardId: string };
    const tenantId = request.user?.tenant_id as string;

    // Card metadata (labels for specialty inference)
    const { rows: cardRows } = await query<{ labels: any; due_date: string | null }>(
      `SELECT pc.labels, pc.due_date FROM project_cards pc WHERE pc.id = $1 AND pc.tenant_id = $2`,
      [cardId, tenantId],
    );
    if (!cardRows.length) return reply.status(404).send({ error: 'Card não encontrado.' });

    const labels: { color: string; name: string }[] = Array.isArray(cardRows[0].labels) ? cardRows[0].labels : [];
    const labelText = labels.map((l) => l.name?.toLowerCase() ?? '').join(' ');
    const isDesign = /design|arte|artes|visual|criativo/.test(labelText);
    const isVideo = /video|vídeo|reels|stories/.test(labelText);

    // All distinct members who have ever worked on this tenant's boards
    const { rows: members } = await query<{ display_name: string; email: string; trello_member_id: string | null; user_id: string | null }>(
      `SELECT DISTINCT pcm.display_name, pcm.email, pcm.trello_member_id, eu.id as user_id
       FROM project_card_members pcm
       JOIN project_cards pc ON pc.id = pcm.card_id
       JOIN project_boards pb ON pb.id = pc.board_id
       LEFT JOIN edro_users eu ON LOWER(eu.email) = LOWER(pcm.email)
       WHERE pb.tenant_id = $1 AND pcm.email IS NOT NULL AND pcm.display_name IS NOT NULL`,
      [tenantId],
    );

    if (!members.length) return reply.send({ suggestions: [] });

    // Score each member
    const scored = await Promise.all(members.map(async (m) => {
      // 1. Current load — active cards (excluding the card being evaluated)
      const { rows: loadRows } = await query<{ count: string }>(
        `SELECT COUNT(*)::text as count
         FROM project_card_members pcm
         JOIN project_cards pc ON pc.id = pcm.card_id
         JOIN project_boards pb ON pb.id = pc.board_id
         WHERE LOWER(pcm.email) = LOWER($1) AND pb.tenant_id = $2
           AND pc.is_archived = false AND pc.id != $3`,
        [m.email, tenantId, cardId],
      );
      const activeCards = parseInt(loadRows[0]?.count ?? '0', 10);

      // 2. SLA history — last 90 days
      const { rows: slaRows } = await query<{ met: string; missed: string; total: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE pc.due_complete = true)::text as met,
           COUNT(*) FILTER (WHERE pc.due_date < now()::date AND pc.due_complete = false)::text as missed,
           COUNT(*)::text as total
         FROM project_card_members pcm
         JOIN project_cards pc ON pc.id = pcm.card_id
         JOIN project_boards pb ON pb.id = pc.board_id
         WHERE LOWER(pcm.email) = LOWER($1) AND pb.tenant_id = $2
           AND pc.due_date IS NOT NULL
           AND pc.due_date >= now()::date - interval '90 days'`,
        [m.email, tenantId],
      );
      const slaTotal = parseInt(slaRows[0]?.total ?? '0', 10);
      const slaMet   = parseInt(slaRows[0]?.met   ?? '0', 10);
      const slaRate  = slaTotal >= 3 ? Math.round((slaMet / slaTotal) * 100) : null;

      // Scores
      const loadScore = Math.max(0, 100 - activeCards * 18);   // 0 cards=100, 5≈10
      const slaScore  = slaRate ?? 70;                          // neutral default

      // Specialty inference: check if this person has done design/video cards
      let specialtyScore = 65; // neutral
      if (isDesign || isVideo) {
        const { rows: spRows } = await query<{ count: string }>(
          `SELECT COUNT(*)::text as count
           FROM project_card_members pcm
           JOIN project_cards pc ON pc.id = pcm.card_id
           JOIN project_boards pb ON pb.id = pc.board_id
           WHERE LOWER(pcm.email) = LOWER($1) AND pb.tenant_id = $2
             AND pc.labels::text ILIKE $3`,
          [m.email, tenantId, isDesign ? '%design%' : '%video%'],
        );
        const match = parseInt(spRows[0]?.count ?? '0', 10);
        specialtyScore = match >= 2 ? 90 : match === 1 ? 75 : 45;
      }

      const score = Math.round(loadScore * 0.45 + slaScore * 0.35 + specialtyScore * 0.20);

      const reasons: string[] = [];
      if (activeCards === 0) reasons.push('sem carga no momento');
      else reasons.push(`${activeCards} card${activeCards !== 1 ? 's' : ''} ativo${activeCards !== 1 ? 's' : ''}`);
      if (slaRate !== null) reasons.push(`${slaRate}% no prazo`);
      else reasons.push('sem histórico');

      return {
        display_name: m.display_name,
        email: m.email,
        trello_member_id: m.trello_member_id,
        user_id: m.user_id,
        active_cards: activeCards,
        sla_rate: slaRate,
        score,
        score_breakdown: { load: loadScore, sla: slaScore, specialty: specialtyScore },
        reason: reasons.join(' · '),
      };
    }));

    scored.sort((a, b) => b.score - a.score);
    return reply.send({ suggestions: scored.slice(0, 5) });
  });

  // POST /trello/ops-cards/:cardId/assign — assign member + sync to Trello
  app.post('/trello/ops-cards/:cardId/assign', { preHandler: [authGuard] }, async (request: any, reply) => {
    const { cardId } = request.params as { cardId: string };
    const { email } = request.body as { email: string };
    const tenantId = request.user?.tenant_id as string;

    const { rows: cardRows } = await query<{ trello_card_id: string | null }>(
      `SELECT trello_card_id FROM project_cards WHERE id = $1 AND tenant_id = $2`,
      [cardId, tenantId],
    );
    if (!cardRows.length) return reply.status(404).send({ error: 'Card não encontrado.' });
    const trelloCardId = cardRows[0].trello_card_id;

    // Find member's trello_member_id from existing records
    const { rows: memberRows } = await query<{ trello_member_id: string | null; display_name: string }>(
      `SELECT DISTINCT pcm.trello_member_id, pcm.display_name
       FROM project_card_members pcm
       JOIN project_cards pc ON pc.id = pcm.card_id
       JOIN project_boards pb ON pb.id = pc.board_id
       WHERE LOWER(pcm.email) = LOWER($1) AND pb.tenant_id = $2
       LIMIT 1`,
      [email, tenantId],
    );
    if (!memberRows.length) return reply.status(404).send({ error: 'Membro não encontrado no histórico de boards.' });

    const { trello_member_id, display_name } = memberRows[0];

    // Upsert into project_card_members
    await query(
      `INSERT INTO project_card_members (card_id, tenant_id, trello_member_id, display_name, email)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (card_id, trello_member_id) DO UPDATE SET display_name = $4, email = $5`,
      [cardId, tenantId, trello_member_id ?? email, display_name, email],
    );

    // Sync to Trello
    if (trelloCardId && trello_member_id) {
      try {
        const creds = await getTrelloCredentials(tenantId);
        if (creds) {
          const params = new URLSearchParams({ key: creds.apiKey, token: creds.apiToken, value: trello_member_id });
          await fetch(`https://api.trello.com/1/cards/${trelloCardId}/idMembers?${params}`, {
            method: 'POST',
            signal: AbortSignal.timeout(8_000),
          });
        }
      } catch (err: any) {
        console.warn('[trello] assign member sync failed:', err?.message);
      }
    }

    return reply.send({ ok: true, display_name, email });
  });

  // GET /trello/ops-sla — SLA metrics derived from due_date + due_complete
  app.get('/trello/ops-sla', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const { days: daysParam = '90' } = request.query as { days?: string };
    const periodDays = Math.max(1, Math.min(365, parseInt(daysParam, 10) || 90));

    const since = new Date();
    since.setDate(since.getDate() - periodDays);
    const now = new Date();

    const { rows: cards } = await query<Record<string, any>>(
      `SELECT
         pc.id, pc.title, pc.due_date, pc.due_complete,
         pb.client_id, cl.name as client_name,
         (SELECT pcm.display_name FROM project_card_members pcm WHERE pcm.card_id = pc.id LIMIT 1) as owner_name,
         (SELECT eu.id::text FROM project_card_members pcm
          JOIN edro_users eu ON LOWER(eu.email) = LOWER(pcm.email)
          WHERE pcm.card_id = pc.id LIMIT 1) as owner_user_id,
         (SELECT COUNT(*)::int FROM project_card_actions pca
          WHERE pca.card_id = pc.id AND pca.action_type = 'moveCard') as move_count
       FROM project_cards pc
       JOIN project_boards pb ON pb.id = pc.board_id
       LEFT JOIN clients cl ON cl.id::text = pb.client_id
       WHERE pc.tenant_id = $1
         AND pc.due_date IS NOT NULL
         AND pc.due_date >= $2::date
         AND pc.is_archived = false
       ORDER BY pc.due_date ASC`,
      [tenantId, since.toISOString().slice(0, 10)],
    );

    type ClientBucket = { client_id: string | null; client_name: string; met: number; missed: number; total: number; totalVariance: number };
    type OwnerBucket = { owner_id: string | null; owner_name: string; met: number; missed: number; total: number; totalVariance: number; totalRevisions: number };

    let met = 0, missed = 0, open = 0;
    let totalVarianceDays = 0, varianceCount = 0;
    const byClientMap = new Map<string, ClientBucket>();
    const byOwnerMap = new Map<string, OwnerBucket>();
    const worstMisses: Record<string, any>[] = [];

    for (const c of cards) {
      const dueDate = c.due_date ? new Date(c.due_date as string) : null;
      const isPast = dueDate && dueDate < now;
      let kind: 'met' | 'missed' | 'open';
      let varianceDays = 0;

      if (c.due_complete) {
        kind = 'met'; met++;
      } else if (isPast) {
        kind = 'missed'; missed++;
        varianceDays = dueDate ? Math.ceil((now.getTime() - dueDate.getTime()) / 86400000) : 0;
        if (varianceDays > 0) { totalVarianceDays += varianceDays; varianceCount++; }
        worstMisses.push({
          job_id: c.id, title: c.title,
          client_name: (c.client_name as string | null) ?? '—',
          owner_name: (c.owner_name as string | null) ?? '—',
          priority_band: computePriorityBand(c.due_date as string | null, false).band,
          deadline_at: c.due_date, completed_at: null,
          days_variance: varianceDays, revision_count: (c.move_count as number) ?? 0,
        });
      } else {
        kind = 'open'; open++;
      }

      const ck = (c.client_id as string | null) ?? '__no_client__';
      if (!byClientMap.has(ck)) {
        byClientMap.set(ck, { client_id: c.client_id as string | null, client_name: (c.client_name as string | null) ?? 'Sem cliente', met: 0, missed: 0, total: 0, totalVariance: 0 });
      }
      const cr = byClientMap.get(ck)!;
      if (kind !== 'open') { cr.total++; if (kind === 'met') cr.met++; else { cr.missed++; cr.totalVariance += varianceDays; } }

      if (c.owner_name) {
        const ok = (c.owner_user_id as string | null) ?? (c.owner_name as string);
        if (!byOwnerMap.has(ok)) {
          byOwnerMap.set(ok, { owner_id: c.owner_user_id as string | null, owner_name: c.owner_name as string, met: 0, missed: 0, total: 0, totalVariance: 0, totalRevisions: 0 });
        }
        const ob = byOwnerMap.get(ok)!;
        if (kind !== 'open') {
          ob.total++; if (kind === 'met') ob.met++; else { ob.missed++; ob.totalVariance += varianceDays; }
          ob.totalRevisions += (c.move_count as number) ?? 0;
        }
      }
    }

    const total = met + missed;
    const rate = total > 0 ? Math.round(met / total * 100) : null;

    return reply.send({
      data: {
        period_days: periodDays,
        overall: {
          met, missed, open, total, rate,
          avg_days_variance: varianceCount > 0 ? Math.round(totalVarianceDays / varianceCount * 10) / 10 : 0,
          avg_actual_minutes: 0,
          avg_estimated_minutes: 0,
        },
        by_client: Array.from(byClientMap.values())
          .filter((r) => r.total > 0)
          .map((r) => ({
            client_id: r.client_id, client_name: r.client_name,
            met: r.met, missed: r.missed, total: r.total,
            rate: r.total > 0 ? Math.round(r.met / r.total * 100) : null,
            avg_days_variance: r.missed > 0 ? Math.round(r.totalVariance / r.missed * 10) / 10 : 0,
          }))
          .sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0)),
        by_owner: Array.from(byOwnerMap.values())
          .filter((r) => r.total > 0)
          .map((r) => ({
            owner_id: r.owner_id, owner_name: r.owner_name,
            met: r.met, missed: r.missed, total: r.total,
            rate: r.total > 0 ? Math.round(r.met / r.total * 100) : null,
            avg_days_variance: r.missed > 0 ? Math.round(r.totalVariance / r.missed * 10) / 10 : 0,
            avg_revisions: r.total > 0 ? Math.round(r.totalRevisions / r.total * 10) / 10 : 0,
          }))
          .sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0)),
        worst_misses: worstMisses
          .sort((a, b) => (b.days_variance as number) - (a.days_variance as number))
          .slice(0, 10),
      },
    });
  });
}
