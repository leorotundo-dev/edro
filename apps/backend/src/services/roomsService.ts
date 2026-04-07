import type { RoomMember, RoomMessage, RoomPresence, RoomStreamEvent, RoomSummary } from '@edro/shared';
import { query } from '../db';

const DEFAULT_ROOMS = [
  { name: 'Studio Geral', scope: 'studio', contextType: 'studio', contextId: '__studio__', defaultRoomKey: 'studio_general' },
  { name: 'Time Criativo', scope: 'team', contextType: 'team', contextId: '__creative_team__', defaultRoomKey: 'creative_team' },
] as const;

const listeners = new Map<string, Set<(event: RoomStreamEvent) => void>>();

function httpError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode });
}

function mapRoom(row: any): RoomSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    scope: row.scope,
    contextType: row.context_type ?? null,
    contextId: row.context_id ?? null,
    clientId: row.client_id ?? null,
    edroClientId: row.edro_client_id ?? null,
    lastMessageAt: row.last_message_at ?? null,
    lastMessagePreview: row.last_message_preview ?? null,
    unreadCount: Number(row.unread_count ?? 0),
    isArchived: Boolean(row.is_archived),
    memberCount: Number(row.member_count ?? 0),
    metadata: row.metadata ?? {},
  };
}

function mapMember(row: any): RoomMember {
  return {
    roomId: row.room_id,
    userId: row.user_id,
    name: row.name ?? null,
    email: row.email ?? null,
    role: row.membership_role,
    notificationLevel: row.notification_level,
    pinnedAt: row.pinned_at ?? null,
    lastReadMessageId: row.last_read_message_id ?? null,
    lastReadAt: row.last_read_at ?? null,
    lastSeenAt: row.last_seen_at ?? null,
  };
}

function mapPresence(row: any): RoomPresence {
  return {
    roomId: row.room_id,
    userId: row.user_id,
    name: row.name ?? null,
    status: row.status,
    pathname: row.pathname ?? null,
    pageContext: row.page_context ?? {},
    updatedAt: row.updated_at,
  };
}

function mapMessage(row: any): RoomMessage {
  return {
    id: row.id,
    roomId: row.room_id,
    authorUserId: row.author_user_id ?? null,
    authorName: row.author_name ?? null,
    authorEmail: row.author_email ?? null,
    authorKind: row.author_kind,
    messageType: row.message_type,
    body: row.body,
    bodyFormat: row.body_format,
    metadata: row.metadata ?? {},
    clientId: row.client_id ?? null,
    edroClientId: row.edro_client_id ?? null,
    createdAt: row.created_at,
    editedAt: row.edited_at ?? null,
    deletedAt: row.deleted_at ?? null,
  };
}

async function requireRoomAccess(tenantId: string, userId: string, roomId: string) {
  const { rows } = await query(
    `SELECT r.*,
            COALESCE(mc.member_count, 0)::int AS member_count,
            COALESCE(uc.unread_count, 0)::int AS unread_count
       FROM rooms r
       JOIN room_members rm
         ON rm.room_id = r.id
        AND rm.user_id = $2::uuid
  LEFT JOIN LATERAL (SELECT COUNT(*)::int AS member_count FROM room_members WHERE room_id = r.id) mc ON true
  LEFT JOIN LATERAL (
             SELECT COUNT(*)::int AS unread_count
               FROM room_messages msg
              WHERE msg.room_id = r.id
                AND msg.deleted_at IS NULL
                AND msg.author_user_id IS DISTINCT FROM $2::uuid
                AND (rm.last_read_at IS NULL OR msg.created_at > rm.last_read_at)
           ) uc ON true
      WHERE r.tenant_id = $1::uuid
        AND r.id = $3::uuid
      LIMIT 1`,
    [tenantId, userId, roomId],
  );
  if (rows[0]) return mapRoom(rows[0]);
  const exists = await query(`SELECT 1 FROM rooms WHERE tenant_id = $1::uuid AND id = $2::uuid LIMIT 1`, [tenantId, roomId]);
  throw httpError(exists.rows[0] ? 403 : 404, exists.rows[0] ? 'forbidden' : 'not_found');
}

