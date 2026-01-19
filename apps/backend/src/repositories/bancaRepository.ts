import { query } from '../db';

export interface Banca {
  id: string;
  slug: string;
  sigla: string;
  nome: string;
  site?: string | null;
  tipo?: string | null;
  abrangencia?: string | null;
  uf?: string | null;
  cidade?: string | null;
  descricao?: string | null;
  tags?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface BancaFilters {
  search?: string;
  tipo?: string;
  abrangencia?: string;
  uf?: string;
  limit?: number;
}

export async function listBancas(filters?: BancaFilters): Promise<Banca[]> {
  let sql = `
    SELECT *
    FROM bancas
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramCount = 1;

  if (filters?.search) {
    sql += ` AND (nome ILIKE $${paramCount} OR sigla ILIKE $${paramCount} OR slug ILIKE $${paramCount})`;
    params.push(`%${filters.search}%`);
    paramCount++;
  }

  if (filters?.tipo) {
    sql += ` AND tipo = $${paramCount}`;
    params.push(filters.tipo);
    paramCount++;
  }

  if (filters?.abrangencia) {
    sql += ` AND abrangencia = $${paramCount}`;
    params.push(filters.abrangencia);
    paramCount++;
  }

  if (filters?.uf) {
    sql += ` AND uf = $${paramCount}`;
    params.push(filters.uf);
    paramCount++;
  }

  sql += ' ORDER BY sigla ASC';

  if (filters?.limit) {
    sql += ` LIMIT $${paramCount}`;
    params.push(filters.limit);
  } else {
    sql += ' LIMIT 200';
  }

  const { rows } = await query<Banca>(sql, params);
  return rows;
}

export async function findBancaBySlug(slug: string): Promise<Banca | null> {
  const { rows } = await query<Banca>(
    `
      SELECT *
      FROM bancas
      WHERE slug = $1 OR sigla = $1
      LIMIT 1
    `,
    [slug]
  );

  return rows[0] || null;
}
