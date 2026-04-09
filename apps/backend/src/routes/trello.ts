import { FastifyInstance, FastifyRequest } from 'fastify';

/** Authenticated request — user payload injected by authGuard */
type TR = FastifyRequest & { user?: { tenant_id: string; sub?: string; id?: string } };
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
import { stripTrelloTitle, normalizeTrelloLabels, normalizeTrelloAttachments, inferJobTypeFromLabels } from '../services/trelloCardMapper';
import { query } from '../db';

function normalizeBoardBindingKey(value?: string | null) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getBoardBindingScore(clientKey: string, boardKey: string) {
  if (!clientKey || !boardKey) return 0;
  if (clientKey === boardKey) return 3;
  if (boardKey.includes(clientKey) || clientKey.includes(boardKey)) return 2;
  return 0;
}

function currentYearCardClause(alias: string) {
  return `COALESCE(${alias}.due_date::timestamp, ${alias}.created_at) >= date_trunc('year', CURRENT_DATE)
          AND COALESCE(${alias}.due_date::timestamp, ${alias}.created_at) < (date_trunc('year', CURRENT_DATE) + interval '1 year')`;
}

export default async function trelloRoutes(app: FastifyInstance) {

  // POST /trello/connect — salva credenciais e valida
  app.post('/trello/connect', { preHandler: [authGuard, requirePerm('admin')] }, async (request: TR, reply) => {
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
  app.get('/trello/connector', { preHandler: [authGuard, requirePerm('admin')] }, async (request: TR, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const res = await query<{ member_id: string; is_active: boolean; last_synced_at: string }>(
      `SELECT member_id, is_active, last_synced_at FROM trello_connectors WHERE tenant_id = $1`,
      [tenantId],
    );
    if (!res.rows.length) return reply.send({ connected: false });
    return reply.send({ connected: true, ...res.rows[0] });
  });

  // DELETE /trello/connector — desconecta
  app.delete('/trello/connector', { preHandler: [authGuard, requirePerm('admin')] }, async (request: TR, reply) => {
    const tenantId = request.user?.tenant_id as string;
    await query(`UPDATE trello_connectors SET is_active = false WHERE tenant_id = $1`, [tenantId]);
    return reply.send({ ok: true });
  });

  // GET /trello/boards — lista boards disponíveis no Trello (para mapear)
  app.get('/trello/boards', { preHandler: [authGuard, requirePerm('admin')] }, async (request: TR, reply) => {
    const tenantId = request.user?.tenant_id as string;
    try {
      const boards = await listTrelloBoards(tenantId);
      return reply.send({ boards });
    } catch (err: any) {
      return reply.status(400).send({ error: err?.message ?? 'Erro ao listar boards.' });
    }
  });

  // POST /trello/boards/:trelloBoardId/sync — importa (ou re-sincroniza) um board
  app.post('/trello/boards/:trelloBoardId/sync', { preHandler: [authGuard, requirePerm('admin')] }, async (request: TR, reply) => {
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
  app.post('/trello/sync-all', { preHandler: [authGuard, requirePerm('admin')] }, async (request: TR, reply) => {
    const tenantId = request.user?.tenant_id as string;
    try {
      void syncAllTrelloBoardsForTenant(tenantId); // fire and forget — pode demorar
      return reply.send({ ok: true, message: 'Sincronização iniciada em background.' });
    } catch (err: any) {
      return reply.status(500).send({ ok: false, error: err?.message });
    }
  });

  // GET /trello/sync-log — últimas sincronizações
  app.get('/trello/sync-log', { preHandler: [authGuard, requirePerm('admin')] }, async (request: TR, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const res = await query<Record<string, any>>(
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
  app.get('/trello/project-boards', { preHandler: authGuard }, async (request: TR, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const { client_id } = request.query as { client_id?: string };

    const fetchBoards = async (linkedClientId?: string | null) => query<Record<string, any>>(
      `SELECT b.id, b.name, b.description, b.color, b.client_id, b.trello_board_id, b.last_synced_at,
              b.is_archived, b.created_at,
              COUNT(c.id)::int AS card_count,
              (SELECT COUNT(*)::int
               FROM project_cards pc
               JOIN project_lists pl ON pl.id = pc.list_id
               WHERE pc.board_id = b.id AND pc.is_archived = false
                 AND ${currentYearCardClause('pc')}
                 AND (UPPER(pl.name) LIKE '%ANDAMENTO%'
                      OR UPPER(pl.name) LIKE '%PRODUÇÃO%'
                      OR UPPER(pl.name) LIKE '%FAZENDO%'
                      OR UPPER(pl.name) LIKE '%EXECUÇÃO%')
              ) AS in_progress_count
       FROM project_boards b
       LEFT JOIN project_cards c
         ON c.board_id = b.id
        AND c.is_archived = false
        AND ${currentYearCardClause('c')}
       WHERE b.tenant_id = $1
         AND b.is_archived = false
         AND ($2::text IS NULL OR b.client_id = $2)
       GROUP BY b.id
       ORDER BY b.updated_at DESC`,
      [tenantId, linkedClientId ?? null],
    );

    let res = await fetchBoards(client_id ?? null);
    if (res.rows.length || !client_id) {
      return reply.send({ boards: res.rows });
    }

    const clientRes = await query<{ name: string }>(
      `SELECT name FROM clients WHERE id = $1::uuid AND tenant_id = $2 LIMIT 1`,
      [client_id, tenantId],
    );
    const clientName = clientRes.rows[0]?.name;
    const clientKey = normalizeBoardBindingKey(clientName);

    if (!clientKey) {
      return reply.send({ boards: res.rows });
    }

    const unlinkedBoardsRes = await query<{ id: string; name: string }>(
      `SELECT id, name
       FROM project_boards
       WHERE tenant_id = $1
         AND is_archived = false
         AND (client_id IS NULL OR client_id = '')`,
      [tenantId],
    );

    const candidates = unlinkedBoardsRes.rows
      .map((board) => ({
        id: board.id,
        score: getBoardBindingScore(clientKey, normalizeBoardBindingKey(board.name)),
      }))
      .filter((board) => board.score > 0)
      .sort((a, b) => b.score - a.score);

    const bestCandidate = candidates[0];
    const hasTie = bestCandidate
      ? candidates.filter((candidate) => candidate.score === bestCandidate.score).length > 1
      : false;

    if (!bestCandidate || hasTie) {
      return reply.send({ boards: res.rows });
    }

    await query(
      `UPDATE project_boards
       SET client_id = $1, updated_at = now()
       WHERE id = $2 AND tenant_id = $3 AND (client_id IS NULL OR client_id = '')`,
      [client_id, bestCandidate.id, tenantId],
    );

    res = await fetchBoards(client_id);
    return reply.send({ boards: res.rows });
  });

  // PATCH /trello/project-boards/:boardId — vincula/desvincula um board a um cliente
  app.patch('/trello/project-boards/:boardId', { preHandler: [authGuard] }, async (request: TR, reply) => {
    const { boardId } = request.params as { boardId: string };
    const tenantId = request.user?.tenant_id as string;
    const { client_id } = request.body as { client_id?: string | null };

    await query(
      `UPDATE project_boards SET client_id = $1, updated_at = now()
       WHERE id = $2 AND tenant_id = $3`,
      [client_id ?? null, boardId, tenantId],
    );

    return reply.send({ ok: true });
  });

  // GET /trello/project-boards/:boardId — board completo com listas + cards
  app.get('/trello/project-boards/:boardId', { preHandler: authGuard }, async (request: TR, reply) => {
    const { boardId } = request.params as { boardId: string };
    const tenantId = request.user?.tenant_id as string;

    // Board
    const boardRes = await query<Record<string, any>>(
      `SELECT * FROM project_boards WHERE id = $1 AND tenant_id = $2`,
      [boardId, tenantId],
    );
    if (!boardRes.rows.length) return reply.status(404).send({ error: 'Board não encontrado.' });

    // Lists
    const listsRes = await query<Record<string, any>>(
      `SELECT * FROM project_lists WHERE board_id = $1 ORDER BY position ASC`,
      [boardId],
    );

    // Cards with members
    const cardsRes = await query<Record<string, any>>(
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
         AND ${currentYearCardClause('c')}
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
  app.get('/trello/project-boards/:boardId/cards/:cardId', { preHandler: authGuard }, async (request: TR, reply) => {
    const { cardId } = request.params as { boardId: string; cardId: string };
    const tenantId = request.user?.tenant_id as string;

    const cardRes = await query<Record<string, any>>(
      `SELECT * FROM project_cards WHERE id = $1 AND tenant_id = $2`,
      [cardId, tenantId],
    );
    if (!cardRes.rows.length) return reply.status(404).send({ error: 'Card não encontrado.' });

    const [membersRes, checklistsRes, commentsRes] = await Promise.all([
      query<Record<string, any>>(`SELECT * FROM project_card_members WHERE card_id = $1`, [cardId]),
      query<Record<string, any>>(`SELECT * FROM project_card_checklists WHERE card_id = $1 ORDER BY created_at ASC`, [cardId]),
      query<Record<string, any>>(`SELECT * FROM project_card_comments WHERE card_id = $1 ORDER BY commented_at DESC LIMIT 100`, [cardId]),
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
  app.patch('/trello/project-boards/:boardId/cards/:cardId', { preHandler: authGuard }, async (request: TR, reply) => {
    const { cardId } = request.params as { boardId: string; cardId: string };
    const tenantId = request.user?.tenant_id as string;

    const body = z.object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      list_id: z.string().uuid().optional(),
      due_date: z.string().nullable().optional(),
      due_complete: z.boolean().optional(),
      start_date: z.string().nullable().optional(),
      priority: z.enum(['urgent', 'high', 'normal', 'low']).optional(),
      estimated_hours: z.number().positive().nullable().optional(),
      parent_card_id: z.string().uuid().nullable().optional(),
      position: z.number().optional(),
      labels: z.array(z.object({ color: z.string(), name: z.string() })).optional(),
      is_archived: z.boolean().optional(),
    }).parse(request.body);

    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;

    // Fields that map directly to columns
    const directFields = ['title', 'description', 'list_id', 'due_date', 'due_complete', 'start_date',
      'priority', 'estimated_hours', 'parent_card_id', 'position', 'labels', 'is_archived'] as const;

    for (const key of directFields) {
      const val = (body as Record<string, unknown>)[key];
      if (val !== undefined) {
        sets.push(`${key} = $${i++}`);
        vals.push(key === 'labels' ? JSON.stringify(val) : val);
      }
    }

    // Auto-set completed_at when marking done
    if (body.due_complete === true) {
      sets.push(`completed_at = COALESCE(completed_at, now())`);
    } else if (body.due_complete === false) {
      sets.push(`completed_at = NULL`);
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
    if (
      body.list_id !== undefined ||
      body.position !== undefined ||
      body.due_complete !== undefined ||
      body.due_date !== undefined ||
      body.description !== undefined ||
      body.title !== undefined ||
      body.is_archived !== undefined
    ) {
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
            }
            if (body.position !== undefined) trelloUpdate.pos = String(body.position);
            if (body.due_complete !== undefined) trelloUpdate.dueComplete = String(body.due_complete);
            if (body.due_date !== undefined) trelloUpdate.due = toTrelloDueValue(body.due_date);
            if (body.description !== undefined) trelloUpdate.desc = body.description ?? '';
            if (body.title !== undefined) trelloUpdate.name = body.title;
            if (body.is_archived !== undefined) trelloUpdate.closed = String(body.is_archived);

            if (Object.keys(trelloUpdate).length) {
              const params = new URLSearchParams({ key: creds.apiKey, token: creds.apiToken, ...trelloUpdate });
              const syncRes = await fetch(`https://api.trello.com/1/cards/${trelloCardId}?${params}`, {
                method: 'PUT',
                signal: AbortSignal.timeout(8_000),
              });
              if (!syncRes.ok) console.warn('[trello] card update sync-back failed:', syncRes.status, await syncRes.text().catch(() => ''));
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
  app.post('/trello/project-boards/:boardId/cards', { preHandler: authGuard }, async (request: TR, reply) => {
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
      `INSERT INTO project_cards (board_id, list_id, tenant_id, title, position, due_date, start_date, trello_card_id, trello_url)
       VALUES ($1, $2, $3, $4, $5, $6, NOW()::date, $7, $8)
       RETURNING id`,
      [boardId, body.list_id, tenantId, body.title, position, body.due_date ?? null, trelloCardId, trelloUrl]
    );

    return reply.send({ ok: true, card: { id: inserted[0].id, title: body.title, list_id: body.list_id } });
  });

  // ── Analytics ──────────────────────────────────────────────────────────────

  // GET /trello/project-boards/:boardId/insights — full analytics for a board
  app.get('/trello/project-boards/:boardId/insights', { preHandler: authGuard }, async (request: TR, reply) => {
    const { boardId } = request.params as { boardId: string };
    const tenantId = request.user?.tenant_id as string;

    const insights = await getBoardInsights(boardId, tenantId);
    if (!insights) return reply.status(404).send({ error: 'Board não encontrado.' });

    return reply.send({ insights });
  });

  // POST /trello/project-boards/:boardId/analyze — trigger analysis on-demand
  app.post('/trello/project-boards/:boardId/analyze', { preHandler: [authGuard, requirePerm('admin')] }, async (request: TR, reply) => {
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
  app.post('/trello/analyze-all', { preHandler: [authGuard, requirePerm('admin')] }, async (request: TR, reply) => {
    const tenantId = request.user?.tenant_id as string;
    void analyzeAllBoardsForTenant(tenantId);
    return reply.send({ ok: true, message: 'Análise iniciada para todos os boards.' });
  });

  // GET /trello/insights/overview — cross-board summary for all clients
  app.get('/trello/insights/overview', { preHandler: [authGuard, requirePerm('admin')] }, async (request: TR, reply) => {
    const tenantId = request.user?.tenant_id as string;

    const res = await query<Record<string, any>>(
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
  app.get('/trello/calendar', { preHandler: authGuard }, async (request: TR, reply) => {
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

    const res = await query<Record<string, any>>(
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
         AND ${currentYearCardClause('c')}
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

  function effectiveListOpsStatus(listName: string, overrideStatus?: string | null) {
    return overrideStatus ?? listNameToOpsStatus(listName);
  }

  function normalizeDeadlineDate(value?: string | null) {
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
  }

  function toTrelloDueValue(value?: string | null) {
    const normalized = normalizeDeadlineDate(value);
    if (!normalized) return '';
    return `${normalized}T12:00:00.000Z`;
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

  function inferSlaDeliveryType(input: { title?: string | null; labels?: Array<{ name?: string | null }> | null }) {
    const text = [
      input.title || '',
      ...(Array.isArray(input.labels) ? input.labels.map((label) => label?.name || '') : []),
    ]
      .join(' ')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (/(post|posts|social|rede social|instagram|linkedin|facebook|carrossel|feed|story|stories|reels|legenda)/.test(text)) {
      return { key: 'posts', label: 'Posts' };
    }
    if (/(video|videos|reels|capcut|motion|animacao|animacao|edicao)/.test(text)) {
      return { key: 'videos', label: 'Videos' };
    }
    if (/(campanha|landing|site|hotsite|projeto|proposta|cronograma|manual|identidade|apresentacao|apresentacao comercial)/.test(text)) {
      return { key: 'projetos', label: 'Projetos' };
    }
    return { key: 'materiais_avulsos', label: 'Materiais avulsos' };
  }

  // GET /trello/health — sync health per board + unmapped lists
  app.get('/trello/health', { preHandler: [authGuard, requirePerm('admin')] }, async (request: TR, reply) => {
    const tenantId = request.user?.tenant_id as string;

    const [boardsRes, listsRes, membersRes] = await Promise.all([
      query<{
        id: string; name: string; trello_board_id: string | null;
        client_id: string | null; client_name: string | null;
        last_synced_at: string | null; sync_age_hours: number | null;
        last_sync_status: string | null; last_sync_error: string | null;
        last_cards_synced: number | null; active_cards: number;
      }>(`
        SELECT pb.id, pb.name, pb.trello_board_id,
          pb.client_id, cl.name as client_name,
          pb.last_synced_at,
          EXTRACT(EPOCH FROM (now() - pb.last_synced_at)) / 3600 as sync_age_hours,
          sl.status as last_sync_status,
          sl.error_message as last_sync_error,
          sl.cards_synced as last_cards_synced,
          (SELECT COUNT(*)::int FROM project_cards pc WHERE pc.board_id = pb.id AND pc.is_archived = false) as active_cards
        FROM project_boards pb
        LEFT JOIN clients cl ON cl.id::text = pb.client_id
        LEFT JOIN LATERAL (
          SELECT status, error_message, cards_synced
          FROM trello_sync_log tsl
          WHERE tsl.trello_board_id = pb.trello_board_id
          ORDER BY started_at DESC LIMIT 1
        ) sl ON true
        WHERE pb.tenant_id = $1 AND pb.is_archived = false
        ORDER BY pb.name
      `, [tenantId]),
      query<{
        list_id: string; list_name: string; board_id: string; board_name: string;
        card_count: number; has_override: boolean;
      }>(`
        SELECT pl.id as list_id, pl.name as list_name, pl.board_id, pb.name as board_name,
          (SELECT COUNT(*)::int FROM project_cards pc WHERE pc.list_id = pl.id AND pc.is_archived = false) as card_count,
          EXISTS(SELECT 1 FROM trello_list_status_map m WHERE m.list_id = pl.id AND m.tenant_id = $1) as has_override
        FROM project_lists pl
        JOIN project_boards pb ON pb.id = pl.board_id
        WHERE pl.tenant_id = $1 AND pl.is_archived = false
        ORDER BY pb.name, pl.position
      `, [tenantId]),
      query<{ count: number }>(`
        SELECT COUNT(DISTINCT pcm.trello_member_id)::int as count
        FROM project_card_members pcm
        JOIN project_cards pc ON pc.id = pcm.card_id
        JOIN project_boards pb ON pb.id = pc.board_id
        WHERE pb.tenant_id = $1 AND pcm.email IS NULL
      `, [tenantId]),
    ]);

    const boards = boardsRes.rows.map((b) => {
      const ageH = Number(b.sync_age_hours ?? Infinity);
      let sync_status: 'ok' | 'stale' | 'error' | 'never';
      if (!b.last_synced_at) sync_status = 'never';
      else if (b.last_sync_status === 'error') sync_status = 'error';
      else if (ageH > 2) sync_status = 'stale';
      else sync_status = 'ok';
      return { ...b, sync_status };
    });

    const unmappedLists = listsRes.rows.filter(
      (l) => !l.has_override && l.card_count > 0 && listNameToOpsStatus(l.list_name) === 'intake',
    );

    const summary = {
      total_boards: boards.length,
      ok_count: boards.filter((b) => b.sync_status === 'ok').length,
      stale_count: boards.filter((b) => b.sync_status === 'stale').length,
      error_count: boards.filter((b) => b.sync_status === 'error').length,
      never_count: boards.filter((b) => b.sync_status === 'never').length,
      unlinked_count: boards.filter((b) => !b.client_id).length,
      unmapped_list_count: unmappedLists.length,
      members_without_email: membersRes.rows[0]?.count ?? 0,
    };

    return reply.send({ boards, unmappedLists, summary });
  });

  // GET /trello/list-status-map/:boardId — all lists with current effective status
  app.get('/trello/list-status-map/:boardId', { preHandler: [authGuard, requirePerm('admin')] }, async (request: TR, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const { boardId } = request.params as { boardId: string };

    const { rows } = await query<{
      list_id: string; list_name: string; position: number; card_count: number;
      override_status: string | null;
    }>(`
      SELECT pl.id as list_id, pl.name as list_name, pl.position,
        (SELECT COUNT(*)::int FROM project_cards pc WHERE pc.list_id = pl.id AND pc.is_archived = false) as card_count,
        m.ops_status as override_status
      FROM project_lists pl
      LEFT JOIN trello_list_status_map m ON m.list_id = pl.id AND m.tenant_id = $1
      WHERE pl.board_id = $2 AND pl.is_archived = false
      ORDER BY pl.position
    `, [tenantId, boardId]);

    const lists = rows.map((r) => ({
      ...r,
      detected_status: listNameToOpsStatus(r.list_name),
      effective_status: r.override_status ?? listNameToOpsStatus(r.list_name),
    }));

    return reply.send({ lists });
  });

  // POST /trello/list-status-map/:boardId — save explicit status overrides for lists
  app.post('/trello/list-status-map/:boardId', { preHandler: [authGuard, requirePerm('admin')] }, async (request: TR, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const { boardId } = request.params as { boardId: string };
    const { mappings } = request.body as { mappings: Array<{ list_id: string; ops_status: string | null }> };

    const VALID = new Set(['intake', 'planned', 'allocated', 'in_progress', 'in_review',
      'awaiting_approval', 'approved', 'ready', 'done', 'published', 'blocked', 'excluded']);

    for (const m of (mappings ?? [])) {
      if (m.ops_status === null) {
        await query(`DELETE FROM trello_list_status_map WHERE tenant_id = $1 AND list_id = $2::uuid`, [tenantId, m.list_id]);
      } else if (VALID.has(m.ops_status)) {
        await query(`
          INSERT INTO trello_list_status_map (tenant_id, board_id, list_id, ops_status)
          VALUES ($1, $2::uuid, $3::uuid, $4)
          ON CONFLICT (tenant_id, list_id) DO UPDATE SET ops_status = $4, updated_at = now()
        `, [tenantId, boardId, m.list_id, m.ops_status]);
      }
    }

    return reply.send({ ok: true });
  });

  // GET /trello/ops-feed — all active cards mapped to OperationsJob format
  app.get('/trello/ops-feed', { preHandler: [authGuard] }, async (request: TR, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const q = request.query as { active?: string; client_id?: string };
    const activeOnly = ['1', 'true', 'yes'].includes(String(q.active ?? ''));
    const clientIdFilter: string | null = q.client_id ?? null;

    // Load explicit list-status overrides for this tenant
    const { rows: overrideRows } = await query<{ list_id: string; ops_status: string }>(
      `SELECT list_id::text, ops_status FROM trello_list_status_map WHERE tenant_id = $1`,
      [tenantId],
    );
    const listStatusOverrides = new Map(overrideRows.map((r) => [r.list_id, r.ops_status]));

    // $1 = tenantId, $2 = activeOnly boolean, $3 = client_id (optional)
    const baseParams: unknown[] = [tenantId, activeOnly];
    const clientParam = clientIdFilter ?? null;
    const clientClause = clientParam ? `AND pb.client_id = $3` : '';
    if (clientParam) baseParams.push(clientParam);

    const { rows: cards } = await query<{
      id: string; title: string; description: string | null;
      due_date: string | null; due_complete: boolean; labels: any;
      cover_color: string | null; cover_url: string | null;
      last_activity_at: string | null; attachments: any;
      trello_url: string | null; trello_card_id: string | null;
      start_date: string | null; priority: string; estimated_hours: number | null;
      created_at: string;
      list_id: string; list_name: string;
      board_id: string; board_name: string;
      client_id: string | null; client_name: string | null;
      client_logo_url: string | null; client_brand_color: string | null;
      owner_name: string | null; owner_email: string | null; owner_user_id: string | null;
      owner_fp_id: string | null; owner_avatar_url: string | null; owner_is_freelancer: boolean;
      // intelligence fields
      days_inactive: number | null;
      client_late_count: number;
      client_total_count: number;
      avg_similar_hours: number | null;
      suggested_owner_name: string | null;
    }>(
      `SELECT
         pc.id, pc.title, pc.description, pc.due_date, pc.due_complete, pc.labels,
         pc.cover_color, pc.cover_url, pc.last_activity_at::text, pc.attachments,
         pc.trello_url, pc.trello_card_id,
         pc.start_date::text, pc.priority, pc.estimated_hours,
         pc.created_at::text,
         pl.id as list_id, pl.name as list_name,
         pb.id as board_id, pb.name as board_name,
         pb.client_id,
         cl.name as client_name,
         cl.profile->>'logo_url' as client_logo_url,
         cl.profile->'brand_colors'->>0 as client_brand_color,
         -- first assigned member (prefer matched edro user)
         (SELECT pcm.display_name FROM project_card_members pcm WHERE pcm.card_id = pc.id ORDER BY pcm.created_at ASC LIMIT 1) as owner_name,
         (SELECT pcm.email FROM project_card_members pcm WHERE pcm.card_id = pc.id ORDER BY pcm.created_at ASC LIMIT 1) as owner_email,
         (SELECT eu.id FROM project_card_members pcm JOIN edro_users eu ON LOWER(eu.email) = LOWER(pcm.email) WHERE pcm.card_id = pc.id ORDER BY pcm.created_at ASC LIMIT 1) as owner_user_id,
         (SELECT fp.id FROM project_card_members pcm JOIN edro_users eu ON LOWER(eu.email) = LOWER(pcm.email) JOIN freelancer_profiles fp ON fp.user_id = eu.id WHERE pcm.card_id = pc.id ORDER BY pcm.created_at ASC LIMIT 1) as owner_fp_id,
         (SELECT fp.avatar_url FROM project_card_members pcm JOIN edro_users eu ON LOWER(eu.email) = LOWER(pcm.email) JOIN freelancer_profiles fp ON fp.user_id = eu.id WHERE pcm.card_id = pc.id ORDER BY pcm.created_at ASC LIMIT 1) as owner_avatar_url,
         EXISTS(SELECT 1 FROM project_card_members pcm JOIN edro_users eu ON LOWER(eu.email) = LOWER(pcm.email) JOIN freelancer_profiles fp ON fp.user_id = eu.id WHERE pcm.card_id = pc.id LIMIT 1) as owner_is_freelancer,
         -- intelligence: inactivity
         CASE WHEN pc.last_activity_at IS NOT NULL THEN EXTRACT(DAY FROM NOW() - pc.last_activity_at)::int ELSE NULL END as days_inactive,
         -- intelligence: client delay history
         (SELECT COUNT(*)::int FROM project_cards pc_h JOIN project_boards pb_h ON pb_h.id = pc_h.board_id
          WHERE pb_h.client_id = pb.client_id AND pb_h.client_id IS NOT NULL
            AND pc_h.is_archived = true AND pc_h.due_date IS NOT NULL
            AND pc_h.due_date < CURRENT_DATE AND NOT pc_h.due_complete
            AND pc_h.tenant_id = $1) as client_late_count,
         (SELECT COUNT(*)::int FROM project_cards pc_h JOIN project_boards pb_h ON pb_h.id = pc_h.board_id
          WHERE pb_h.client_id = pb.client_id AND pb_h.client_id IS NOT NULL
            AND pc_h.is_archived = true AND pc_h.tenant_id = $1) as client_total_count,
         -- intelligence: avg hours for similar jobs on this client
         (SELECT ROUND(AVG(pc_h.estimated_hours)::numeric, 1)
          FROM project_cards pc_h JOIN project_boards pb_h ON pb_h.id = pc_h.board_id
          WHERE pb_h.client_id = pb.client_id AND pb_h.client_id IS NOT NULL
            AND pc_h.estimated_hours IS NOT NULL AND pc_h.tenant_id = $1)::float as avg_similar_hours,
         -- intelligence: who worked most on this client (suggested owner when unassigned)
         (SELECT pcm_s.display_name
          FROM project_card_members pcm_s JOIN project_cards pc_s ON pc_s.id = pcm_s.card_id
          JOIN project_boards pb_s ON pb_s.id = pc_s.board_id
          WHERE pb_s.client_id = pb.client_id AND pb_s.client_id IS NOT NULL
            AND pcm_s.tenant_id = $1
          GROUP BY pcm_s.display_name ORDER BY COUNT(*) DESC LIMIT 1) as suggested_owner_name
       FROM project_cards pc
       JOIN project_lists pl ON pl.id = pc.list_id
       JOIN project_boards pb ON pb.id = pc.board_id
       LEFT JOIN clients cl ON cl.id::text = pb.client_id
       WHERE pc.tenant_id = $1
         AND pc.is_archived = false
         AND ${currentYearCardClause('pc')}
         AND pl.is_archived = false
         AND (
           NOT $2::boolean
           OR pl.id::text NOT IN (
             -- exclude lists mapped as done/published/excluded
             SELECT list_id::text FROM trello_list_status_map
              WHERE tenant_id = $1
                AND ops_status IN ('done', 'published', 'excluded')
           )
         )
         AND (
           NOT $2::boolean
           OR pl.name !~* '(conclu[íi]do|done|publicado|entregue|finalizado|arquivado|cancelled|cancelado)'
         )
         ${clientClause}
       ORDER BY pc.due_date ASC NULLS LAST, pc.position ASC`,
      baseParams,
    );

    const INACTIVE_STATUSES = new Set(['done', 'published', 'excluded']);

    const jobs = cards.flatMap((c) => {
      const { band, score } = computePriorityBand(c.due_date, c.due_complete);
      const status = listStatusOverrides.get(c.list_id) ?? listNameToOpsStatus(c.list_name);
      if (activeOnly && INACTIVE_STATUSES.has(status)) return [];
      const labels = normalizeTrelloLabels(c.labels);
      const attachments = normalizeTrelloAttachments(c.attachments);
      const jobType = inferJobTypeFromLabels(labels);

      // ── Intelligence computation ───────────────────────────────────────────
      const now = Date.now();
      const daysToDeadline = c.due_date
        ? Math.floor((new Date(c.due_date).getTime() - now) / 86400000)
        : null;

      const alerts: string[] = [];
      if (daysToDeadline !== null && daysToDeadline < 0)
        alerts.push(`Atrasado ${Math.abs(daysToDeadline)}d`);
      else if (daysToDeadline === 0)
        alerts.push('Entrega hoje');
      else if (daysToDeadline !== null && daysToDeadline <= 2)
        alerts.push(`Entrega em ${daysToDeadline}d`);
      if (!c.owner_user_id)
        alerts.push('Sem responsável');
      if ((c.client_total_count ?? 0) >= 3 && (c.client_late_count ?? 0) >= 2) {
        const pct = Math.round(((c.client_late_count ?? 0) / (c.client_total_count ?? 1)) * 100);
        alerts.push(`Cliente atrasou ${pct}% dos jobs`);
      }
      if (c.days_inactive != null && c.days_inactive >= 4)
        alerts.push(`Parado há ${c.days_inactive}d`);
      if (!c.description)
        alerts.push('Sem briefing');

      let riskScore = 0;
      if (daysToDeadline !== null) {
        if (daysToDeadline < 0) riskScore += 40;
        else if (daysToDeadline <= 1) riskScore += 35;
        else if (daysToDeadline <= 3) riskScore += 20;
        else if (daysToDeadline <= 7) riskScore += 8;
      }
      if (!c.owner_user_id) riskScore += 25;
      if (c.days_inactive != null && c.days_inactive >= 4) riskScore += 15;
      if ((c.client_total_count ?? 0) >= 3 && (c.client_late_count ?? 0) / (c.client_total_count ?? 1) >= 0.5) riskScore += 20;
      riskScore = Math.min(riskScore, 100);

      const riskLevel: 'low' | 'medium' | 'high' | 'critical' =
        riskScore >= 70 ? 'critical' : riskScore >= 45 ? 'high' : riskScore >= 20 ? 'medium' : 'low';

      const intelligence = {
        risk_score: riskScore,
        risk_level: riskLevel,
        alerts: alerts.slice(0, 3),
        estimated_hours: c.avg_similar_hours ?? c.estimated_hours ?? null,
        suggested_owner_name: !c.owner_user_id ? (c.suggested_owner_name ?? null) : null,
      };

      const clientName = c.client_name ?? c.board_name ?? null;
      return {
        id: c.id,
        title: stripTrelloTitle(c.title, clientName),
        summary: c.description ?? null,
        labels,
        attachments,
        cover_url: c.cover_url ?? null,
        client_id: c.client_id ?? null,
        client_name: clientName,
        client_logo_url: c.client_logo_url ?? null,
        client_brand_color: c.client_brand_color ?? null,
        job_type: jobType,
        complexity: 'm' as const,
        channel: null,
        source: 'trello',
        status,
        priority: c.priority ?? 'normal',
        priority_score: score,
        priority_band: band as 'p0' | 'p1' | 'p2' | 'p3' | 'p4',
        impact_level: 2,
        dependency_level: 2,
        required_skill: null,
        owner_id: c.owner_user_id ?? null,
        owner_name: c.owner_name ?? null,
        owner_email: c.owner_email ?? null,
        owner_avatar_url: c.owner_avatar_url && c.owner_fp_id
          ? `/api/proxy/freelancers/${c.owner_fp_id}/avatar`
          : null,
        person_type: c.owner_is_freelancer ? 'freelancer' : (c.owner_user_id ? 'internal' : null),
        start_date: c.start_date ?? null,
        deadline_at: c.due_date ? `${c.due_date}T23:59:00` : null,
        created_at: c.created_at,
        estimated_minutes: c.estimated_hours ? Math.round(c.estimated_hours * 60) : null,
        actual_minutes: null,
        intelligence,
        external_link: c.trello_url ?? null,
        metadata: {
          trello_card_id: c.trello_card_id,
          trello_url: c.trello_url,
          board_id: c.board_id,
          board_name: c.board_name,
          list_id: c.list_id,
          list_name: c.list_name,
          due_complete: c.due_complete,
          last_activity_at: c.last_activity_at ?? null,
        },
      };
    });

    // Owners: only team members (edro_users or freelancer_profiles) — excludes external contacts/clients
    const { rows: members } = await query<{ display_name: string; email: string; user_id: string; fp_id: string | null; avatar_url: string | null; specialty: string | null }>(
      `SELECT DISTINCT ON (eu.id)
              COALESCE(NULLIF(eu.name, ''), split_part(eu.email, '@', 1)) as display_name,
              eu.email,
              eu.id as user_id,
              fp.id as fp_id,
              fp.avatar_url,
              fp.specialty
       FROM edro_users eu
       JOIN tenant_users tu ON tu.user_id = eu.id AND tu.tenant_id = $1
       LEFT JOIN freelancer_profiles fp ON fp.user_id = eu.id
       ORDER BY eu.id, eu.name`,
      [tenantId],
    );

    const owners = members
      .filter((m) => m.display_name)
      .map((m) => ({
        id: m.user_id,
        name: m.display_name,
        email: m.email ?? '',
        role: m.fp_id ? 'freelancer' : 'staff',
        specialty: m.specialty ?? null,
        person_type: (m.fp_id ? 'freelancer' : 'internal') as 'freelancer' | 'internal',
        freelancer_profile_id: m.fp_id ?? null,
        avatar_url: m.avatar_url && m.fp_id ? `/api/proxy/freelancers/${m.fp_id}/avatar` : null,
      }));

    // Clients
    const { rows: clientRows } = await query<{ id: string; name: string; logo_url: string | null; brand_color: string | null }>(
      `SELECT DISTINCT cl.id, cl.name, NULL::text as logo_url, NULL::text as brand_color
       FROM clients cl
       JOIN project_boards pb ON pb.client_id = cl.id::text
       WHERE pb.tenant_id = $1 AND pb.is_archived = false`,
      [tenantId],
    );

    // Sync health summary
    const [{ rows: healthRows }, { rows: unmappedRows }] = await Promise.all([
      query<{
        stale_count: number; unlinked_count: number; oldest_sync_hours: number | null;
      }>(`
        SELECT
          COUNT(*) FILTER (WHERE last_synced_at IS NOT NULL AND EXTRACT(EPOCH FROM (now() - last_synced_at))/3600 > 2)::int as stale_count,
          COUNT(*) FILTER (WHERE client_id IS NULL)::int as unlinked_count,
          MAX(EXTRACT(EPOCH FROM (now() - last_synced_at))/3600) as oldest_sync_hours
        FROM project_boards
        WHERE tenant_id = $1 AND is_archived = false
      `, [tenantId]),
      query<{ count: number }>(`
        SELECT COUNT(DISTINCT pl.id)::int as count
        FROM project_lists pl
        WHERE pl.tenant_id = $1 AND pl.is_archived = false
          AND NOT EXISTS (
            SELECT 1 FROM trello_list_status_map m WHERE m.list_id = pl.id AND m.tenant_id = $1
          )
          AND (SELECT COUNT(*) FROM project_cards pc WHERE pc.list_id = pl.id AND pc.is_archived = false) > 0
      `, [tenantId]),
    ]);
    const hw = healthRows[0];
    const unmappedCount = unmappedRows[0]?.count ?? 0;
    const sync_health = {
      stale_boards: hw?.stale_count ?? 0,
      unlinked_boards: hw?.unlinked_count ?? 0,
      unmapped_lists: unmappedCount,
      oldest_sync_hours: hw?.oldest_sync_hours != null ? Math.round(Number(hw.oldest_sync_hours)) : null,
      needs_attention: (hw?.stale_count ?? 0) > 0 || (hw?.unlinked_count ?? 0) > 0 || unmappedCount > 0,
    };

    return reply.send({
      jobs,
      owners,
      clients: clientRows,
      sync_health,
    });
  });

  // POST /trello/ops-cards — create a new operational demand directly on the Trello-backed flow
  app.post('/trello/ops-cards', { preHandler: [authGuard] }, async (request: TR, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const body = z.object({
      client_id: z.string().uuid().nullable().optional(),
      title: z.string().trim().min(3),
      summary: z.string().trim().max(5000).nullable().optional(),
      deadline_at: z.string().nullable().optional(),
      owner_id: z.string().uuid().nullable().optional(),
      source: z.string().trim().optional(),
      job_type: z.string().trim().optional(),
      is_urgent: z.boolean().optional(),
    }).parse(request.body);

    const boardRes = await query<{ id: string; name: string; client_id: string | null; client_name: string | null }>(
      `SELECT pb.id, pb.name, pb.client_id, cl.name as client_name
       FROM project_boards pb
       LEFT JOIN clients cl ON cl.id::text = pb.client_id
       WHERE pb.tenant_id = $1 AND pb.is_archived = false
         AND ($2::uuid IS NULL OR pb.client_id = $2::text)
       ORDER BY CASE WHEN pb.client_id = $2::text THEN 0 ELSE 1 END, pb.updated_at DESC, pb.created_at ASC
       LIMIT 1`,
      [tenantId, body.client_id ?? null],
    );
    const board = boardRes.rows[0];
    if (!board) return reply.status(400).send({ error: 'Nenhum board Trello vinculado para este cliente.' });

    const listRes = await query<{ id: string; name: string; trello_list_id: string | null; override_status: string | null }>(
      `SELECT pl.id, pl.name, pl.trello_list_id, m.ops_status as override_status
       FROM project_lists pl
       LEFT JOIN trello_list_status_map m ON m.list_id = pl.id AND m.tenant_id = $2
       WHERE pl.board_id = $1 AND pl.is_archived = false
       ORDER BY pl.position`,
      [board.id, tenantId],
    );
    if (!listRes.rows.length) return reply.status(400).send({ error: 'O board vinculado não possui listas ativas.' });

    const preferredList =
      listRes.rows.find((list) => effectiveListOpsStatus(list.name, list.override_status) === 'intake') ??
      listRes.rows.find((list) => effectiveListOpsStatus(list.name, list.override_status) === 'planned') ??
      listRes.rows[0];

    const dueDateValue = normalizeDeadlineDate(body.deadline_at ?? null);
    const labels = body.is_urgent ? [{ color: 'red', name: 'Urgente' }] : [];

    let trelloCardId: string | null = null;
    let trelloUrl: string | null = null;
    try {
      const creds = await getTrelloCredentials(tenantId);
      if (creds && preferredList.trello_list_id) {
        const params = new URLSearchParams({
          key: creds.apiKey,
          token: creds.apiToken,
          idList: preferredList.trello_list_id,
          name: body.title,
          desc: body.summary ?? '',
          pos: 'bottom',
          ...(dueDateValue ? { due: toTrelloDueValue(dueDateValue) } : {}),
        });
        const res = await fetch(`https://api.trello.com/1/cards?${params}`, {
          method: 'POST',
          signal: AbortSignal.timeout(10_000),
        });
        if (res.ok) {
          const created = await res.json() as { id: string; shortUrl: string };
          trelloCardId = created.id;
          trelloUrl = created.shortUrl;
        } else {
          console.warn('[trello ops] card creation sync failed:', res.status, await res.text().catch(() => ''));
        }
      }
    } catch (err: any) {
      console.warn('[trello ops] create card sync failed:', err?.message);
    }

    const positionRes = await query<{ max_pos: string }>(
      `SELECT COALESCE(MAX(position), 0) + 65536 AS max_pos
       FROM project_cards
       WHERE list_id = $1 AND tenant_id = $2 AND is_archived = false`,
      [preferredList.id, tenantId],
    );
    const position = Number(positionRes.rows[0]?.max_pos ?? 65536);

    const insertRes = await query<{ id: string }>(
      `INSERT INTO project_cards (
        board_id, list_id, tenant_id, title, description, position, due_date, start_date, labels, trello_card_id, trello_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()::date, $8, $9, $10)
      RETURNING id`,
      [
        board.id,
        preferredList.id,
        tenantId,
        body.title,
        body.summary ?? null,
        position,
        dueDateValue,
        JSON.stringify(labels),
        trelloCardId,
        trelloUrl,
      ],
    );

    let ownerName: string | null = null;
    let ownerEmail: string | null = null;

    if (body.owner_id) {
      const ownerRes = await query<{ email: string | null; name: string | null }>(
        `SELECT email, name FROM edro_users WHERE id = $1 LIMIT 1`,
        [body.owner_id],
      );
      ownerEmail = ownerRes.rows[0]?.email ?? null;
      ownerName = ownerRes.rows[0]?.name ?? null;

      if (ownerEmail) {
        const memberRes = await query<{ trello_member_id: string | null; display_name: string | null }>(
          `SELECT DISTINCT pcm.trello_member_id, pcm.display_name
           FROM project_card_members pcm
           JOIN project_cards pc ON pc.id = pcm.card_id
           JOIN project_boards pb ON pb.id = pc.board_id
           WHERE LOWER(pcm.email) = LOWER($1) AND pb.tenant_id = $2
           LIMIT 1`,
          [ownerEmail, tenantId],
        );
        const trelloMemberId = memberRes.rows[0]?.trello_member_id ?? null;
        const displayName = memberRes.rows[0]?.display_name ?? ownerName ?? ownerEmail;
        await query(
          `INSERT INTO project_card_members (card_id, tenant_id, trello_member_id, display_name, email)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (card_id, trello_member_id) DO UPDATE SET display_name = $4, email = $5`,
          [insertRes.rows[0].id, tenantId, trelloMemberId ?? ownerEmail, displayName, ownerEmail],
        );

        if (trelloCardId && trelloMemberId) {
          try {
            const creds = await getTrelloCredentials(tenantId);
            if (creds) {
              const params = new URLSearchParams({ key: creds.apiKey, token: creds.apiToken, value: trelloMemberId });
              const syncRes = await fetch(`https://api.trello.com/1/cards/${trelloCardId}/idMembers?${params}`, {
                method: 'POST',
                signal: AbortSignal.timeout(8_000),
              });
              if (!syncRes.ok) console.warn('[trello ops] owner sync failed:', syncRes.status, await syncRes.text().catch(() => ''));
            }
          } catch (err: any) {
            console.warn('[trello ops] owner assignment sync failed:', err?.message);
          }
        }
      }
    }

    const { band, score } = computePriorityBand(dueDateValue, false);
    return reply.send({
      ok: true,
      data: {
        id: insertRes.rows[0].id,
        title: body.title,
        summary: body.summary ?? null,
        client_id: board.client_id ?? body.client_id ?? null,
        client_name: board.client_name ?? board.name,
        job_type: body.job_type || 'copy',
        complexity: 'm',
        channel: null,
        source: 'trello',
        status: effectiveListOpsStatus(preferredList.name, preferredList.override_status),
        priority_score: score,
        priority_band: band,
        impact_level: 2,
        dependency_level: 2,
        owner_id: body.owner_id ?? null,
        owner_name: ownerName,
        owner_email: ownerEmail,
        deadline_at: dueDateValue ? `${dueDateValue}T23:59:00` : null,
        estimated_minutes: null,
        actual_minutes: null,
        metadata: {
          trello_card_id: trelloCardId,
          trello_url: trelloUrl,
          board_id: board.id,
          board_name: board.name,
          list_id: preferredList.id,
          list_name: preferredList.name,
          labels,
          due_complete: false,
        },
      },
    });
  });

  // POST /trello/ops-cards/:cardId/status — move card to best matching list
  app.post('/trello/ops-cards/:cardId/status', { preHandler: [authGuard] }, async (request: TR, reply) => {
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
    const { rows: lists } = await query<{ id: string; name: string; trello_list_id: string | null; override_status: string | null }>(
      `SELECT pl.id, pl.name, pl.trello_list_id, m.ops_status as override_status
       FROM project_lists pl
       LEFT JOIN trello_list_status_map m ON m.list_id = pl.id AND m.tenant_id = $2
       WHERE pl.board_id = $1 AND pl.is_archived = false
       ORDER BY pl.position`,
      [board_id, tenantId],
    );

    const targetStatus = status.toLowerCase();
    // Score each list: higher = better match
    const scored = lists.map((l) => {
      const mapped = effectiveListOpsStatus(l.name, l.override_status);
      return { ...l, score: mapped === targetStatus ? 10 : 0 };
    });
    const best = scored.sort((a, b) => b.score - a.score)[0];
    if (!best || best.score === 0) return reply.status(400).send({ error: `Nenhuma lista encontrada para status "${targetStatus}".` });

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
          const syncRes = await fetch(
            `https://api.trello.com/1/cards/${trello_card_id}?key=${creds.apiKey}&token=${creds.apiToken}&idList=${best.trello_list_id}`,
            { method: 'PUT', signal: AbortSignal.timeout(8_000) },
          );
          if (!syncRes.ok) console.warn('[trello ops] status sync-back failed:', syncRes.status, await syncRes.text().catch(() => ''));
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
        id: c.id, title: c.title, status: targetStatus,
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
    const status = effectiveListOpsStatus(c.list_name as string, (c.override_status as string | null | undefined) ?? null);
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

  async function getCardAssignees(cardId: string, tenantId: string) {
    const { rows } = await query<{
      user_id: string | null;
      name: string | null;
      email: string | null;
      avatar_url: string | null;
      freelancer_profile_id: string | null;
    }>(
      `SELECT
         eu.id::text AS user_id,
         COALESCE(NULLIF(eu.name, ''), pcm.display_name, split_part(COALESCE(pcm.email, eu.email, ''), '@', 1)) AS name,
         COALESCE(pcm.email, eu.email) AS email,
         fp.avatar_url,
         fp.id::text AS freelancer_profile_id
       FROM project_card_members pcm
       LEFT JOIN edro_users eu ON LOWER(eu.email) = LOWER(pcm.email)
       LEFT JOIN freelancer_profiles fp ON fp.user_id = eu.id
       WHERE pcm.card_id = $1 AND pcm.tenant_id = $2
       ORDER BY pcm.created_at ASC`,
      [cardId, tenantId],
    );

    const seen = new Set<string>();
    return rows
      .map((row) => {
        const key = row.user_id || row.email || row.name || '';
        if (!key || seen.has(key)) return null;
        seen.add(key);
        return {
          user_id: row.user_id || key,
          name: row.name || row.email || 'Pessoa sem nome',
          email: row.email || '',
          avatar_url: row.freelancer_profile_id && row.avatar_url
            ? `/api/proxy/freelancers/${row.freelancer_profile_id}/avatar`
            : (row.avatar_url ?? null),
        };
      })
      .filter(Boolean);
  }

  async function resolveAssignablePeople(userIds: string[], tenantId: string) {
    if (!userIds.length) return [];

    const { rows } = await query<{
      user_id: string;
      name: string;
      email: string;
      trello_member_id: string | null;
    }>(
      `SELECT
         u.id::text AS user_id,
         COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS name,
         u.email,
         (
           SELECT pcm.trello_member_id
           FROM project_card_members pcm
           JOIN project_cards pc ON pc.id = pcm.card_id
           JOIN project_boards pb ON pb.id = pc.board_id
           WHERE LOWER(pcm.email) = LOWER(u.email)
             AND pb.tenant_id = $2
             AND pcm.trello_member_id IS NOT NULL
           ORDER BY pcm.created_at DESC
           LIMIT 1
         ) AS trello_member_id
       FROM edro_users u
       JOIN tenant_users tu ON tu.user_id = u.id
       WHERE tu.tenant_id = $2
         AND u.id = ANY($1::uuid[])`,
      [userIds, tenantId],
    );

    const byId = new Map(rows.map((row) => [row.user_id, row]));
    return userIds
      .map((userId) => byId.get(userId))
      .filter(Boolean) as Array<{ user_id: string; name: string; email: string; trello_member_id: string | null }>;
  }

  app.get('/trello/ops-cards/:cardId', { preHandler: [authGuard] }, async (request: TR, reply) => {
    const { cardId } = request.params as { cardId: string };
    const tenantId = request.user?.tenant_id as string;

    const cardRes = await query<Record<string, any>>(
      `SELECT
         pc.id, pc.title, pc.description, pc.due_date, pc.due_complete, pc.labels,
         pc.trello_url, pc.trello_card_id,
         pl.id as list_id, pl.name as list_name,
         m.ops_status as override_status,
         pb.id as board_id, pb.name as board_name, pb.client_id,
         cl.name as client_name, NULL::text as client_logo_url, NULL::text as client_brand_color,
         (SELECT pcm.display_name FROM project_card_members pcm WHERE pcm.card_id = pc.id ORDER BY pcm.created_at ASC LIMIT 1) as owner_name,
         (SELECT pcm.email FROM project_card_members pcm WHERE pcm.card_id = pc.id ORDER BY pcm.created_at ASC LIMIT 1) as owner_email,
         (SELECT eu.id FROM project_card_members pcm
            JOIN edro_users eu ON LOWER(eu.email) = LOWER(pcm.email)
           WHERE pcm.card_id = pc.id
           ORDER BY pcm.created_at ASC
           LIMIT 1) as owner_user_id
       FROM project_cards pc
       JOIN project_lists pl ON pl.id = pc.list_id
       JOIN project_boards pb ON pb.id = pc.board_id
       LEFT JOIN trello_list_status_map m ON m.list_id = pl.id AND m.tenant_id = $2
       LEFT JOIN clients cl ON cl.id::text = pb.client_id
       WHERE pc.id = $1 AND pc.tenant_id = $2`,
      [cardId, tenantId],
    );
    if (!cardRes.rows.length) return reply.status(404).send({ error: 'Card não encontrado.' });

    const baseRow = cardRes.rows[0];
    const baseJob = _cardToJob(baseRow);
    const [historyRes, commentsRes, checklistsRes, assignees] = await Promise.all([
      query<{ action_type: string; from_list_name: string | null; to_list_name: string | null; actor_name: string | null; occurred_at: string }>(
        `SELECT action_type, from_list_name, to_list_name, actor_name, occurred_at
         FROM project_card_activity
         WHERE card_id = $1
         ORDER BY occurred_at DESC
         LIMIT 100`,
        [cardId],
      ).catch(() => ({ rows: [] })),
      query<{ body: string; author_name: string | null; commented_at: string }>(
        `SELECT body, author_name, commented_at
         FROM project_card_comments
         WHERE card_id = $1
         ORDER BY commented_at DESC
         LIMIT 20`,
        [cardId],
      ).catch(() => ({ rows: [] })),
      query<{ id: string; name: string; items: Array<{ text: string; checked: boolean }> }>(
        `SELECT id, name, items
         FROM project_card_checklists
         WHERE card_id = $1
         ORDER BY created_at ASC`,
        [cardId],
      ).catch(() => ({ rows: [] })),
      getCardAssignees(cardId, tenantId).catch(() => []),
    ]);

    let history = historyRes.rows.map((row, index) => ({
      id: `${cardId}:${index}:${row.occurred_at}`,
      from_status: row.from_list_name ? listNameToOpsStatus(row.from_list_name) : null,
      to_status: row.to_list_name ? listNameToOpsStatus(row.to_list_name) : baseJob.status,
      changed_by_name: row.actor_name ?? null,
      changed_at: row.occurred_at,
      reason: row.action_type,
    }));
    let comments = commentsRes.rows.map((row, index) => ({
      id: `${cardId}:comment:${index}:${row.commented_at}`,
      author_name: row.author_name ?? null,
      body: row.body,
      created_at: row.commented_at,
    }));
    let checklists = checklistsRes.rows.map((row) => ({
      id: row.id,
      name: row.name,
      items: Array.isArray(row.items) ? row.items : [],
    }));
    let liveJob = baseJob;

    if (baseRow.trello_card_id) {
      try {
        const creds = await getTrelloCredentials(tenantId);
        if (creds) {
          const auth = `key=${creds.apiKey}&token=${creds.apiToken}`;
          const [cardLiveRes, membersLiveRes, checklistsLiveRes, actionsLiveRes] = await Promise.all([
            fetch(`https://api.trello.com/1/cards/${baseRow.trello_card_id}?${auth}&fields=id,name,desc,due,dueComplete,labels,idList,url`, {
              signal: AbortSignal.timeout(8_000),
            }),
            fetch(`https://api.trello.com/1/cards/${baseRow.trello_card_id}/members?${auth}&fields=id,fullName,username,email,avatarUrl`, {
              signal: AbortSignal.timeout(8_000),
            }),
            fetch(`https://api.trello.com/1/cards/${baseRow.trello_card_id}/checklists?${auth}&fields=id,name&checkItems=all&checkItem_fields=id,name,state`, {
              signal: AbortSignal.timeout(8_000),
            }),
            fetch(`https://api.trello.com/1/cards/${baseRow.trello_card_id}/actions?${auth}&filter=commentCard,updateCard:idList&limit=100&fields=id,type,date,data&memberCreator_fields=fullName,avatarUrl`, {
              signal: AbortSignal.timeout(8_000),
            }),
          ]);

          if (cardLiveRes.ok) {
            const liveCard = await cardLiveRes.json() as {
              name: string;
              desc?: string;
              due?: string | null;
              dueComplete?: boolean;
              labels?: Array<{ color: string; name: string }>;
              idList?: string;
              url?: string | null;
            };

            let effectiveListId = baseRow.list_id as string;
            let effectiveListName = baseRow.list_name as string;
            let effectiveOverrideStatus = baseRow.override_status as string | null;

            if (liveCard.idList) {
              const liveListRes = await query<{ id: string; name: string; override_status: string | null }>(
                `SELECT pl.id, pl.name, m.ops_status as override_status
                 FROM project_lists pl
                 LEFT JOIN trello_list_status_map m ON m.list_id = pl.id AND m.tenant_id = $2
                 WHERE pl.trello_list_id = $1 AND pl.tenant_id = $2
                 LIMIT 1`,
                [liveCard.idList, tenantId],
              );
              if (liveListRes.rows[0]) {
                effectiveListId = liveListRes.rows[0].id;
                effectiveListName = liveListRes.rows[0].name;
                effectiveOverrideStatus = liveListRes.rows[0].override_status;
              }
            }

            liveJob = _cardToJob({
              ...baseRow,
              title: liveCard.name,
              description: liveCard.desc ?? null,
              due_date: normalizeDeadlineDate(liveCard.due ?? null),
              due_complete: Boolean(liveCard.dueComplete),
              labels: liveCard.labels ?? [],
              trello_url: liveCard.url ?? baseRow.trello_url,
              list_id: effectiveListId,
              list_name: effectiveListName,
              override_status: effectiveOverrideStatus,
            });
          }

          if (checklistsLiveRes.ok) {
            const liveChecklists = await checklistsLiveRes.json() as Array<{
              id: string;
              name: string;
              checkItems?: Array<{ id: string; name: string; state: 'complete' | 'incomplete' }>;
            }>;
            checklists = liveChecklists.map((checklist) => ({
              id: checklist.id,
              name: checklist.name,
              items: Array.isArray(checklist.checkItems)
                ? checklist.checkItems.map((item) => ({
                    id: item.id,
                    text: item.name,
                    checked: item.state === 'complete',
                  }))
                : [],
            }));
          }

          if (actionsLiveRes.ok) {
            const liveActions = await actionsLiveRes.json() as Array<{
              id: string;
              type: string;
              date: string;
              memberCreator?: { fullName?: string };
              data?: {
                text?: string;
                listBefore?: { name?: string };
                listAfter?: { name?: string };
              };
            }>;
            comments = liveActions
              .filter((action) => action.type === 'commentCard' && action.data?.text)
              .map((action) => ({
                id: action.id,
                author_name: action.memberCreator?.fullName ?? null,
                body: action.data?.text ?? '',
                created_at: action.date,
              }));
            history = liveActions
              .filter((action) => action.type.startsWith('updateCard') && (action.data?.listBefore?.name || action.data?.listAfter?.name))
              .map((action) => ({
                id: action.id,
                from_status: action.data?.listBefore?.name ? listNameToOpsStatus(action.data.listBefore.name) : null,
                to_status: action.data?.listAfter?.name ? listNameToOpsStatus(action.data.listAfter.name) : liveJob.status,
                changed_by_name: action.memberCreator?.fullName ?? null,
                changed_at: action.date,
                reason: action.type,
              }));
          }

          if (membersLiveRes.ok) {
            const liveMembers = await membersLiveRes.json() as Array<{ email?: string; fullName?: string }>;
            const primaryMember = liveMembers[0];
            if (primaryMember?.email || primaryMember?.fullName) {
              liveJob = {
                ...liveJob,
                owner_email: primaryMember.email ?? liveJob.owner_email,
                owner_name: primaryMember.fullName ?? liveJob.owner_name,
              };
            }
          }
        }
      } catch (err: any) {
        console.warn('[trello ops] live detail fetch failed:', err?.message);
      }
    }

    return reply.send({
      ok: true,
      data: {
        ...liveJob,
        owner_id: assignees[0]?.user_id ?? liveJob.owner_id ?? null,
        owner_name: assignees[0]?.name ?? liveJob.owner_name ?? null,
        owner_email: assignees[0]?.email ?? liveJob.owner_email ?? null,
        assignees,
        comments,
        checklists,
        history,
      },
    });
  });

  app.patch('/trello/ops-cards/:cardId', { preHandler: [authGuard] }, async (request: TR, reply) => {
    const { cardId } = request.params as { cardId: string };
    const tenantId = request.user?.tenant_id as string;
    const body = z.object({
      title: z.string().min(1).optional(),
      summary: z.string().nullable().optional(),
      deadline_at: z.string().nullable().optional(),
      owner_id: z.string().uuid().nullable().optional(),
      assignee_ids: z.array(z.string().uuid()).optional(),
    }).parse(request.body);

    const cardRes = await query<{ board_id: string; trello_card_id: string | null; owner_email: string | null }>(
      `SELECT pc.board_id, pc.trello_card_id,
              (SELECT pcm.email FROM project_card_members pcm WHERE pcm.card_id = pc.id ORDER BY pcm.created_at ASC LIMIT 1) as owner_email
       FROM project_cards pc
       WHERE pc.id = $1 AND pc.tenant_id = $2`,
      [cardId, tenantId],
    );
    if (!cardRes.rows.length) return reply.status(404).send({ error: 'Card não encontrado.' });
    const current = cardRes.rows[0];
    const currentMembersRes = await query<{ trello_member_id: string | null }>(
      `SELECT trello_member_id
       FROM project_card_members
       WHERE card_id = $1 AND tenant_id = $2`,
      [cardId, tenantId],
    );

    const patchPayload: Record<string, any> = {};
    if (body.title !== undefined) patchPayload.title = body.title;
    if (body.summary !== undefined) patchPayload.description = body.summary ?? '';
    if (body.deadline_at !== undefined) patchPayload.due_date = normalizeDeadlineDate(body.deadline_at);

    if (Object.keys(patchPayload).length) {
      const reqBody = { ...patchPayload };
      const sets: string[] = [];
      const vals: unknown[] = [];
      let i = 1;
      for (const [key, val] of Object.entries(reqBody)) {
        sets.push(`${key} = $${i++}`);
        vals.push(val);
      }
      vals.push(cardId, tenantId);
      await query(`UPDATE project_cards SET ${sets.join(', ')}, updated_at = now() WHERE id = $${i} AND tenant_id = $${i + 1}`, vals);

      if (current.trello_card_id) {
        try {
          const creds = await getTrelloCredentials(tenantId);
          if (creds) {
            const params = new URLSearchParams({ key: creds.apiKey, token: creds.apiToken });
            if (patchPayload.title !== undefined) params.set('name', patchPayload.title);
            if (patchPayload.description !== undefined) params.set('desc', patchPayload.description);
            if (body.deadline_at !== undefined) params.set('due', toTrelloDueValue(patchPayload.due_date));
            const syncRes = await fetch(`https://api.trello.com/1/cards/${current.trello_card_id}?${params}`, {
              method: 'PUT',
              signal: AbortSignal.timeout(8_000),
            });
            if (!syncRes.ok) console.warn('[trello ops] detail sync failed:', syncRes.status, await syncRes.text().catch(() => ''));
          }
        } catch (err: any) {
          console.warn('[trello ops] detail sync failed:', err?.message);
        }
      }
    }

    if (body.owner_id !== undefined || body.assignee_ids !== undefined) {
      const orderedAssigneeIds = Array.from(
        new Set([
          ...(body.owner_id ? [body.owner_id] : []),
          ...((body.assignee_ids !== undefined
            ? body.assignee_ids
            : body.owner_id !== undefined
              ? []
              : []) || []),
        ].filter(Boolean))
      ) as string[];

      const resolvedPeople = await resolveAssignablePeople(orderedAssigneeIds, tenantId);
      if (orderedAssigneeIds.length && resolvedPeople.length !== orderedAssigneeIds.length) {
        return reply.status(400).send({ error: 'Uma ou mais pessoas selecionadas não foram encontradas no tenant.' });
      }

      await query(`DELETE FROM project_card_members WHERE card_id = $1 AND tenant_id = $2`, [cardId, tenantId]);

      for (const person of resolvedPeople) {
        await query(
          `INSERT INTO project_card_members (card_id, tenant_id, trello_member_id, display_name, email)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (card_id, trello_member_id) DO UPDATE SET display_name = $4, email = $5`,
          [cardId, tenantId, person.trello_member_id ?? person.email, person.name, person.email],
        );
      }

      if (current.trello_card_id) {
        try {
          const creds = await getTrelloCredentials(tenantId);
          if (creds) {
            const baseParams = new URLSearchParams({ key: creds.apiKey, token: creds.apiToken });
            const currentMemberIds = Array.from(new Set(currentMembersRes.rows.map((row) => row.trello_member_id).filter(Boolean) as string[]));
            const nextMemberIds = Array.from(new Set(resolvedPeople.map((row) => row.trello_member_id).filter(Boolean) as string[]));

            await Promise.all(currentMemberIds.map((memberId) =>
              fetch(`https://api.trello.com/1/cards/${current.trello_card_id}/idMembers/${memberId}?${baseParams}`, {
                method: 'DELETE',
                signal: AbortSignal.timeout(8_000),
              }).catch(() => null)
            ));

            for (const memberId of nextMemberIds) {
              const addParams = new URLSearchParams({ key: creds.apiKey, token: creds.apiToken, value: memberId });
              const syncRes = await fetch(`https://api.trello.com/1/cards/${current.trello_card_id}/idMembers?${addParams}`, {
                method: 'POST',
                signal: AbortSignal.timeout(8_000),
              });
              if (!syncRes.ok) console.warn('[trello ops] assignee sync failed:', syncRes.status, await syncRes.text().catch(() => ''));
            }
          }
        } catch (err: any) {
          console.warn('[trello ops] assignee sync failed:', err?.message);
        }
      }
    }

    const detailRes = await app.inject({
      method: 'GET',
      url: `/trello/ops-cards/${cardId}`,
      headers: request.headers as Record<string, string>,
    });
    return reply.status(detailRes.statusCode).headers(detailRes.headers).send(detailRes.json());
  });

  // PATCH /trello/ops-cards/:cardId/checklist-items/:checkItemId — toggle checklist item state
  app.patch('/trello/ops-cards/:cardId/checklist-items/:checkItemId', { preHandler: [authGuard] }, async (request: TR, reply) => {
    const { cardId, checkItemId } = request.params as { cardId: string; checkItemId: string };
    const tenantId = request.user?.tenant_id as string;
    const { state } = z.object({ state: z.enum(['complete', 'incomplete']) }).parse(request.body);

    // Resolve the Trello card ID
    const cardRes = await query<{ trello_card_id: string | null }>(
      `SELECT trello_card_id FROM project_cards WHERE id = $1 AND tenant_id = $2`,
      [cardId, tenantId],
    );
    if (!cardRes.rows.length) return reply.status(404).send({ error: 'Card não encontrado.' });

    const trelloCardId = cardRes.rows[0].trello_card_id;

    // Update in Trello if synced
    if (trelloCardId) {
      const creds = await getTrelloCredentials(tenantId);
      if (creds) {
        const params = new URLSearchParams({ key: creds.apiKey, token: creds.apiToken, state });
        const syncRes = await fetch(
          `https://api.trello.com/1/cards/${trelloCardId}/checkItem/${checkItemId}?${params}`,
          { method: 'PUT', signal: AbortSignal.timeout(8_000) },
        );
        if (!syncRes.ok) {
          const errText = await syncRes.text().catch(() => '');
          console.warn('[trello ops] checklist item sync failed:', syncRes.status, errText);
          // Still reflect optimistically in the local DB (best effort)
        }
      }
    }

    // Update locally in JSONB — find the checklist row containing this item and update it
    const clRes = await query<{ id: string; items: Array<{ id?: string; text: string; checked: boolean }> }>(
      `SELECT id, items FROM project_card_checklists WHERE card_id = $1 AND tenant_id = $2`,
      [cardId, tenantId],
    );
    for (const cl of clRes.rows) {
      const idx = cl.items.findIndex((it) => it.id === checkItemId);
      if (idx !== -1) {
        cl.items[idx] = { ...cl.items[idx], checked: state === 'complete' };
        await query(
          `UPDATE project_card_checklists SET items = $1, updated_at = now() WHERE id = $2`,
          [JSON.stringify(cl.items), cl.id],
        );
        break;
      }
    }

    return reply.send({ ok: true });
  });

  // GET /trello/ops-planner — workload per Trello member for the Planner tab
  app.get('/trello/ops-planner', { preHandler: [authGuard] }, async (request: TR, reply) => {
    const tenantId = request.user?.tenant_id as string;

    // One row per (card × member); cards without members appear once with null owner fields
    const { rows } = await query<Record<string, any>>(
      `SELECT
         pc.id, pc.title, pc.description, pc.due_date, pc.due_complete, pc.labels,
         pc.trello_url, pc.trello_card_id,
         pl.id as list_id, pl.name as list_name,
         m.ops_status as override_status,
         pb.id as board_id, pb.name as board_name, pb.client_id,
         cl.name as client_name, NULL::text as client_logo_url, NULL::text as client_brand_color,
         pcm.display_name as owner_name, pcm.email as owner_email,
         eu.id as owner_user_id,
         fp.id as owner_fp_id,
         fp.avatar_url as owner_avatar_url
       FROM project_cards pc
       JOIN project_lists pl ON pl.id = pc.list_id
       LEFT JOIN trello_list_status_map m ON m.list_id = pl.id AND m.tenant_id = $1
       JOIN project_boards pb ON pb.id = pc.board_id
       LEFT JOIN clients cl ON cl.id::text = pb.client_id
       LEFT JOIN project_card_members pcm ON pcm.card_id = pc.id
       LEFT JOIN edro_users eu ON LOWER(eu.email) = LOWER(pcm.email)
       LEFT JOIN freelancer_profiles fp ON fp.user_id = eu.id
       WHERE pc.tenant_id = $1
         AND pc.is_archived = false
         AND ${currentYearCardClause('pc')}
         AND pl.is_archived = false
         AND COALESCE(m.ops_status, '') <> 'excluded'
         AND NOT (
           m.ops_status IS NULL
           AND pl.name ~* '(conclu[íi]do|done|publicado|entregue|finalizado|arquivado|cancelled|cancelado)'
         )
       ORDER BY pc.due_date ASC NULLS LAST`,
      [tenantId],
    );

    type OwnerEntry = {
      name: string; email: string | null; user_id: string | null;
      fp_id: string | null; avatar_url: string | null;
      person_type: 'freelancer' | 'internal' | null;
      jobs: Record<string, any>[];
    };
    const ownerMap = new Map<string, OwnerEntry>();
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
          fp_id: row.owner_fp_id as string | null,
          avatar_url: row.owner_avatar_url && row.owner_fp_id
            ? `/api/proxy/freelancers/${row.owner_fp_id}/avatar`
            : null,
          person_type: row.owner_fp_id
            ? (row.owner_avatar_url ? 'freelancer' : 'internal') // fp exists = known user; use avatar as freelancer heuristic
            : (row.owner_user_id ? 'internal' : null),
          jobs: [],
        });
      }
      ownerMap.get(key)!.jobs.push(job);
    }

    const ALLOCABLE_FREELANCER = 16 * 60;  // 16h/week
    const ALLOCABLE_INTERNAL   = 28 * 60;  // 28h/week
    const owners = Array.from(ownerMap.values()).map((m) => {
      const isFreelancer = m.person_type === 'freelancer';
      const allocable = isFreelancer ? ALLOCABLE_FREELANCER : ALLOCABLE_INTERNAL;
      const committed = m.jobs.reduce((s, j) => s + (j.estimated_minutes ?? 120), 0);
      return {
        owner: {
          id: m.user_id ?? m.email ?? m.name,
          name: m.name,
          email: m.email,
          avatar_url: m.avatar_url,
          role: isFreelancer ? 'freelancer' : 'staff',
          specialty: null,
          person_type: m.person_type ?? 'internal',
          freelancer_profile_id: m.fp_id,
        },
        allocable_minutes: allocable,
        committed_minutes: committed,
        tentative_minutes: 0,
        usage: Math.min(2, committed / allocable),
        jobs: m.jobs,
      };
    });

    return reply.send({ data: { owners, unassigned_jobs: unassigned } });
  });

  // GET /trello/ops-calendar — cards grouped by due_date for the Agenda tab
  app.get('/trello/ops-calendar', { preHandler: [authGuard] }, async (request: TR, reply) => {
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
         m.ops_status as override_status,
         pb.id as board_id, pb.name as board_name, pb.client_id,
         cl.name as client_name, NULL::text as client_logo_url, NULL::text as client_brand_color,
         (SELECT pcm.display_name FROM project_card_members pcm WHERE pcm.card_id = pc.id LIMIT 1) as owner_name,
         (SELECT pcm.email FROM project_card_members pcm WHERE pcm.card_id = pc.id LIMIT 1) as owner_email,
         (SELECT eu.id FROM project_card_members pcm
          JOIN edro_users eu ON LOWER(eu.email) = LOWER(pcm.email)
          WHERE pcm.card_id = pc.id LIMIT 1) as owner_user_id
       FROM project_cards pc
       JOIN project_lists pl ON pl.id = pc.list_id
       LEFT JOIN trello_list_status_map m ON m.list_id = pl.id AND m.tenant_id = $1
       JOIN project_boards pb ON pb.id = pc.board_id
       LEFT JOIN clients cl ON cl.id::text = pb.client_id
       WHERE pc.tenant_id = $1
         AND pc.is_archived = false
         AND ${currentYearCardClause('pc')}
         AND pl.is_archived = false
         AND pc.due_date BETWEEN $2::date AND $3::date
       ORDER BY pc.due_date ASC, pc.position ASC`,
      [tenantId, windowStart.toISOString().slice(0, 10), windowEnd.toISOString().slice(0, 10)],
    );

    const dayMap = new Map<string, Record<string, any>[]>();
    for (const row of rows) {
      const day = String(row.due_date).slice(0, 10);
      if (!dayMap.has(day)) dayMap.set(day, []);
      dayMap.get(day)!.push(_cardToJob(row));
    }

    const days = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, jobs]) => ({ day, jobs, layerSummary: [] }));

    return reply.send({ data: { days } });
  });

  // GET /trello/ops-suggest-owner/:cardId — ranked list of best people for this card
  app.get('/trello/ops-suggest-owner/:cardId', { preHandler: [authGuard] }, async (request: TR, reply) => {
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

    // Batch all scoring queries — 3 queries total regardless of member count
    const emails = members.map((m) => m.email.toLowerCase());

    // 1. Active cards per member (excluding the card being evaluated)
    const { rows: loadRows } = await query<{ email: string; count: string }>(
      `SELECT LOWER(pcm.email) as email, COUNT(*)::text as count
       FROM project_card_members pcm
       JOIN project_cards pc ON pc.id = pcm.card_id
       JOIN project_boards pb ON pb.id = pc.board_id
       WHERE pb.tenant_id = $1
         AND pc.is_archived = false
         AND pc.id != $2
         AND LOWER(pcm.email) = ANY($3::text[])
       GROUP BY LOWER(pcm.email)`,
      [tenantId, cardId, emails],
    );
    const loadMap = new Map(loadRows.map((r) => [r.email, parseInt(r.count, 10)]));

    // 2. SLA history — last 90 days, all members at once
    const { rows: slaRows } = await query<{ email: string; met: string; total: string }>(
      `SELECT
         LOWER(pcm.email) as email,
         COUNT(*) FILTER (WHERE pc.due_complete = true)::text as met,
         COUNT(*)::text as total
       FROM project_card_members pcm
       JOIN project_cards pc ON pc.id = pcm.card_id
       JOIN project_boards pb ON pb.id = pc.board_id
       WHERE pb.tenant_id = $1
         AND pc.due_date IS NOT NULL
         AND pc.due_date >= now()::date - interval '90 days'
         AND LOWER(pcm.email) = ANY($2::text[])
       GROUP BY LOWER(pcm.email)`,
      [tenantId, emails],
    );
    const slaMap = new Map(slaRows.map((r) => [r.email, { met: parseInt(r.met, 10), total: parseInt(r.total, 10) }]));

    // 3. Specialty match — only fired when card has design/video labels
    const specialtyMap = new Map<string, number>();
    if (isDesign || isVideo) {
      const labelFilter = isDesign ? '%design%' : '%video%';
      const { rows: spRows } = await query<{ email: string; count: string }>(
        `SELECT LOWER(pcm.email) as email, COUNT(*)::text as count
         FROM project_card_members pcm
         JOIN project_cards pc ON pc.id = pcm.card_id
         JOIN project_boards pb ON pb.id = pc.board_id
         WHERE pb.tenant_id = $1
           AND pc.labels::text ILIKE $2
           AND LOWER(pcm.email) = ANY($3::text[])
         GROUP BY LOWER(pcm.email)`,
        [tenantId, labelFilter, emails],
      );
      for (const r of spRows) specialtyMap.set(r.email, parseInt(r.count, 10));
    }

    // Score each member synchronously using pre-fetched data
    const scored = members.map((m) => {
      const emailLower = m.email.toLowerCase();
      const activeCards = loadMap.get(emailLower) ?? 0;
      const sla = slaMap.get(emailLower);
      const slaTotal = sla?.total ?? 0;
      const slaMet   = sla?.met   ?? 0;
      const slaRate  = slaTotal >= 3 ? Math.round((slaMet / slaTotal) * 100) : null;

      let specialtyScore = 65; // neutral
      if (isDesign || isVideo) {
        const match = specialtyMap.get(emailLower) ?? 0;
        specialtyScore = match >= 2 ? 90 : match === 1 ? 75 : 45;
      }

      const loadScore = Math.max(0, 100 - activeCards * 18);
      const slaScore  = slaRate ?? 70;
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
    });

    scored.sort((a, b) => b.score - a.score);
    return reply.send({ suggestions: scored.slice(0, 5) });
  });

  // POST /trello/ops-cards/:cardId/comments — post an internal comment
  app.post('/trello/ops-cards/:cardId/comments', { preHandler: [authGuard] }, async (request: TR, reply) => {
    const { cardId } = request.params as { cardId: string };
    const tenantId = request.user?.tenant_id as string;
    const userId = (request.user?.sub || request.user?.id || null) as string | null;
    const { body: commentBody } = z.object({ body: z.string().min(1).max(5000) }).parse(request.body);

    // Verify card belongs to tenant
    const { rows: cardRows } = await query<{ id: string }>(
      `SELECT id FROM project_cards WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [cardId, tenantId],
    );
    if (!cardRows.length) return reply.status(404).send({ error: 'Card não encontrado.' });

    // Resolve author name from edro_users
    let authorName: string | null = null;
    if (userId) {
      const { rows: uRows } = await query<{ name: string | null; email: string | null }>(
        `SELECT name, email FROM edro_users WHERE id = $1 LIMIT 1`, [userId],
      );
      if (uRows[0]) authorName = uRows[0].name || (uRows[0].email ? uRows[0].email.split('@')[0] : null);
    }

    const { rows } = await query<{ id: string; body: string; author_name: string | null; commented_at: string }>(
      `INSERT INTO project_card_comments (card_id, tenant_id, body, author_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, body, author_name, commented_at`,
      [cardId, tenantId, commentBody, authorName],
    );

    return reply.status(201).send({ data: { ...rows[0], created_at: rows[0].commented_at } });
  });

  // POST /trello/ops-cards/:cardId/assign — assign member + sync to Trello
  app.post('/trello/ops-cards/:cardId/assign', { preHandler: [authGuard] }, async (request: TR, reply) => {
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
          const syncRes = await fetch(`https://api.trello.com/1/cards/${trelloCardId}/idMembers?${params}`, {
            method: 'POST',
            signal: AbortSignal.timeout(8_000),
          });
          if (!syncRes.ok) console.warn('[trello] assign member sync-back failed:', syncRes.status, await syncRes.text().catch(() => ''));
        }
      } catch (err: any) {
        console.warn('[trello] assign member sync failed:', err?.message);
      }
    }

    return reply.send({ ok: true, display_name, email });
  });

  // GET /trello/ops-sla — SLA metrics derived from due_date + due_complete
  app.get('/trello/ops-sla', { preHandler: [authGuard] }, async (request: TR, reply) => {
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
    type TypeBucket = { type_key: string; type_label: string; met: number; missed: number; total: number; totalVariance: number };

    let met = 0, missed = 0, open = 0;
    let totalVarianceDays = 0, varianceCount = 0;
    const byClientMap = new Map<string, ClientBucket>();
    const byOwnerMap = new Map<string, OwnerBucket>();
    const byTypeMap = new Map<string, TypeBucket>();
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

      const deliveryType = inferSlaDeliveryType({
        title: c.title as string | null,
        labels: Array.isArray(c.labels) ? (c.labels as Array<{ name?: string | null }>) : [],
      });
      if (!byTypeMap.has(deliveryType.key)) {
        byTypeMap.set(deliveryType.key, {
          type_key: deliveryType.key,
          type_label: deliveryType.label,
          met: 0,
          missed: 0,
          total: 0,
          totalVariance: 0,
        });
      }
      const typeBucket = byTypeMap.get(deliveryType.key)!;
      if (kind !== 'open') {
        typeBucket.total++;
        if (kind === 'met') typeBucket.met++;
        else {
          typeBucket.missed++;
          typeBucket.totalVariance += varianceDays;
        }
      }

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
        by_type: Array.from(byTypeMap.values())
          .filter((r) => r.total > 0)
          .map((r) => ({
            type_key: r.type_key,
            type_label: r.type_label,
            met: r.met,
            missed: r.missed,
            total: r.total,
            rate: r.total > 0 ? Math.round(r.met / r.total * 100) : null,
            avg_days_variance: r.missed > 0 ? Math.round(r.totalVariance / r.missed * 10) / 10 : 0,
          }))
          .sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0)),
        worst_misses: worstMisses
          .sort((a, b) => (b.days_variance as number) - (a.days_variance as number))
          .slice(0, 10),
      },
    });
  });

  // GET /trello/ops-team-scores — production score per member for the Equipe grid
  app.get('/trello/ops-team-scores', { preHandler: [authGuard] }, async (request: TR, reply) => {
    const tenantId = request.user?.tenant_id as string;

    // All distinct members linked to cards of this tenant
    const { rows: members } = await query<{
      email: string;
      display_name: string;
      trello_member_id: string | null;
      freelancer_id: string | null;
    }>(
      `SELECT DISTINCT
         pcm.email,
         pcm.display_name,
         pcm.trello_member_id,
         f.id as freelancer_id
       FROM project_card_members pcm
       JOIN project_cards pc ON pc.id = pcm.card_id
       JOIN project_boards pb ON pb.id = pc.board_id
       LEFT JOIN edro_users fu ON LOWER(fu.email) = LOWER(pcm.email)
       LEFT JOIN freelancer_profiles f ON f.user_id = fu.id
       WHERE pb.tenant_id = $1 AND pcm.display_name IS NOT NULL
       ORDER BY pcm.display_name`,
      [tenantId],
    );

    const now = new Date();
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

    if (!members.length) return reply.send({ data: [] });
    const emails = members.map((m) => m.email?.toLowerCase()).filter(Boolean) as string[];

    // Batch all 5 scoring queries — O(5) total instead of O(5N)

    // Pattern matching done lists by name (same logic as listNameToOpsStatus)
    const DONE_LIST_PATTERN = 'conclu|done|fechad|arquivad|closed|finaliz|finish|publicad|entregue|delivered|published';

    const [activeRes, doneRes, slaRes, lastRes, labelRes] = await Promise.all([
      // 1. Active non-completed cards per member (not in done list)
      query<{ email: string; count: string }>(
        `SELECT LOWER(pcm.email) as email, COUNT(*) as count
         FROM project_card_members pcm
         JOIN project_cards pc ON pc.id = pcm.card_id
         JOIN project_lists pl ON pl.id = pc.list_id
         JOIN project_boards pb ON pb.id = pc.board_id
         WHERE pb.tenant_id = $1
           AND pc.is_archived = false AND pl.is_archived = false
           AND NOT (lower(pc.list_name) ~* $3)
           AND LOWER(pcm.email) = ANY($2::text[])
         GROUP BY LOWER(pcm.email)`,
        [tenantId, emails, DONE_LIST_PATTERN],
      ),
      // 2. Cards completed this month per member (in done list)
      query<{ email: string; count: string }>(
        `SELECT LOWER(pcm.email) as email, COUNT(*) as count
         FROM project_card_members pcm
         JOIN project_cards pc ON pc.id = pcm.card_id
         JOIN project_boards pb ON pb.id = pc.board_id
         WHERE pb.tenant_id = $1
           AND lower(pc.list_name) ~* $4
           AND pc.updated_at >= $2::date
           AND LOWER(pcm.email) = ANY($3::text[])
         GROUP BY LOWER(pcm.email)`,
        [tenantId, monthStart, emails, DONE_LIST_PATTERN],
      ),
      // 3. SLA history last 30d per member (in done list with due_date)
      query<{ email: string; total: string; met: string; avg_variance: string }>(
        `SELECT
           LOWER(pcm.email) as email,
           COUNT(*) FILTER (WHERE pc.due_date IS NOT NULL) as total,
           COUNT(*) FILTER (WHERE pc.due_date IS NOT NULL
             AND pc.updated_at::date <= pc.due_date::date) as met,
           AVG(EXTRACT(EPOCH FROM (pc.updated_at - pc.due_date::timestamptz)) / 86400.0)
             FILTER (WHERE pc.due_date IS NOT NULL) as avg_variance
         FROM project_card_members pcm
         JOIN project_cards pc ON pc.id = pcm.card_id
         JOIN project_boards pb ON pb.id = pc.board_id
         WHERE pb.tenant_id = $1
           AND lower(pc.list_name) ~* $4
           AND pc.updated_at >= $2
           AND LOWER(pcm.email) = ANY($3::text[])
         GROUP BY LOWER(pcm.email)`,
        [tenantId, thirtyDaysAgo.toISOString(), emails, DONE_LIST_PATTERN],
      ),
      // 4. Last completed card per member (in done list)
      query<{ email: string; updated_at: string; title: string }>(
        `SELECT DISTINCT ON (LOWER(pcm.email))
           LOWER(pcm.email) as email, pc.updated_at, pc.title
         FROM project_card_members pcm
         JOIN project_cards pc ON pc.id = pcm.card_id
         JOIN project_boards pb ON pb.id = pc.board_id
         WHERE pb.tenant_id = $1
           AND lower(pc.list_name) ~* $3
           AND LOWER(pcm.email) = ANY($2::text[])
         ORDER BY LOWER(pcm.email), pc.updated_at DESC`,
        [tenantId, emails, DONE_LIST_PATTERN],
      ),
      // 5. Label text aggregated per member for job type inference
      query<{ email: string; label_text: string }>(
        `SELECT LOWER(pcm.email) as email,
           string_agg(LOWER(l.value->>'name'), ' ') as label_text
         FROM project_card_members pcm
         JOIN project_cards pc ON pc.id = pcm.card_id
         JOIN project_boards pb ON pb.id = pc.board_id
         CROSS JOIN LATERAL jsonb_array_elements(COALESCE(pc.labels, '[]'::jsonb)) AS l(value)
         WHERE pb.tenant_id = $1
           AND pc.is_archived = false
           AND LOWER(pcm.email) = ANY($2::text[])
         GROUP BY LOWER(pcm.email)`,
        [tenantId, emails],
      ),
    ]);

    const activeMap = new Map(activeRes.rows.map((r) => [r.email, parseInt(r.count, 10)]));
    const doneMap   = new Map(doneRes.rows.map((r) => [r.email, parseInt(r.count, 10)]));
    const slaMap    = new Map(slaRes.rows.map((r) => [r.email, r]));
    const lastMap   = new Map(lastRes.rows.map((r) => [r.email, r]));
    const labelMap  = new Map(labelRes.rows.map((r) => [r.email, r.label_text ?? '']));

    const scores = members.map((m) => {
      const email = m.email?.toLowerCase() ?? '';
      const activeCards    = activeMap.get(email) ?? 0;
      const completedMonth = doneMap.get(email) ?? 0;
      const sla = slaMap.get(email);
      const slaTotal   = parseInt(sla?.total ?? '0', 10);
      const slaMet     = parseInt(sla?.met   ?? '0', 10);
      const slaRate    = slaTotal > 0 ? Math.round((slaMet / slaTotal) * 100) : null;
      const avgVariance = sla?.avg_variance != null ? Math.round(parseFloat(sla.avg_variance) * 10) / 10 : null;
      const last = lastMap.get(email);
      const labelText = labelMap.get(email) ?? '';
      const jobTypePrimary = /design|arte|artes|visual|criativo/.test(labelText) ? 'design'
        : /video|vídeo|reels|stories/.test(labelText) ? 'video'
        : 'copy';

      const loadScore    = Math.max(0, 100 - activeCards * 15);
      const slaScore     = slaRate ?? 65;
      const deliveryScore = Math.min(100, completedMonth * 12);
      const score = Math.round(loadScore * 0.40 + slaScore * 0.40 + deliveryScore * 0.20);

      return {
        email: m.email,
        display_name: m.display_name,
        trello_member_id: m.trello_member_id,
        freelancer_id: m.freelancer_id,
        active_cards: activeCards,
        completed_month: completedMonth,
        sla_rate: slaRate,
        avg_days_variance: avgVariance,
        last_completed_at: last?.updated_at ?? null,
        last_completed_title: last?.title ?? null,
        job_type_primary: jobTypePrimary,
        score,
      };
    });

    return reply.send({ data: scores.sort((a, b) => b.score - a.score) });
  });

  // ── Collaborator profile by trello_member_id ───────────────────────────────
  app.get('/trello/member-profile/:trelloId', { preHandler: [authGuard] }, async (request: TR, reply) => {
    const { trelloId } = request.params as { trelloId: string };
    const tenantId = request.user?.tenant_id;

    // Member info
    const memberRes = await query<{
      display_name: string; email: string | null; trello_member_id: string;
      freelancer_id: string | null;
    }>(
      `SELECT DISTINCT ON (pcm.trello_member_id)
         pcm.display_name, pcm.email, pcm.trello_member_id, pcm.avatar_url,
         f.id AS freelancer_id,
         f.specialty, f.role_title, f.experience_level, f.skills, f.ai_tools, f.portfolio_url
       FROM project_card_members pcm
       JOIN project_cards pc ON pc.id = pcm.card_id
       JOIN project_boards pb ON pb.id = pc.board_id
       LEFT JOIN edro_users fu ON LOWER(fu.email) = LOWER(pcm.email)
       LEFT JOIN freelancer_profiles f ON f.user_id = fu.id
       WHERE pb.tenant_id = $1
         AND pcm.trello_member_id = $2
       ORDER BY pcm.trello_member_id, pcm.avatar_url DESC NULLS LAST`,
      [tenantId, trelloId],
    );
    if (!memberRes.rows.length) return reply.status(404).send({ error: 'Membro não encontrado' });
    const member = memberRes.rows[0];

    // Which boards is this member active on?
    const boardsRes = await query<{ board_id: string; board_name: string; active_count: number }>(
      `SELECT pb.id AS board_id, pb.name AS board_name, COUNT(pc.id)::int AS active_count
         FROM project_card_members pcm
         JOIN project_cards pc ON pc.id = pcm.card_id
         JOIN project_boards pb ON pb.id = pc.board_id
        WHERE pb.tenant_id = $1
          AND pcm.trello_member_id = $2
          AND pc.is_archived = false
          AND NOT (lower(pc.list_name) ~* $3)
        GROUP BY pb.id, pb.name
        ORDER BY active_count DESC`,
      [tenantId, trelloId, 'conclu|done|fechad|arquivad|closed|finaliz|finish|publicad|entregue|delivered|published'],
    );

    const DONE_LIST_PAT = 'conclu|done|fechad|arquivad|closed|finaliz|finish|publicad|entregue|delivered|published';

    // Active cards (not in a done list, not archived)
    const activeRes = await query<{
      id: string; title: string; due_date: string | null; board_name: string;
      list_name: string | null; labels: any;
    }>(
      `SELECT pc.id, pc.title, pc.due_date,
              pb.name AS board_name,
              pc.list_name,
              pc.labels
         FROM project_card_members pcm
         JOIN project_cards pc ON pc.id = pcm.card_id
         JOIN project_boards pb ON pb.id = pc.board_id
        WHERE pb.tenant_id = $1
          AND pcm.trello_member_id = $2
          AND pc.is_archived = false
          AND NOT (lower(pc.list_name) ~* $3)
        ORDER BY pc.due_date ASC NULLS LAST
        LIMIT 50`,
      [tenantId, trelloId, DONE_LIST_PAT],
    );

    // Completed cards (in a done list, last 60 days)
    const doneRes = await query<{
      id: string; title: string; due_date: string | null; updated_at: string;
      board_name: string; list_name: string | null; labels: any;
    }>(
      `SELECT pc.id, pc.title, pc.due_date, pc.updated_at,
              pb.name AS board_name,
              pc.list_name,
              pc.labels
         FROM project_card_members pcm
         JOIN project_cards pc ON pc.id = pcm.card_id
         JOIN project_boards pb ON pb.id = pc.board_id
        WHERE pb.tenant_id = $1
          AND pcm.trello_member_id = $2
          AND lower(pc.list_name) ~* $3
          AND pc.updated_at > now() - interval '60 days'
        ORDER BY pc.updated_at DESC
        LIMIT 40`,
      [tenantId, trelloId, DONE_LIST_PAT],
    );

    // Score metrics
    const totalDone = doneRes.rows.length;
    const totalActive = activeRes.rows.length;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const completedMonth = doneRes.rows.filter(
      (r) => r.updated_at && new Date(r.updated_at) >= monthStart,
    ).length;

    const lateCards = doneRes.rows.filter((r) => {
      if (!r.due_date || !r.updated_at) return false;
      return new Date(r.updated_at) > new Date(r.due_date);
    }).length;
    const slaRate = totalDone > 0 ? Math.round(((totalDone - lateCards) / totalDone) * 100) : null;

    const loadScore    = Math.max(0, 100 - totalActive * 15);
    const slaScore     = slaRate ?? 65;
    const deliveryScore = Math.min(100, completedMonth * 12);
    const score = Math.round(loadScore * 0.40 + slaScore * 0.40 + deliveryScore * 0.20);

    return reply.send({
      member,
      activeCards: activeRes.rows,
      completedCards: doneRes.rows,
      boards: boardsRes.rows,
      metrics: {
        score,
        active_cards: totalActive,
        completed_month: completedMonth,
        sla_rate: slaRate,
        total_done_60d: totalDone,
      },
    });
  });

  // ── Milestones ─────────────────────────────────────────────────────────────

  // GET /trello/milestones?board_id=&from=&to=
  app.get('/trello/milestones', { preHandler: authGuard }, async (request: TR, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const q = z.object({
      board_id: z.string().uuid().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }).parse(request.query);

    const conditions: string[] = ['m.tenant_id = $1'];
    const vals: unknown[] = [tenantId];
    let idx = 2;

    if (q.board_id) { conditions.push(`m.board_id = $${idx++}`); vals.push(q.board_id); }
    if (q.from)     { conditions.push(`m.date >= $${idx++}`);    vals.push(q.from); }
    if (q.to)       { conditions.push(`m.date <= $${idx++}`);    vals.push(q.to); }

    const { rows } = await query<Record<string, any>>(
      `SELECT m.*, pb.name as board_name, pb.client_id
       FROM project_milestones m
       JOIN project_boards pb ON pb.id = m.board_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY m.date ASC`,
      vals,
    );
    return reply.send({ milestones: rows });
  });

  // POST /trello/milestones
  app.post('/trello/milestones', { preHandler: [authGuard, requirePerm('admin')] }, async (request: TR, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const body = z.object({
      board_id: z.string().uuid(),
      title: z.string().min(1),
      date: z.string(),
      color: z.string().optional(),
    }).parse(request.body);

    const { rows } = await query<{ id: string }>(
      `INSERT INTO project_milestones (board_id, tenant_id, title, date, color)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [body.board_id, tenantId, body.title, body.date, body.color ?? '#5D87FF'],
    );
    return reply.status(201).send({ ok: true, id: rows[0].id });
  });

  // PATCH /trello/milestones/:id
  app.patch('/trello/milestones/:id', { preHandler: [authGuard, requirePerm('admin')] }, async (request: TR, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.user?.tenant_id as string;
    const body = z.object({
      title: z.string().min(1).optional(),
      date: z.string().optional(),
      color: z.string().optional(),
      is_done: z.boolean().optional(),
    }).parse(request.body);

    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    for (const [key, val] of Object.entries(body)) {
      if (val !== undefined) { sets.push(`${key} = $${i++}`); vals.push(val); }
    }
    if (!sets.length) return reply.send({ ok: true });
    sets.push(`updated_at = now()`);
    vals.push(id, tenantId);
    await query(
      `UPDATE project_milestones SET ${sets.join(', ')} WHERE id = $${i} AND tenant_id = $${i + 1}`,
      vals,
    );
    return reply.send({ ok: true });
  });

  // DELETE /trello/milestones/:id
  app.delete('/trello/milestones/:id', { preHandler: [authGuard, requirePerm('admin')] }, async (request: TR, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.user?.tenant_id as string;
    await query(`DELETE FROM project_milestones WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    return reply.send({ ok: true });
  });

  // ── Card dependencies ──────────────────────────────────────────────────────

  // POST /trello/cards/:cardId/dependencies — add a dependency
  app.post('/trello/cards/:cardId/dependencies', { preHandler: [authGuard, requirePerm('admin')] }, async (request: TR, reply) => {
    const { cardId } = request.params as { cardId: string };
    const tenantId = request.user?.tenant_id as string;
    const body = z.object({ depends_on_id: z.string().uuid() }).parse(request.body);

    if (body.depends_on_id === cardId) return reply.status(400).send({ error: 'Um card não pode depender de si mesmo.' });

    await query(
      `INSERT INTO project_card_dependencies (card_id, depends_on_id, tenant_id)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [cardId, body.depends_on_id, tenantId],
    );
    return reply.status(201).send({ ok: true });
  });

  // DELETE /trello/cards/:cardId/dependencies/:dependsOnId
  app.delete('/trello/cards/:cardId/dependencies/:dependsOnId', { preHandler: [authGuard, requirePerm('admin')] }, async (request: TR, reply) => {
    const { cardId, dependsOnId } = request.params as { cardId: string; dependsOnId: string };
    const tenantId = request.user?.tenant_id as string;
    await query(
      `DELETE FROM project_card_dependencies WHERE card_id = $1 AND depends_on_id = $2 AND tenant_id = $3`,
      [cardId, dependsOnId, tenantId],
    );
    return reply.send({ ok: true });
  });

  // GET /trello/cards/:cardId/dependencies
  app.get('/trello/cards/:cardId/dependencies', { preHandler: authGuard }, async (request: TR, reply) => {
    const { cardId } = request.params as { cardId: string };
    const tenantId = request.user?.tenant_id as string;
    const { rows } = await query<Record<string, any>>(
      `SELECT d.depends_on_id, pc.title, pc.due_date, pc.due_complete, pc.start_date, pc.priority
       FROM project_card_dependencies d
       JOIN project_cards pc ON pc.id = d.depends_on_id
       WHERE d.card_id = $1 AND d.tenant_id = $2
       ORDER BY pc.start_date ASC`,
      [cardId, tenantId],
    );
    return reply.send({ dependencies: rows });
  });

  // ── Gantt ──────────────────────────────────────────────────────────────────

  // GET /trello/gantt?from=YYYY-MM-DD&to=YYYY-MM-DD&group_by=client|collaborator|none
  app.get('/trello/gantt', { preHandler: authGuard }, async (request: TR, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const q = z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      group_by: z.enum(['client', 'collaborator', 'none']).optional().default('none'),
      board_id: z.string().uuid().optional(),
    }).parse(request.query);

    // Default window: today -30d → +90d
    const from = q.from ?? new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
    const to   = q.to   ?? new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10);

    const cardConditions: string[] = [
      'pc.tenant_id = $1',
      'pc.is_archived = false',
      `(pc.start_date <= $3 OR pc.start_date IS NULL)`,
      `(pc.due_date >= $2 OR pc.due_date IS NULL)`,
    ];
    const cardVals: unknown[] = [tenantId, from, to];
    let ci = 4;
    if (q.board_id) { cardConditions.push(`pc.board_id = $${ci++}`); cardVals.push(q.board_id); }

    const { rows: cards } = await query<Record<string, any>>(
      `SELECT
         pc.id, pc.title, pc.description,
         pc.start_date::text, pc.due_date::text, pc.completed_at,
         pc.due_complete, pc.priority, pc.estimated_hours,
         pc.labels, pc.parent_card_id,
         pc.board_id, pb.name as board_name,
         pb.client_id, cl.name as client_name,
         (SELECT pcm.display_name
            FROM project_card_members pcm
           WHERE pcm.card_id = pc.id ORDER BY pcm.created_at ASC LIMIT 1) as owner_name,
         (SELECT pcm.email
            FROM project_card_members pcm
           WHERE pcm.card_id = pc.id ORDER BY pcm.created_at ASC LIMIT 1) as owner_email,
         (SELECT fp.id
            FROM project_card_members pcm
            JOIN freelancer_profiles fp ON fp.user_id = (
              SELECT eu.id FROM edro_users eu WHERE LOWER(eu.email) = LOWER(pcm.email) LIMIT 1
            )
           WHERE pcm.card_id = pc.id ORDER BY pcm.created_at ASC LIMIT 1) as owner_fp_id,
         (SELECT fp.avatar_url
            FROM project_card_members pcm
            JOIN edro_users eu ON LOWER(eu.email) = LOWER(pcm.email)
            JOIN freelancer_profiles fp ON fp.user_id = eu.id
           WHERE pcm.card_id = pc.id ORDER BY pcm.created_at ASC LIMIT 1) as owner_avatar_url
       FROM project_cards pc
       JOIN project_boards pb ON pb.id = pc.board_id
       LEFT JOIN clients cl ON cl.id::text = pb.client_id
       WHERE ${cardConditions.join(' AND ')}
       ORDER BY COALESCE(pc.start_date, pc.created_at::date) ASC`,
      cardVals,
    );

    // Milestones in range
    const { rows: milestones } = await query<Record<string, any>>(
      `SELECT m.id, m.title, m.date::text, m.color, m.is_done,
              m.board_id, pb.name as board_name, pb.client_id, cl.name as client_name
       FROM project_milestones m
       JOIN project_boards pb ON pb.id = m.board_id
       LEFT JOIN clients cl ON cl.id::text = pb.client_id
       WHERE m.tenant_id = $1 AND m.date BETWEEN $2 AND $3
         ${q.board_id ? `AND m.board_id = $4` : ''}
       ORDER BY m.date ASC`,
      q.board_id ? [tenantId, from, to, q.board_id] : [tenantId, from, to],
    );

    // Dependencies for the cards in view
    const cardIds = cards.map((c: any) => c.id);
    let dependencies: any[] = [];
    if (cardIds.length > 0) {
      const { rows: deps } = await query<Record<string, any>>(
        `SELECT card_id, depends_on_id
         FROM project_card_dependencies
         WHERE tenant_id = $1
           AND card_id = ANY($2::uuid[])
           AND depends_on_id = ANY($2::uuid[])`,
        [tenantId, cardIds],
      );
      dependencies = deps;
    }

    // Normalize: proxy avatar through backend
    const normalizedCards = cards.map((c: any) => ({
      ...c,
      owner_avatar_url: c.owner_avatar_url && c.owner_fp_id
        ? `/api/proxy/freelancers/${c.owner_fp_id}/avatar`
        : c.owner_avatar_url ?? null,
    }));

    return reply.send({
      from,
      to,
      group_by: q.group_by,
      cards: normalizedCards,
      milestones,
      dependencies,
    });
  });
}
