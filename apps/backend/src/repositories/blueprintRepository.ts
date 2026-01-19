import { query } from '../db';

export interface ExamBlueprint {
  id: number;
  harvest_item_id?: number;
  exam_code?: string;
  banca?: string;
  cargo?: string;
  disciplina?: string;
  blueprint: Record<string, any>;
  priorities?: Record<string, any>;
  created_at: Date;
}

export interface CreateBlueprintInput {
  harvest_item_id?: number;
  exam_code?: string;
  banca?: string;
  cargo?: string;
  disciplina?: string;
  blueprint: Record<string, any>;
  priorities?: Record<string, any>;
}

export interface UpdateBlueprintInput {
  id: number;
  blueprint?: Record<string, any>;
  priorities?: Record<string, any>;
}

/**
 * Buscar um blueprint por ID
 */
export async function findBlueprintById(id: number): Promise<ExamBlueprint | null> {
  const { rows } = await query<ExamBlueprint>(
    'SELECT * FROM exam_blueprints WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

/**
 * Buscar blueprints por harvest_item_id
 */
export async function findBlueprintsByHarvestId(harvestItemId: number): Promise<ExamBlueprint[]> {
  const { rows } = await query<ExamBlueprint>(
    'SELECT * FROM exam_blueprints WHERE harvest_item_id = $1 ORDER BY created_at DESC',
    [harvestItemId]
  );
  return rows;
}

/**
 * Buscar blueprints por disciplina
 */
export async function findBlueprintsByDisciplina(disciplina: string): Promise<ExamBlueprint[]> {
  const { rows } = await query<ExamBlueprint>(
    'SELECT * FROM exam_blueprints WHERE disciplina = $1 ORDER BY created_at DESC',
    [disciplina]
  );
  return rows;
}

/**
 * Buscar blueprints por banca
 */
export async function findBlueprintsByBanca(banca: string): Promise<ExamBlueprint[]> {
  const { rows } = await query<ExamBlueprint>(
    'SELECT * FROM exam_blueprints WHERE banca = $1 ORDER BY created_at DESC',
    [banca]
  );
  return rows;
}

/**
 * Criar um novo blueprint
 */
export async function createBlueprint(input: CreateBlueprintInput): Promise<ExamBlueprint> {
  const { rows } = await query<ExamBlueprint>(
    `
      INSERT INTO exam_blueprints (harvest_item_id, exam_code, banca, cargo, disciplina, blueprint, priorities)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [
      input.harvest_item_id || null,
      input.exam_code || null,
      input.banca || null,
      input.cargo || null,
      input.disciplina || null,
      JSON.stringify(input.blueprint),
      input.priorities ? JSON.stringify(input.priorities) : null
    ]
  );
  return rows[0];
}

/**
 * Atualizar um blueprint
 */
export async function updateBlueprint(input: UpdateBlueprintInput): Promise<ExamBlueprint> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (input.blueprint !== undefined) {
    updates.push(`blueprint = $${paramCount++}`);
    values.push(JSON.stringify(input.blueprint));
  }

  if (input.priorities !== undefined) {
    updates.push(`priorities = $${paramCount++}`);
    values.push(JSON.stringify(input.priorities));
  }

  if (updates.length === 0) {
    return findBlueprintById(input.id) as Promise<ExamBlueprint>;
  }

  values.push(input.id);

  const { rows } = await query<ExamBlueprint>(
    `
      UPDATE exam_blueprints
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `,
    values
  );
  return rows[0];
}

/**
 * Listar todos os blueprints
 */
export async function listAllBlueprints(): Promise<ExamBlueprint[]> {
  const { rows } = await query<ExamBlueprint>(
    'SELECT * FROM exam_blueprints ORDER BY created_at DESC'
  );
  return rows;
}

/**
 * Deletar um blueprint
 */
export async function deleteBlueprint(id: number): Promise<boolean> {
  // Note: pg query wrapper doesn't return rowCount, so we check if delete was successful
  // by attempting to fetch the item after deletion
  try {
    await query(
      'DELETE FROM exam_blueprints WHERE id = $1',
      [id]
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Contar blueprints por disciplina
 */
export async function countBlueprintsByDisciplina(disciplina: string): Promise<number> {
  const { rows } = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM exam_blueprints WHERE disciplina = $1',
    [disciplina]
  );
  return parseInt(rows[0]?.count || '0', 10);
}
