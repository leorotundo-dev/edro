import { Pool, QueryResultRow } from 'pg';
import { env } from '../env';

// Pool principal — reservado para requisições HTTP de usuários
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Pool secundário — usado pelos workers de background para não competir com usuários
export const workerPool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 6,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000,
});

export async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number | null }> {
  const client = await pool.connect();
  try {
    const res = await client.query<T>(text, params);
    return { rows: res.rows, rowCount: res.rowCount };
  } finally {
    client.release();
  }
}

// Versão do query para workers de background — usa o pool isolado
export async function workerQuery<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number | null }> {
  const client = await workerPool.connect();
  try {
    const res = await client.query<T>(text, params);
    return { rows: res.rows, rowCount: res.rowCount };
  } finally {
    client.release();
  }
}

export const db = { query };
