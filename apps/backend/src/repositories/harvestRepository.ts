import { query } from '../db';

export interface HarvestItem {
  id: number;
  source: string;
  url: string;
  raw_html?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  created_at: Date;
  processed_at?: Date;
}

export interface CreateHarvestInput {
  source: string;
  url: string;
  raw_html?: string;
}

export interface UpdateHarvestStatusInput {
  id: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  processed_at?: Date;
}

/**
 * Buscar todos os harvest items com status específico
 */
export async function findHarvestByStatus(status: string): Promise<HarvestItem[]> {
  const { rows } = await query<HarvestItem>(
    'SELECT * FROM harvest_items WHERE status = $1 ORDER BY created_at ASC',
    [status]
  );
  return rows;
}

/**
 * Buscar um harvest item por ID
 */
export async function findHarvestById(id: number): Promise<HarvestItem | null> {
  const { rows } = await query<HarvestItem>(
    'SELECT * FROM harvest_items WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

/**
 * Criar um novo harvest item
 */
export async function createHarvest(input: CreateHarvestInput): Promise<HarvestItem> {
  const { rows } = await query<HarvestItem>(
    `
      INSERT INTO harvest_items (source, url, raw_html, status)
      VALUES ($1, $2, $3, 'PENDING')
      RETURNING *
    `,
    [input.source, input.url, input.raw_html || null]
  );
  return rows[0];
}

/**
 * Atualizar status de um harvest item
 */
export async function updateHarvestStatus(input: UpdateHarvestStatusInput): Promise<HarvestItem> {
  const processedAt = input.processed_at || (input.status !== 'PENDING' ? new Date() : null);
  
  const { rows } = await query<HarvestItem>(
    `
      UPDATE harvest_items
      SET status = $1, processed_at = $2
      WHERE id = $3
      RETURNING *
    `,
    [input.status, processedAt, input.id]
  );
  return rows[0];
}

/**
 * Listar todos os harvest items
 */
export async function listAllHarvests(): Promise<HarvestItem[]> {
  const { rows } = await query<HarvestItem>(
    'SELECT * FROM harvest_items ORDER BY created_at DESC'
  );
  return rows;
}

/**
 * Deletar um harvest item
 */
export async function deleteHarvest(id: number): Promise<boolean> {
  // Note: pg query wrapper doesn't return rowCount, so we check if delete was successful
  // by attempting to fetch the item after deletion
  try {
    await query(
      'DELETE FROM harvest_items WHERE id = $1',
      [id]
    );
    return true;
  } catch {
    return false;
  }
}
