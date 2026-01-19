import { query } from '../db';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ClanRole = 'owner' | 'admin' | 'member';

export async function getUserClan(userId: string) {
  const { rows } = await query(
    `
      SELECT c.*, m.role, m.joined_at
      FROM clan_members m
      JOIN clans c ON c.id = m.clan_id
      WHERE m.user_id = $1 AND m.left_at IS NULL
      ORDER BY m.joined_at DESC
      LIMIT 1
    `,
    [userId]
  );
  return rows[0] ?? null;
}

export async function listClans(limit: number = 20) {
  const { rows } = await query(
    `
      SELECT c.*,
        COUNT(m.id) FILTER (WHERE m.left_at IS NULL) AS members_count
      FROM clans c
      LEFT JOIN clan_members m ON m.clan_id = c.id AND m.left_at IS NULL
      GROUP BY c.id
      ORDER BY members_count DESC, c.created_at DESC
      LIMIT $1
    `,
    [Math.min(limit, 50)]
  );
  return rows;
}

export async function createClan(params: {
  userId: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  isPublic?: boolean;
}) {
  const { rows } = await query<{ id: string }>(
    `
      INSERT INTO clans (name, description, avatar_url, is_public, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id
    `,
    [
      params.name,
      params.description ?? null,
      params.avatarUrl ?? null,
      params.isPublic ?? true,
      params.userId,
    ]
  );
  const clanId = rows[0]?.id;
  if (clanId) {
    await query(
      `
        INSERT INTO clan_members (clan_id, user_id, role, joined_at)
        VALUES ($1, $2, 'owner', NOW())
      `,
      [clanId, params.userId]
    );
    await refreshClanMemberCount(clanId);
  }
  return clanId;
}

export async function joinClan(params: { userId: string; clanId: string }) {
  const activeClan = await getUserClan(params.userId);
  if (activeClan) {
    return { ok: false, reason: 'already_in_clan' as const };
  }

  if (!UUID_REGEX.test(params.clanId)) {
    return { ok: false, reason: 'invalid_clan' as const };
  }

  const { rows } = await query<{ is_public: boolean }>(
    `SELECT is_public FROM clans WHERE id = $1 LIMIT 1`,
    [params.clanId]
  );
  if (!rows[0]) {
    return { ok: false, reason: 'clan_not_found' as const };
  }
  if (!rows[0].is_public) {
    return { ok: false, reason: 'clan_private' as const };
  }

  await query(
    `
      INSERT INTO clan_members (clan_id, user_id, role, joined_at)
      VALUES ($1, $2, 'member', NOW())
      ON CONFLICT (clan_id, user_id) DO UPDATE
        SET left_at = NULL, role = 'member', joined_at = NOW()
    `,
    [params.clanId, params.userId]
  );
  await refreshClanMemberCount(params.clanId);
  return { ok: true };
}

export async function leaveClan(params: { userId: string; clanId: string }) {
  await query(
    `
      UPDATE clan_members
      SET left_at = NOW()
      WHERE clan_id = $1 AND user_id = $2 AND left_at IS NULL
    `,
    [params.clanId, params.userId]
  );
  await refreshClanMemberCount(params.clanId);
}

export async function updateClanScoreForUser(params: {
  userId: string;
  xpDelta: number;
  date?: Date;
}) {
  if (!params.xpDelta) return;
  const { rows } = await query<{ clan_id: string }>(
    `
      SELECT clan_id
      FROM clan_members
      WHERE user_id = $1 AND left_at IS NULL
    `,
    [params.userId]
  );
  if (rows.length === 0) return;

  const date = params.date ?? new Date();
  const dateStr = date.toISOString().split('T')[0];

  for (const row of rows) {
    await query(
      `
        INSERT INTO clan_scores (clan_id, score_date, xp_total, members_count)
        VALUES ($1, $2, $3, (
          SELECT COUNT(*) FROM clan_members WHERE clan_id = $1 AND left_at IS NULL
        ))
        ON CONFLICT (clan_id, score_date) DO UPDATE SET
          xp_total = clan_scores.xp_total + EXCLUDED.xp_total,
          members_count = EXCLUDED.members_count,
          updated_at = NOW()
      `,
      [row.clan_id, dateStr, params.xpDelta]
    );
  }
}

export async function getClanLeaderboard(limit: number = 20, date?: Date) {
  const dateStr = (date ?? new Date()).toISOString().split('T')[0];
  const { rows } = await query(
    `
      SELECT c.id, c.name, c.avatar_url, cs.xp_total, cs.members_count
      FROM clan_scores cs
      JOIN clans c ON c.id = cs.clan_id
      WHERE cs.score_date = $1
      ORDER BY cs.xp_total DESC
      LIMIT $2
    `,
    [dateStr, Math.min(limit, 50)]
  );
  return rows;
}

async function refreshClanMemberCount(clanId: string) {
  const dateStr = new Date().toISOString().split('T')[0];
  await query(
    `
      INSERT INTO clan_scores (clan_id, score_date, xp_total, members_count)
      VALUES ($1, $2, 0, (
        SELECT COUNT(*) FROM clan_members WHERE clan_id = $1 AND left_at IS NULL
      ))
      ON CONFLICT (clan_id, score_date) DO UPDATE SET
        members_count = EXCLUDED.members_count,
        updated_at = NOW()
    `,
    [clanId, dateStr]
  );
}

export const ClanService = {
  getUserClan,
  listClans,
  createClan,
  joinClan,
  leaveClan,
  updateClanScoreForUser,
  getClanLeaderboard,
};

export default ClanService;
