import { query } from '../db';

export interface EdroUser {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  status: string;
  last_login_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface EdroLoginCode {
  id: string;
  email: string;
  code_hash: string;
  expires_at: Date;
  consumed_at?: Date | null;
  created_at: Date;
}

export async function findUserByEmail(email: string): Promise<EdroUser | null> {
  const { rows } = await query<EdroUser>(
    `
      SELECT *
      FROM edro_users
      WHERE email = $1
      LIMIT 1
    `,
    [email]
  );
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<EdroUser | null> {
  const { rows } = await query<EdroUser>(
    `
      SELECT *
      FROM edro_users
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );
  return rows[0] ?? null;
}

export async function upsertUser(params: {
  email: string;
  name?: string | null;
  role?: string | null;
}): Promise<EdroUser> {
  const { rows } = await query<EdroUser>(
    `
      INSERT INTO edro_users (email, name, role, last_login_at)
      VALUES ($1, $2, COALESCE($3, 'staff'), now())
      ON CONFLICT (email)
      DO UPDATE SET
        name = COALESCE(EXCLUDED.name, edro_users.name),
        role = COALESCE(EXCLUDED.role, edro_users.role),
        status = 'active',
        last_login_at = now(),
        updated_at = now()
      RETURNING *
    `,
    [params.email, params.name ?? null, params.role ?? null]
  );
  return rows[0];
}

export async function createLoginCode(params: {
  email: string;
  codeHash: string;
  expiresAt: Date;
}): Promise<EdroLoginCode> {
  const { rows } = await query<EdroLoginCode>(
    `
      INSERT INTO edro_login_codes (email, code_hash, expires_at)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
    [params.email, params.codeHash, params.expiresAt]
  );
  return rows[0];
}

export async function consumeLoginCode(params: {
  email: string;
  codeHash: string;
}): Promise<boolean> {
  const { rows } = await query<{ id: string }>(
    `
      UPDATE edro_login_codes
      SET consumed_at = now()
      WHERE email = $1
        AND code_hash = $2
        AND consumed_at IS NULL
        AND expires_at > now()
      RETURNING id
    `,
    [params.email, params.codeHash]
  );
  return rows.length > 0;
}
