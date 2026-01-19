import bcrypt from 'bcryptjs';
import { query } from '../db';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  plan: string | null;
  role?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  plan?: string | null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const { rows } = await query<User>(
    'SELECT * FROM users WHERE email = $1 LIMIT 1',
    [email]
  );
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const { rows } = await query<User>(
    'SELECT * FROM users WHERE id = $1 LIMIT 1',
    [id]
  );
  return rows[0] ?? null;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const password_hash = await bcrypt.hash(input.password, 10);

  const { rows } = await query<User>(
    `
      INSERT INTO users (name, email, password_hash, plan)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [input.name, input.email, password_hash, input.plan ?? null]
  );

  return rows[0];
}
