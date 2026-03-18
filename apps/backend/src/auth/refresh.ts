import crypto from 'crypto';
import { query } from '../db';

function hashToken(raw: string) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function issueRefreshToken(userId: string, rawToken: string, days = 14) {
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)`,
    [userId, tokenHash, expiresAt]
  );

  return expiresAt;
}

export async function rotateRefreshToken(userId: string, oldToken: string, newToken: string) {
  const oldHash = hashToken(oldToken);
  // Atomic: revoke and verify in one query — prevents concurrent reuse of the same token
  const { rows } = await query<{ id: string }>(
    `UPDATE refresh_tokens SET revoked=true
     WHERE user_id=$1 AND token_hash=$2 AND revoked=false AND expires_at > now()
     RETURNING id`,
    [userId, oldHash]
  );

  if (!rows[0]) throw new Error('invalid_refresh');
  return issueRefreshToken(userId, newToken, 14);
}

export async function revokeAllRefresh(userId: string) {
  await query(`UPDATE refresh_tokens SET revoked=true WHERE user_id=$1`, [userId]);
}
