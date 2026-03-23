import { query } from '../db';

export interface EdroUserMfaRecord {
  user_id: string;
  secret_enc?: string | null;
  pending_secret_enc?: string | null;
  recovery_codes_hash?: string[] | null;
  enabled_at?: Date | null;
  last_verified_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export async function findUserMfaByUserId(userId: string): Promise<EdroUserMfaRecord | null> {
  const { rows } = await query<EdroUserMfaRecord>(
    `
      SELECT *
      FROM edro_user_mfa
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId],
  );
  return rows[0] ?? null;
}

export async function savePendingUserMfaSecret(userId: string, pendingSecretEnc: string) {
  await query(
    `
      INSERT INTO edro_user_mfa (user_id, pending_secret_enc, updated_at)
      VALUES ($1, $2, now())
      ON CONFLICT (user_id)
      DO UPDATE SET
        pending_secret_enc = EXCLUDED.pending_secret_enc,
        updated_at = now()
    `,
    [userId, pendingSecretEnc],
  );
}

export async function clearPendingUserMfaSecret(userId: string) {
  await query(
    `
      UPDATE edro_user_mfa
      SET pending_secret_enc = NULL,
          updated_at = now()
      WHERE user_id = $1
    `,
    [userId],
  );
}

export async function enableUserMfa(params: {
  userId: string;
  secretEnc: string;
  recoveryCodeHashes: string[];
}) {
  await query(
    `
      INSERT INTO edro_user_mfa (
        user_id,
        secret_enc,
        pending_secret_enc,
        recovery_codes_hash,
        enabled_at,
        last_verified_at,
        updated_at
      )
      VALUES ($1, $2, NULL, $3::jsonb, now(), now(), now())
      ON CONFLICT (user_id)
      DO UPDATE SET
        secret_enc = EXCLUDED.secret_enc,
        pending_secret_enc = NULL,
        recovery_codes_hash = EXCLUDED.recovery_codes_hash,
        enabled_at = now(),
        last_verified_at = now(),
        updated_at = now()
    `,
    [params.userId, params.secretEnc, JSON.stringify(params.recoveryCodeHashes)],
  );
}

export async function markUserMfaVerified(userId: string) {
  await query(
    `
      UPDATE edro_user_mfa
      SET last_verified_at = now(),
          updated_at = now()
      WHERE user_id = $1
    `,
    [userId],
  );
}

export async function consumeUserRecoveryCode(userId: string, recoveryCodeHash: string): Promise<boolean> {
  const { rows } = await query<{ user_id: string }>(
    `
      UPDATE edro_user_mfa
      SET recovery_codes_hash = COALESCE(
            (
              SELECT jsonb_agg(value)
              FROM jsonb_array_elements_text(recovery_codes_hash) AS value
              WHERE value <> $2
            ),
            '[]'::jsonb
          ),
          updated_at = now()
      WHERE user_id = $1
        AND recovery_codes_hash ? $2
      RETURNING user_id
    `,
    [userId, recoveryCodeHash],
  );
  return rows.length > 0;
}