export async function ensureDefaultRooms(tenantId: string, userId: string) {
  for (const room of DEFAULT_ROOMS) {
    await query(
      `INSERT INTO rooms (tenant_id, name, scope, context_type, context_id, metadata)
       VALUES ($1::uuid, $2, $3, $4, $5, jsonb_build_object('autoCreated', true, 'source', 'system', 'defaultRoomKey', $6))
       ON CONFLICT DO NOTHING`,
      [tenantId, room.name, room.scope, room.contextType, room.contextId, room.defaultRoomKey],
    );
  }
  const { rows } = await query(
    `SELECT id FROM rooms
      WHERE tenant_id = $1::uuid
        AND context_id IN ('__studio__', '__creative_team__')`,
    [tenantId],
  );
  for (const row of rows) {
    await query(
      `INSERT INTO room_members (tenant_id, room_id, user_id, membership_role)
       VALUES ($1::uuid, $2::uuid, $3::uuid, 'member')
       ON CONFLICT (room_id, user_id) DO UPDATE SET updated_at = now()`,
      [tenantId, row.id, userId],
    );
  }
}

export async function listRoomsForUser(tenantId: string, userId: string) {
  await ensureDefaultRooms(tenantId, userId);
  const { rows } = await query(
    `SELECT r.*,
            COALESCE(mc.member_count, 0)::int AS member_count,
            COALESCE(uc.unread_count, 0)::int AS unread_count
       FROM rooms r
       JOIN room_members rm
         ON rm.room_id = r.id
        AND rm.user_id = $2::uuid
  LEFT JOIN LATERAL (SELECT COUNT(*)::int AS member_count FROM room_members WHERE room_id = r.id) mc ON true
  LEFT JOIN LATERAL (
             SELECT COUNT(*)::int AS unread_count
               FROM room_messages msg
              WHERE msg.room_id = r.id
                AND msg.deleted_at IS NULL
                AND msg.author_user_id IS DISTINCT FROM $2::uuid
                AND (rm.last_read_at IS NULL OR msg.created_at > rm.last_read_at)
           ) uc ON true
      WHERE r.tenant_id = $1::uuid
        AND r.is_archived = false
      ORDER BY COALESCE(rm.pinned_at, r.last_message_at, r.created_at) DESC`,
    [tenantId, userId],
  );
  return rows.map(mapRoom);
}

export async function listRoomMessages(tenantId: string, userId: string, roomId: string, limit = 50) {
  await requireRoomAccess(tenantId, userId, roomId);
  const { rows } = await query(
    `SELECT *
       FROM (
         SELECT m.*, COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS author_name, u.email AS author_email
           FROM room_messages m
      LEFT JOIN edro_users u ON u.id = m.author_user_id
          WHERE m.tenant_id = $1::uuid
            AND m.room_id = $2::uuid
            AND m.deleted_at IS NULL
          ORDER BY m.created_at DESC
          LIMIT $3
       ) items
      ORDER BY created_at ASC`,
    [tenantId, roomId, Math.max(1, Math.min(limit, 100))],
  );
  return rows.map(mapMessage);
}

export async function getRoomForUser(tenantId: string, userId: string, roomId: string) {
  const room = await requireRoomAccess(tenantId, userId, roomId);
  const [membersRes, presenceRes] = await Promise.all([
    query(
      `SELECT rm.*, COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS name, u.email
         FROM room_members rm
    LEFT JOIN edro_users u ON u.id = rm.user_id
        WHERE rm.tenant_id = $1::uuid AND rm.room_id = $2::uuid
        ORDER BY rm.joined_at ASC`,
      [tenantId, roomId],
    ),
    query(
      `SELECT rp.*, COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS name
         FROM room_presence rp
    LEFT JOIN edro_users u ON u.id = rp.user_id
        WHERE rp.tenant_id = $1::uuid
          AND rp.room_id = $2::uuid
          AND rp.updated_at > now() - interval '90 seconds'
        ORDER BY rp.updated_at DESC`,
      [tenantId, roomId],
    ),
  ]);
  return { room, members: membersRes.rows.map(mapMember), presence: presenceRes.rows.map(mapPresence) };
}

