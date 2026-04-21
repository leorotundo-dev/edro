/**
 * trelloProjectorService.ts
 *
 * Incremental projector: applies a single Trello webhook action to the
 * project_* read model without requiring a full board re-sync.
 *
 * Handles:
 *   updateCard              — move, rename, due date, desc, archive, due_complete
 *   createCard              — insert new card (partial; full sync will enrich later)
 *   deleteCard              — mark archived
 *   commentCard             — upsert project_card_comments
 *   createCheckItem          — add checklist item in JSONB
 *   updateCheckItem          — rename checklist item in JSONB
 *   updateCheckItemStateOnCard — toggle checklist item in JSONB
 *   deleteCheckItem          — remove checklist item from JSONB
 *   updateChecklist          — rename checklist container
 *   addMemberToCard         — insert project_card_members
 *   removeMemberFromCard    — delete from project_card_members
 */

import { query } from '../db';
import { refreshSignalForCard } from './trelloSyncService';
import { upsertJobFromCard } from './trelloJobBridgeService';

// ── Trello action payload types (minimal) ─────────────────────────────────────

interface TrelloActionCard {
  id: string;
  name?: string;
  desc?: string;
  due?: string | null;
  dueComplete?: boolean;
  closed?: boolean;
  idList?: string;
  pos?: number;
}

interface TrelloActionList {
  id: string;
  name: string;
}

interface TrelloActionChecklist {
  id: string;
  name: string;
}

interface TrelloActionCheckItem {
  id: string;
  name: string;
  state: 'complete' | 'incomplete';
}

interface TrelloActionMember {
  id: string;
  fullName?: string;
  avatarUrl?: string | null;
  email?: string | null;
}

