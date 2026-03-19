/**
 * Trello Sync Service
 *
 * Responsável por importar dados do Trello para o schema nativo do Edro.
 * Fluxo: boards → lists → cards → checklists → members → comments (actions).
 *
 * O schema Edro é independente do Trello — desconectar o Trello não quebra nada.
 */

import { query } from '../db';

const TRELLO_BASE = 'https://api.trello.com/1';

interface TrelloCredentials {
  apiKey: string;
  apiToken: string;
}

// ─── Trello API helpers ──────────────────────────────────────────────────────

function trelloUrl(path: string, creds: TrelloCredentials, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams({
    key: creds.apiKey,
    token: creds.apiToken,
    ...extra,
  });
  return `${TRELLO_BASE}${path}?${params}`;
}

async function trelloGet<T>(path: string, creds: TrelloCredentials, extra: Record<string, string> = {}): Promise<T> {
  const res = await fetch(trelloUrl(path, creds, extra), {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Trello API ${path} → ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TrelloBoard {
  id: string;
  name: string;
  desc: string;
  url: string;
  closed: boolean;
}

export interface TrelloList {
  id: string;
  name: string;
  closed: boolean;
  pos: number;
}

export interface TrelloCard {
  id: string;
  idList: string;
  name: string;
  desc: string;
  pos: number;
  due: string | null;
  dueComplete: boolean;
  labels: { color: string; name: string }[];
  cover: { color: string | null };
  closed: boolean;
  url: string;
  shortLink: string;
  idMembers: string[];
}

export interface TrelloMember {
  id: string;
  fullName: string;
  username: string;
  email?: string;
  avatarUrl?: string;
}

export interface TrelloChecklist {
  id: string;
  idCard: string;
  name: string;
  checkItems: { id: string; name: string; state: 'incomplete' | 'complete' }[];
}

export interface TrelloAction {
  id: string;
  type: string;
  date: string;
  memberCreator: { id: string; fullName: string; avatarUrl?: string };
  data: {
    text?: string;
    card?: { id: string };
    listBefore?: { id: string; name: string };
    listAfter?:  { id: string; name: string };
  };
}

// ─── Public: list available boards ──────────────────────────────────────────

export async function listTrelloBoards(tenantId: string): Promise<TrelloBoard[]> {
  const creds = await getConnectorCreds(tenantId);
  return trelloGet<TrelloBoard[]>('/members/me/boards', creds, {
    filter: 'open',
    fields: 'id,name,desc,url,closed',
  });
}

// ─── Public: validate credentials ───────────────────────────────────────────

export async function validateTrelloCredentials(apiKey: string, apiToken: string): Promise<{ memberId: string; fullName: string }> {
  const creds = { apiKey, apiToken };
  const member = await trelloGet<{ id: string; fullName: string }>('/members/me', creds, {
    fields: 'id,fullName',
  });
  return { memberId: member.id, fullName: member.fullName };
}

// ─── Public: upsert connector ───────────────────────────────────────────────

export async function upsertTrelloConnector(
  tenantId: string,
  apiKey: string,
  apiToken: string,
): Promise<{ memberId: string; fullName: string }> {
  const info = await validateTrelloCredentials(apiKey, apiToken);

  await query(
    `INSERT INTO trello_connectors (tenant_id, api_key, api_token, member_id, is_active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (tenant_id)
     DO UPDATE SET api_key = $2, api_token = $3, member_id = $4, is_active = true, updated_at = now()`,
    [tenantId, apiKey, apiToken, info.memberId],
  );

  return info;
}

// ─── Public: full board sync ─────────────────────────────────────────────────

export async function syncTrelloBoard(
  tenantId: string,
  trelloBoardId: string,
  clientId?: string,
): Promise<{ boardId: string; cardsSync: number; actionsSync: number }> {
  const creds = await getConnectorCreds(tenantId);

  // Start log
  const logRes = await query<{ id: string }>(
    `INSERT INTO trello_sync_log (tenant_id, trello_board_id, status, started_at)
     VALUES ($1, $2, 'running', now()) RETURNING id`,
    [tenantId, trelloBoardId],
  );
  const logId = logRes.rows[0].id;

  try {
    // 1. Fetch board info
    const board = await trelloGet<TrelloBoard>(`/boards/${trelloBoardId}`, creds, {
      fields: 'id,name,desc,url,closed',
    });

    // 2. Upsert project_board
    const boardRes = await query<{ id: string }>(
      `INSERT INTO project_boards (tenant_id, client_id, name, description, trello_board_id, trello_url, last_synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (tenant_id, trello_board_id)
       DO UPDATE SET name = $3, description = $4, trello_url = $6, last_synced_at = now(), updated_at = now()
       RETURNING id`,
      [tenantId, clientId ?? null, board.name, board.desc ?? null, board.id, board.url],
    );
    const boardId = boardRes.rows[0].id;

    // Update log with board reference
    await query(`UPDATE trello_sync_log SET board_id = $1 WHERE id = $2`, [boardId, logId]);

    // 3. Fetch lists
    const lists = await trelloGet<TrelloList[]>(`/boards/${trelloBoardId}/lists`, creds, {
      fields: 'id,name,closed,pos',
    });

    const listIdMap: Record<string, string> = {}; // trello list id → edro list id

    for (const list of lists) {
      const listRes = await query<{ id: string }>(
        `INSERT INTO project_lists (board_id, tenant_id, name, position, is_archived, trello_list_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (board_id, trello_list_id)
         DO UPDATE SET name = $3, position = $4, is_archived = $5, updated_at = now()
         RETURNING id`,
        [boardId, tenantId, list.name, list.pos, list.closed, list.id],
      );
      listIdMap[list.id] = listRes.rows[0].id;
    }

    // 4. Fetch all cards (including archived)
    const cards = await trelloGet<TrelloCard[]>(`/boards/${trelloBoardId}/cards`, creds, {
      filter: 'all',
      fields: 'id,idList,name,desc,pos,due,dueComplete,labels,cover,closed,url,shortLink,idMembers',
    });

    const cardIdMap: Record<string, string> = {}; // trello card id → edro card id
    let cardsSync = 0;

    for (const card of cards) {
      const edroListId = listIdMap[card.idList];
      if (!edroListId) continue; // orphan card

      const cardRes = await query<{ id: string }>(
        `INSERT INTO project_cards
           (list_id, board_id, tenant_id, title, description, position, due_date, due_complete,
            labels, cover_color, is_archived, trello_card_id, trello_url, trello_short_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (board_id, trello_card_id)
         DO UPDATE SET
           list_id = $1, title = $4, description = $5, position = $6,
           due_date = $7, due_complete = $8, labels = $9, cover_color = $10,
           is_archived = $11, trello_url = $13, updated_at = now()
         RETURNING id`,
        [
          edroListId,
          boardId,
          tenantId,
          card.name,
          card.desc || null,
          card.pos,
          card.due ? card.due.split('T')[0] : null,
          card.dueComplete,
          JSON.stringify(card.labels ?? []),
          card.cover?.color ?? null,
          card.closed,
          card.id,
          card.url,
          card.shortLink,
        ],
      );
      cardIdMap[card.id] = cardRes.rows[0].id;
      cardsSync++;
    }

    // 5. Fetch members of the board
    const members = await trelloGet<TrelloMember[]>(`/boards/${trelloBoardId}/members`, creds, {
      fields: 'id,fullName,username,email,avatarUrl',
    });

    // Build trello member id → edro freelancer id map (by email)
    const freelancerMap: Record<string, string> = {};
    for (const m of members) {
      if (m.email) {
        const fRes = await query<{ id: string }>(
          `SELECT id FROM freelancers WHERE tenant_id = $1 AND email = $2 LIMIT 1`,
          [tenantId, m.email],
        );
        if (fRes.rows.length) freelancerMap[m.id] = fRes.rows[0].id;
      }
    }

    // Assign members to cards
    for (const card of cards) {
      const edroCardId = cardIdMap[card.id];
      if (!edroCardId || !card.idMembers?.length) continue;

      for (const memberId of card.idMembers) {
        const m = members.find((x) => x.id === memberId);
        if (!m) continue;
        await query(
          `INSERT INTO project_card_members
             (card_id, tenant_id, freelancer_id, trello_member_id, display_name, avatar_url, email)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (card_id, trello_member_id) DO UPDATE SET
             freelancer_id = $3, display_name = $5, avatar_url = $6, email = $7`,
          [
            edroCardId,
            tenantId,
            freelancerMap[memberId] ?? null,
            memberId,
            m.fullName,
            m.avatarUrl ?? null,
            m.email ?? null,
          ],
        );
      }
    }

    // 6. Fetch checklists
    const checklists = await trelloGet<TrelloChecklist[]>(`/boards/${trelloBoardId}/checklists`, creds, {
      fields: 'id,idCard,name,checkItems',
    });

    for (const cl of checklists) {
      const edroCardId = cardIdMap[cl.idCard];
      if (!edroCardId) continue;

      const items = cl.checkItems.map((item) => ({
        trello_id: item.id,
        text: item.name,
        checked: item.state === 'complete',
      }));

      await query(
        `INSERT INTO project_card_checklists (card_id, tenant_id, name, items, trello_checklist_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (trello_checklist_id)
         DO UPDATE SET name = $3, items = $4, updated_at = now()`,
        [edroCardId, tenantId, cl.name, JSON.stringify(items), cl.id],
      );
    }

    // 7. Fetch ALL actions: comments + card movements (for history analyzer)
    // Trello returns max 1000 per request; we request both types in one call
    const actions = await trelloGet<TrelloAction[]>(`/boards/${trelloBoardId}/actions`, creds, {
      filter: 'commentCard,updateCard',
      limit: '1000',
      fields: 'id,type,date,memberCreator,data',
    });

    // Build a map of trello list id → list name (for movement actions)
    const trelloListNameMap: Record<string, string> = {};
    for (const list of lists) {
      trelloListNameMap[list.id] = list.name;
    }

    let actionsSync = 0;
    for (const action of actions) {
      if (!action.data.card?.id) continue;
      const edroCardId = cardIdMap[action.data.card.id];
      if (!edroCardId) continue;

      if (action.type === 'commentCard' && action.data.text) {
        await query(
          `INSERT INTO project_card_comments
             (card_id, tenant_id, body, author_name, author_avatar, trello_action_id, commented_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (trello_action_id) DO NOTHING`,
          [
            edroCardId,
            tenantId,
            action.data.text,
            action.memberCreator.fullName,
            action.memberCreator.avatarUrl ?? null,
            action.id,
            action.date,
          ],
        );
        actionsSync++;
      } else if (action.type === 'updateCard' && (action.data as any).listAfter) {
        // Card moved between lists — record for history analyzer
        const d = action.data as any;
        const fromListName = d.listBefore?.name ?? trelloListNameMap[d.listBefore?.id] ?? null;
        const toListName   = d.listAfter?.name  ?? trelloListNameMap[d.listAfter?.id]  ?? null;
        if (!toListName) continue;

        await query(
          `INSERT INTO project_card_actions
             (card_id, board_id, tenant_id, action_type, trello_action_id,
              from_list_name, to_list_name, actor_name, occurred_at)
           VALUES ($1, $2, $3, 'moveCard', $4, $5, $6, $7, $8)
           ON CONFLICT (trello_action_id) DO NOTHING`,
          [
            edroCardId, boardId, tenantId, action.id,
            fromListName, toListName,
            action.memberCreator?.fullName ?? null,
            action.date,
          ],
        );
        actionsSync++;
      }
    }

    // Done
    await query(
      `UPDATE trello_sync_log
       SET status = 'done', cards_synced = $1, actions_synced = $2, finished_at = now()
       WHERE id = $3`,
      [cardsSync, actionsSync, logId],
    );

    console.log(`[trelloSync] Board "${board.name}" (${trelloBoardId}): ${cardsSync} cards, ${actionsSync} comments`);
    return { boardId, cardsSync, actionsSync };
  } catch (err: any) {
    await query(
      `UPDATE trello_sync_log SET status = 'error', error_message = $1, finished_at = now() WHERE id = $2`,
      [err?.message ?? 'Unknown error', logId],
    );
    throw err;
  }
}

// ─── Public: sync all boards for tenant ──────────────────────────────────────

export async function syncAllTrelloBoardsForTenant(tenantId: string): Promise<void> {
  const boardsRes = await query<{ id: string; trello_board_id: string; client_id: string | null }>(
    `SELECT id, trello_board_id, client_id FROM project_boards
     WHERE tenant_id = $1 AND trello_board_id IS NOT NULL AND is_archived = false`,
    [tenantId],
  );

  if (!boardsRes.rows.length) return;

  for (const board of boardsRes.rows) {
    try {
      await syncTrelloBoard(tenantId, board.trello_board_id!, board.client_id ?? undefined);
    } catch (err: any) {
      console.error(`[trelloSync] Board ${board.trello_board_id} error:`, err?.message);
    }
  }
}

// ─── Internal ────────────────────────────────────────────────────────────────

async function getConnectorCreds(tenantId: string): Promise<TrelloCredentials> {
  const res = await query<{ api_key: string; api_token: string }>(
    `SELECT api_key, api_token FROM trello_connectors WHERE tenant_id = $1 AND is_active = true LIMIT 1`,
    [tenantId],
  );
  if (!res.rows.length) throw new Error(`Trello connector not configured for tenant ${tenantId}`);
  return { apiKey: res.rows[0].api_key, apiToken: res.rows[0].api_token };
}

/** Public — used by routes that need to sync back to Trello. Returns null if not configured. */
export async function getTrelloCredentials(tenantId: string): Promise<TrelloCredentials | null> {
  const res = await query<{ api_key: string; api_token: string }>(
    `SELECT api_key, api_token FROM trello_connectors WHERE tenant_id = $1 AND is_active = true LIMIT 1`,
    [tenantId],
  );
  if (!res.rows.length) return null;
  return { apiKey: res.rows[0].api_key, apiToken: res.rows[0].api_token };
}