export async function postRoomMessage(tenantId: string, userId: string, roomId: string, body: string) {
  const room = await requireRoomAccess(tenantId, userId, roomId);
  const preview = body.trim().slice(0, 160);
  const { rows } = await query(
    `WITH inserted AS (
       INSERT INTO room_messages (tenant_id, room_id, author_user_id, body)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4)
       RETURNING *
     )
     SELECT inserted.*, COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS author_name, u.email AS author_email
       FROM inserted
  LEFT JOIN edro_users u ON u.id = inserted.author_user_id`,
    [tenantId, roomId, userId, body.trim()],
  );
  await query(
    `UPDATE rooms
        SET last_message_at = now(),
            last_message_preview = $3,
            updated_at = now()
      WHERE tenant_id = $1::uuid AND id = $2::uuid`,
    [tenantId, roomId, preview],
  );
  const message = mapMessage(rows[0]);
  publishRoomEvent(roomId, { type: 'message.created', message });
  publishRoomEvent(roomId, {
    type: 'room.updated',
    room: { ...room, lastMessageAt: message.createdAt, lastMessagePreview: preview, unreadCount: room.unreadCount },
  });
  return message;
}

export async function markRoomRead(tenantId: string, userId: string, roomId: string, lastReadMessageId?: string | null) {
  await requireRoomAccess(tenantId, userId, roomId);
  const fallback = await query(
    `SELECT id, created_at FROM room_messages
      WHERE tenant_id = $1::uuid AND room_id = $2::uuid AND deleted_at IS NULL
      ORDER BY created_at DESC LIMIT 1`,
    [tenantId, roomId],
  );
  const target = lastReadMessageId
    ? await query(
        `SELECT id, created_at FROM room_messages WHERE tenant_id = $1::uuid AND room_id = $2::uuid AND id = $3::uuid LIMIT 1`,
        [tenantId, roomId, lastReadMessageId],
      )
    : fallback;
  const row = target.rows[0] || fallback.rows[0];
  await query(
    `UPDATE room_members
        SET last_read_message_id = $4::uuid,
            last_read_at = COALESCE($5::timestamptz, now()),
            last_seen_at = now(),
            updated_at = now()
      WHERE tenant_id = $1::uuid AND room_id = $2::uuid AND user_id = $3::uuid`,
    [tenantId, roomId, userId, row?.id ?? null, row?.created_at ?? new Date().toISOString()],
  );
  publishRoomEvent(roomId, { type: 'read.updated', roomId, userId, lastReadMessageId: row?.id ?? null, lastReadAt: row?.created_at ?? null });
}

export async function upsertRoomPresence(tenantId: string, userId: string, roomId: string, status: string, pathname?: string | null) {
  await requireRoomAccess(tenantId, userId, roomId);
  const { rows } = await query(
    `INSERT INTO room_presence (tenant_id, room_id, user_id, status, pathname)
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5)
     ON CONFLICT (room_id, user_id)
     DO UPDATE SET status = EXCLUDED.status, pathname = EXCLUDED.pathname, updated_at = now()
     RETURNING room_id, user_id, status, pathname, page_context, updated_at`,
    [tenantId, roomId, userId, status, pathname ?? null],
  );
  await query(
    `UPDATE room_members SET last_seen_at = now(), updated_at = now()
      WHERE tenant_id = $1::uuid AND room_id = $2::uuid AND user_id = $3::uuid`,
    [tenantId, roomId, userId],
  );
  const userRes = await query(`SELECT COALESCE(NULLIF(name, ''), split_part(email, '@', 1)) AS name FROM edro_users WHERE id = $1::uuid LIMIT 1`, [userId]);
  const presence = mapPresence({ ...rows[0], name: userRes.rows[0]?.name ?? null });
  publishRoomEvent(roomId, { type: 'presence.updated', presence });
  return presence;
}

export async function getRoomSnapshot(tenantId: string, userId: string, roomId: string) {
  const [roomData, messages] = await Promise.all([getRoomForUser(tenantId, userId, roomId), listRoomMessages(tenantId, userId, roomId)]);
  return { ...roomData, messages };
}

export function subscribeRoom(roomId: string, listener: (event: RoomStreamEvent) => void) {
  const set = listeners.get(roomId) ?? new Set();
  set.add(listener);
  listeners.set(roomId, set);
  return () => {
    const current = listeners.get(roomId);
    if (!current) return;
    current.delete(listener);
    if (!current.size) listeners.delete(roomId);
  };
}

function publishRoomEvent(roomId: string, event: RoomStreamEvent) {
  const set = listeners.get(roomId);
  if (!set) return;
  for (const listener of set) {
    try { listener(event); } catch { /* no-op */ }
  }
}