export interface TrelloWebhookAction {
  id: string;
  type: string;
  date: string;
  data: {
    card?: TrelloActionCard;
    list?: TrelloActionList;         // destination list for createCard
    listBefore?: TrelloActionList;
    listAfter?: TrelloActionList;
    board?: { id: string; name: string };
    text?: string;                   // commentCard body
    checkItem?: TrelloActionCheckItem;
    checklist?: TrelloActionChecklist;
  };
  memberCreator?: TrelloActionMember;
  member?: TrelloActionMember;       // addMemberToCard / removeMemberFromCard
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveCardId(tenantId: string, trelloCardId: string): Promise<string | null> {
  const res = await query<{ id: string }>(
    `SELECT id FROM project_cards WHERE tenant_id = $1 AND trello_card_id = $2 LIMIT 1`,
    [tenantId, trelloCardId],
  );
  return res.rows[0]?.id ?? null;
}

async function resolveListId(tenantId: string, trelloListId: string): Promise<string | null> {
  const res = await query<{ id: string }>(
    `SELECT id FROM project_lists WHERE tenant_id = $1 AND trello_list_id = $2 LIMIT 1`,
    [tenantId, trelloListId],
  );
  return res.rows[0]?.id ?? null;
}

// ── Action handlers ───────────────────────────────────────────────────────────

async function handleUpdateCard(tenantId: string, action: TrelloWebhookAction): Promise<void> {
  const trelloCardId = action.data.card?.id;
  if (!trelloCardId) return;

  const cardId = await resolveCardId(tenantId, trelloCardId);
  if (!cardId) return; // card not in our DB yet — next full sync will pick it up

  const updates: string[] = ['last_activity_at = now()', 'updated_at = now()'];
  const params: unknown[] = [];
  let pi = 1;

  const card = action.data.card!;

  if (card.name !== undefined) {
    updates.push(`title = $${pi++}`);
    params.push(card.name);
  }
  if (card.desc !== undefined) {
    updates.push(`description = $${pi++}`);
    params.push(card.desc || null);
  }
  if ('due' in card) {
    const dueVal = card.due ? card.due.split('T')[0] : null;
    updates.push(`due_date = $${pi++}`);
    params.push(dueVal);
  }
  if (card.dueComplete !== undefined) {
    updates.push(`due_complete = $${pi++}`);
    params.push(card.dueComplete);
  }
  if (card.closed !== undefined) {
    updates.push(`is_archived = $${pi++}`);
    params.push(card.closed);
  }

  // Card moved to another list
  if (action.data.listAfter?.id) {
    const newListId = await resolveListId(tenantId, action.data.listAfter.id);
    if (newListId) {
      updates.push(`list_id = $${pi++}`);
      params.push(newListId);
    }
  }

  if (params.length === 0) return; // nothing to update beyond timestamps

  params.push(cardId);
  await query(
    `UPDATE project_cards SET ${updates.join(', ')} WHERE id = $${pi}`,
    params,
  );

  // Record list transition in project_card_actions if card moved
  if (action.data.listBefore?.id && action.data.listAfter?.id) {
    const boardRes = await query<{ board_id: string }>(
      `SELECT board_id FROM project_cards WHERE id = $1`,
      [cardId],
    );
    const boardId = boardRes.rows[0]?.board_id;
    if (boardId) {
      await query(
        `INSERT INTO project_card_actions
           (card_id, board_id, tenant_id, action_type, trello_action_id,
            from_list_name, to_list_name, actor_name, occurred_at)
         VALUES ($1,$2,$3,'updateCard.listAfter',$4,$5,$6,$7,$8)
         ON CONFLICT (trello_action_id) DO NOTHING`,
        [
          cardId, boardId, tenantId, action.id,
          action.data.listBefore.name, action.data.listAfter.name,
          action.memberCreator?.fullName ?? null,
          new Date(action.date),
        ],
      );
    }
  }
}

async function handleCreateCard(tenantId: string, action: TrelloWebhookAction): Promise<void> {
  const card = action.data.card;
  const list = action.data.list;
  if (!card?.id || !list?.id) return;

  const listId = await resolveListId(tenantId, list.id);
  if (!listId) return;

  const boardRes = await query<{ id: string }>(
    `SELECT id FROM project_lists WHERE id = $1`,
    [listId],
  );
  // list already confirms board via FK — fetch board_id from project_lists
  const listRow = await query<{ board_id: string }>(
    `SELECT board_id FROM project_lists WHERE id = $1`,
    [listId],
  );
  const boardId = listRow.rows[0]?.board_id;
  if (!boardId) return;

  await query(
    `INSERT INTO project_cards
       (list_id, board_id, tenant_id, title, description, trello_card_id, is_archived, last_activity_at)
     VALUES ($1,$2,$3,$4,$5,$6,false,now())
     ON CONFLICT (board_id, trello_card_id) DO NOTHING`,
    [listId, boardId, tenantId, card.name ?? '', card.desc || null, card.id],
  );
}

async function handleDeleteCard(tenantId: string, action: TrelloWebhookAction): Promise<void> {
  const trelloCardId = action.data.card?.id;
  if (!trelloCardId) return;
  await query(
    `UPDATE project_cards SET is_archived = true, updated_at = now()
     WHERE tenant_id = $1 AND trello_card_id = $2`,
    [tenantId, trelloCardId],
  );
}

async function handleCommentCard(tenantId: string, action: TrelloWebhookAction): Promise<void> {
  const trelloCardId = action.data.card?.id;
  const text = action.data.text;
  if (!trelloCardId || !text) return;

  const cardId = await resolveCardId(tenantId, trelloCardId);
  if (!cardId) return;

  await query(
    `INSERT INTO project_card_comments
       (card_id, tenant_id, body, author_name, author_avatar, trello_action_id, commented_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (trello_action_id) DO NOTHING`,
    [
      cardId, tenantId, text,
      action.memberCreator?.fullName ?? null,
      action.memberCreator?.avatarUrl ?? null,
      action.id,
      new Date(action.date),
    ],
  );
}

async function handleUpdateCheckItem(tenantId: string, action: TrelloWebhookAction): Promise<void> {
  const trelloCardId = action.data.card?.id;
  const checkItem = action.data.checkItem;
  const checklist = action.data.checklist;
  if (!trelloCardId || !checkItem?.id) return;

  const cardId = await resolveCardId(tenantId, trelloCardId);
  if (!cardId) return;

  // Find the checklist row (by trello_checklist_id if available, else by card_id)
  const clWhere = checklist?.id
    ? 'card_id = $1 AND tenant_id = $2 AND trello_checklist_id = $3'
    : 'card_id = $1 AND tenant_id = $2';
  const clParams = checklist?.id ? [cardId, tenantId, checklist.id] : [cardId, tenantId];

  const clRes = await query<{ id: string; items: Array<{ id?: string; text: string; checked: boolean }> }>(
    `SELECT id, items FROM project_card_checklists WHERE ${clWhere} LIMIT 1`,
    clParams,
  );
  if (!clRes.rows.length) return;

  const cl = clRes.rows[0];
  const idx = cl.items.findIndex((it) => (it as any).trello_id === checkItem.id || (it as any).id === checkItem.id);
  if (idx === -1) {
    // Item not found by ID — try by name as fallback
    const nameIdx = cl.items.findIndex((it) => it.text === checkItem.name);
    if (nameIdx === -1) return;
    cl.items[nameIdx] = { ...cl.items[nameIdx], checked: checkItem.state === 'complete' };
  } else {
    cl.items[idx] = { ...cl.items[idx], checked: checkItem.state === 'complete' };
  }

  await query(
    `UPDATE project_card_checklists SET items = $1, updated_at = now() WHERE id = $2`,
    [JSON.stringify(cl.items), cl.id],
  );
}

async function resolveChecklistRow(
  tenantId: string,
  cardId: string,
  checklist?: TrelloActionChecklist,
): Promise<{ id: string; name: string | null; items: Array<{ trello_id?: string; id?: string; text: string; checked: boolean }> } | null> {
  const clWhere = checklist?.id
    ? 'card_id = $1 AND tenant_id = $2 AND trello_checklist_id = $3'
    : 'card_id = $1 AND tenant_id = $2';
  const clParams = checklist?.id ? [cardId, tenantId, checklist.id] : [cardId, tenantId];

  const clRes = await query<{ id: string; name: string | null; items: Array<{ trello_id?: string; id?: string; text: string; checked: boolean }> }>(
    `SELECT id, name, items FROM project_card_checklists WHERE ${clWhere} LIMIT 1`,
    clParams,
  );
  return clRes.rows[0] ?? null;
}

async function handleCreateCheckItem(tenantId: string, action: TrelloWebhookAction): Promise<void> {
  const trelloCardId = action.data.card?.id;
  const checkItem = action.data.checkItem;
  const checklist = action.data.checklist;
  if (!trelloCardId || !checkItem?.id) return;

  const cardId = await resolveCardId(tenantId, trelloCardId);
  if (!cardId) return;

  const existing = await resolveChecklistRow(tenantId, cardId, checklist);
  const newItem = {
    trello_id: checkItem.id,
    text: checkItem.name,
    checked: checkItem.state === 'complete',
  };

  if (!existing) {
    await query(
      `INSERT INTO project_card_checklists (card_id, tenant_id, name, items, trello_checklist_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (trello_checklist_id) DO NOTHING`,
      [cardId, tenantId, checklist?.name ?? 'Checklist', JSON.stringify([newItem]), checklist?.id ?? null],
    );
    return;
  }

  if (existing.items.some((it) => it.trello_id === checkItem.id || it.id === checkItem.id)) return;

  await query(
    `UPDATE project_card_checklists SET items = $1, updated_at = now() WHERE id = $2`,
    [JSON.stringify([...existing.items, newItem]), existing.id],
  );
}

async function handleDeleteCheckItem(tenantId: string, action: TrelloWebhookAction): Promise<void> {
  const trelloCardId = action.data.card?.id;
  const checkItem = action.data.checkItem;
  const checklist = action.data.checklist;
  if (!trelloCardId || !checkItem?.id) return;

  const cardId = await resolveCardId(tenantId, trelloCardId);
  if (!cardId) return;

  const existing = await resolveChecklistRow(tenantId, cardId, checklist);
  if (!existing) return;

  const nextItems = existing.items.filter((it) => it.trello_id !== checkItem.id && it.id !== checkItem.id && it.text !== checkItem.name);
  await query(
    `UPDATE project_card_checklists SET items = $1, updated_at = now() WHERE id = $2`,
    [JSON.stringify(nextItems), existing.id],
  );
}

async function handleRenameCheckItem(tenantId: string, action: TrelloWebhookAction): Promise<void> {
  const trelloCardId = action.data.card?.id;
  const checkItem = action.data.checkItem;
  const checklist = action.data.checklist;
  if (!trelloCardId || !checkItem?.id) return;

  const cardId = await resolveCardId(tenantId, trelloCardId);
  if (!cardId) return;

  const existing = await resolveChecklistRow(tenantId, cardId, checklist);
  if (!existing) return;

  const idx = existing.items.findIndex((it) => it.trello_id === checkItem.id || it.id === checkItem.id);
  if (idx === -1) return;

  existing.items[idx] = {
    ...existing.items[idx],
    trello_id: existing.items[idx].trello_id ?? checkItem.id,
    text: checkItem.name,
  };

  await query(
    `UPDATE project_card_checklists SET items = $1, updated_at = now() WHERE id = $2`,
    [JSON.stringify(existing.items), existing.id],
  );
}

async function handleUpdateChecklist(tenantId: string, action: TrelloWebhookAction): Promise<void> {
  const trelloCardId = action.data.card?.id;
  const checklist = action.data.checklist;
  if (!trelloCardId || !checklist?.id || !checklist.name) return;

  const cardId = await resolveCardId(tenantId, trelloCardId);
  if (!cardId) return;

  const existing = await resolveChecklistRow(tenantId, cardId, checklist);
  if (!existing) return;

  await query(
    `UPDATE project_card_checklists SET name = $1, updated_at = now() WHERE id = $2`,
    [checklist.name, existing.id],
  );
}

async function handleAddMember(tenantId: string, action: TrelloWebhookAction): Promise<void> {
  const trelloCardId = action.data.card?.id;
  const member = action.member;
  if (!trelloCardId || !member?.id) return;

  const cardId = await resolveCardId(tenantId, trelloCardId);
  if (!cardId) return;

  await query(
    `INSERT INTO project_card_members
       (card_id, tenant_id, trello_member_id, display_name, avatar_url)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (card_id, trello_member_id) DO NOTHING`,
    [cardId, tenantId, member.id, member.fullName ?? null, member.avatarUrl ?? null],
  );
}

async function handleRemoveMember(tenantId: string, action: TrelloWebhookAction): Promise<void> {
  const trelloCardId = action.data.card?.id;
  const member = action.member;
  if (!trelloCardId || !member?.id) return;

  const cardId = await resolveCardId(tenantId, trelloCardId);
  if (!cardId) return;

  await query(
    `DELETE FROM project_card_members
     WHERE card_id = $1 AND trello_member_id = $2`,
    [cardId, member.id],
  );
}

// ── Anti-loop: detect echo from own outbox ────────────────────────────────────

// Maps Trello action types to the outbox operation that would cause them
const OUTBOX_OP_FOR_ACTION: Record<string, string> = {
  updateCard:                   'card.update',
  commentCard:                  'comment.add',
  createCheckItem:              'checklist.toggle',
  updateCheckItem:              'checklist.toggle',
  updateCheckItemStateOnCard:   'checklist.toggle',
  deleteCheckItem:              'checklist.toggle',
  addMemberToCard:              'member.sync',
  removeMemberFromCard:         'member.sync',
};

/**
 * Returns true when this webhook action is a rebound from our own outbox.
 * We skip projection in that case — the change is already in the DB.
 */
async function isEchoFromOutbox(
  tenantId: string,
  trelloCardId: string,
  actionType: string,
): Promise<boolean> {
  const op = OUTBOX_OP_FOR_ACTION[actionType];
  if (!op) return false;
  const res = await query(
    `SELECT 1 FROM trello_outbox
     WHERE tenant_id = $1
       AND operation = $2
       AND payload->>'trelloCardId' = $3
       AND status = 'done'
       AND updated_at > now() - interval '60 seconds'
     LIMIT 1`,
    [tenantId, op, trelloCardId],
  );
  return res.rows.length > 0;
}

// ── Public entry point ────────────────────────────────────────────────────────

/**
 * Applies a single Trello webhook action to the project_* read model.
 * Returns true if the action was handled, false if unsupported or skipped (echo).
 */
export async function processWebhookAction(
  tenantId: string,
  action: TrelloWebhookAction,
): Promise<boolean> {
  const trelloCardId = action.data.card?.id;

  // Anti-loop: skip echoes from our own outbox writes
  if (trelloCardId && await isEchoFromOutbox(tenantId, trelloCardId, action.type)) {
    return false; // marked as 'skipped' by caller
  }

  switch (action.type) {
    case 'updateCard':
      await handleUpdateCard(tenantId, action);
      if (trelloCardId) {
        const cardId = await resolveCardId(tenantId, trelloCardId);
        if (cardId) refreshSignalForCard(tenantId, cardId).catch(() => undefined);
        upsertJobFromCard(tenantId, trelloCardId).catch(() => undefined);
      }
      return true;
    case 'createCard':
      await handleCreateCard(tenantId, action);
      if (trelloCardId) {
        const cardId = await resolveCardId(tenantId, trelloCardId);
        if (cardId) refreshSignalForCard(tenantId, cardId).catch(() => undefined);
        upsertJobFromCard(tenantId, trelloCardId).catch(() => undefined);
      }
      return true;
    case 'deleteCard':
      await handleDeleteCard(tenantId, action);
      if (trelloCardId) upsertJobFromCard(tenantId, trelloCardId).catch(() => undefined);
      return true;
    case 'commentCard':
      await handleCommentCard(tenantId, action);
      return true;
    case 'createCheckItem':
      await handleCreateCheckItem(tenantId, action);
      if (trelloCardId) {
        const cardId = await resolveCardId(tenantId, trelloCardId);
        if (cardId) refreshSignalForCard(tenantId, cardId).catch(() => undefined);
      }
      return true;
    case 'updateCheckItem':
      await handleRenameCheckItem(tenantId, action);
      return true;
    case 'updateCheckItemStateOnCard':
      await handleUpdateCheckItem(tenantId, action);
      if (trelloCardId) upsertJobFromCard(tenantId, trelloCardId).catch(() => undefined);
      return true;
    case 'deleteCheckItem':
      await handleDeleteCheckItem(tenantId, action);
      if (trelloCardId) {
        const cardId = await resolveCardId(tenantId, trelloCardId);
        if (cardId) refreshSignalForCard(tenantId, cardId).catch(() => undefined);
      }
      return true;
    case 'updateChecklist':
      await handleUpdateChecklist(tenantId, action);
      return true;
    case 'addMemberToCard':
      await handleAddMember(tenantId, action);
      if (trelloCardId) {
        const cardId = await resolveCardId(tenantId, trelloCardId);
        if (cardId) refreshSignalForCard(tenantId, cardId).catch(() => undefined);
      }
      return true;
    case 'removeMemberFromCard':
      await handleRemoveMember(tenantId, action);
      if (trelloCardId) {
        const cardId = await resolveCardId(tenantId, trelloCardId);
        if (cardId) refreshSignalForCard(tenantId, cardId).catch(() => undefined);
      }
      return true;
    default:
      return false;
  }
}
