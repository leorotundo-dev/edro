/**
 * Mnemonic Repository
 * 
 * Persistência de mnemônicos
 */

import { query } from '../db';

// ============================================
// TIPOS
// ============================================

export interface Mnemonico {
  id: string;
  tecnica: string;
  texto_principal: string;
  versoes_alternativas?: string[];
  explicacao?: string;
  disciplina_id?: string;
  subtopico?: string;
  banca?: string;
  nivel_dificuldade?: number;
  estilo_cognitivo?: string;
  emocao_ativada?: string;
  forca_memoria?: number;
  criado_por?: string;
  versao?: string;
  created_at: Date;
  updated_at: Date;
}

export interface MnemonicoUsuario {
  id: string;
  user_id: string;
  mnemonico_id: string;
  favorito: boolean;
  criado_por_usuario: boolean;
  vezes_usado: number;
  ultima_vez_usado?: Date;
  funciona_bem?: boolean;
  mnemonico?: Mnemonico;
}

export interface MnemonicoTracking {
  id: string;
  user_id: string;
  mnemonico_id: string;
  ajudou_lembrar: boolean;
  tempo_para_lembrar?: number;
  contexto?: string;
  timestamp: Date;
}

export interface MnemonicoVersion {
  id: string;
  mnemonico_id: string;
  versao: string;
  motivo?: string;
  alteracoes?: any;
  ia_model?: string;
  created_at: Date;
}

// ============================================
// CRIAR MNEMÔNICO
// ============================================

export async function createMnemonico(data: Partial<Mnemonico>): Promise<string> {
  const { rows } = await query<{ id: string }>(`
    INSERT INTO mnemonicos (
      tecnica, texto_principal, versoes_alternativas, explicacao,
      disciplina_id, subtopico, banca, nivel_dificuldade,
      estilo_cognitivo, emocao_ativada, forca_memoria,
      criado_por, versao
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING id
  `, [
    data.tecnica,
    data.texto_principal,
    JSON.stringify(data.versoes_alternativas || []),
    data.explicacao,
    data.disciplina_id,
    data.subtopico,
    data.banca,
    data.nivel_dificuldade,
    data.estilo_cognitivo,
    data.emocao_ativada,
    data.forca_memoria,
    data.criado_por || 'IA',
    data.versao || 'v1.0',
  ]);

  return rows[0].id;
}

// ============================================
// BUSCAR MNEMÔNICOS
// ============================================

export async function getMnemonicoById(id: string): Promise<Mnemonico | null> {
  const { rows } = await query<Mnemonico>(`
    SELECT * FROM mnemonicos WHERE id = $1
  `, [id]);

  return rows[0] || null;
}

export async function getAllMnemonicos(filters?: {
  disciplina_id?: string;
  subtopico?: string;
  banca?: string;
  tecnica?: string;
  limit?: number;
}): Promise<Mnemonico[]> {
  let sql = 'SELECT * FROM mnemonicos WHERE 1=1';
  const params: any[] = [];
  let paramCount = 1;

  if (filters?.disciplina_id) {
    sql += ` AND disciplina_id = $${paramCount++}`;
    params.push(filters.disciplina_id);
  }

  if (filters?.subtopico) {
    sql += ` AND subtopico = $${paramCount++}`;
    params.push(filters.subtopico);
  }

  if (filters?.banca) {
    sql += ` AND banca = $${paramCount++}`;
    params.push(filters.banca);
  }

  if (filters?.tecnica) {
    sql += ` AND tecnica = $${paramCount++}`;
    params.push(filters.tecnica);
  }

  sql += ` ORDER BY created_at DESC`;

  if (filters?.limit) {
    sql += ` LIMIT $${paramCount++}`;
    params.push(filters.limit);
  }

  const { rows } = await query<Mnemonico>(sql, params);
  return rows;
}

export async function getMnemonicosBySubtopico(subtopico: string): Promise<Mnemonico[]> {
  const { rows } = await query<Mnemonico>(`
    SELECT * FROM mnemonicos
    WHERE subtopico = $1
    ORDER BY forca_memoria DESC
  `, [subtopico]);

  return rows;
}

// ============================================
// MNEMÔNICOS DO USUÁRIO
// ============================================

export async function addMnemonicoToUser(params: {
  userId: string;
  mnemonicoId: string;
  criado_por_usuario?: boolean;
}): Promise<string> {
  const { rows } = await query<{ id: string }>(`
    INSERT INTO mnemonicos_usuario (
      user_id, mnemonico_id, criado_por_usuario
    ) VALUES ($1, $2, $3)
    ON CONFLICT (user_id, mnemonico_id)
    DO UPDATE SET updated_at = NOW()
    RETURNING id
  `, [
    params.userId,
    params.mnemonicoId,
    params.criado_por_usuario || false,
  ]);

  return rows[0].id;
}

export async function getUserMnemonicos(userId: string): Promise<MnemonicoUsuario[]> {
  const { rows } = await query<any>(`
    SELECT 
      mu.*,
      m.tecnica, m.texto_principal, m.explicacao,
      m.subtopico, m.banca, m.versoes_alternativas, m.versao,
      m.disciplina_id, m.nivel_dificuldade, m.forca_memoria,
      m.estilo_cognitivo, m.emocao_ativada
    FROM mnemonicos_usuario mu
    JOIN mnemonicos m ON m.id = mu.mnemonico_id
    WHERE mu.user_id = $1
    ORDER BY mu.favorito DESC, mu.vezes_usado DESC
  `, [userId]);

  return rows.map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    mnemonico_id: row.mnemonico_id,
    favorito: row.favorito,
    criado_por_usuario: row.criado_por_usuario,
    vezes_usado: row.vezes_usado,
    ultima_vez_usado: row.ultima_vez_usado,
    funciona_bem: row.funciona_bem,
    mnemonico: {
      id: row.mnemonico_id,
      tecnica: row.tecnica,
      texto_principal: row.texto_principal,
      explicacao: row.explicacao,
      versoes_alternativas: row.versoes_alternativas,
      subtopico: row.subtopico,
      banca: row.banca,
      disciplina_id: row.disciplina_id,
      nivel_dificuldade: row.nivel_dificuldade,
      forca_memoria: row.forca_memoria,
      versao: row.versao,
      estilo_cognitivo: row.estilo_cognitivo,
      emocao_ativada: row.emocao_ativada,
    } as any,
  }));
}

export async function getUserFavorites(userId: string): Promise<MnemonicoUsuario[]> {
  const { rows } = await query<any>(`
    SELECT 
      mu.*,
      m.tecnica, m.texto_principal, m.explicacao,
      m.subtopico, m.banca, m.versoes_alternativas, m.versao,
      m.disciplina_id, m.nivel_dificuldade, m.forca_memoria,
      m.estilo_cognitivo, m.emocao_ativada
    FROM mnemonicos_usuario mu
    JOIN mnemonicos m ON m.id = mu.mnemonico_id
    WHERE mu.user_id = $1 AND mu.favorito = true
    ORDER BY mu.vezes_usado DESC
  `, [userId]);

  return rows.map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    mnemonico_id: row.mnemonico_id,
    favorito: row.favorito,
    criado_por_usuario: row.criado_por_usuario,
    vezes_usado: row.vezes_usado,
    ultima_vez_usado: row.ultima_vez_usado,
    funciona_bem: row.funciona_bem,
    mnemonico: {
      id: row.mnemonico_id,
      tecnica: row.tecnica,
      texto_principal: row.texto_principal,
      explicacao: row.explicacao,
      versoes_alternativas: row.versoes_alternativas,
      subtopico: row.subtopico,
      banca: row.banca,
      disciplina_id: row.disciplina_id,
      nivel_dificuldade: row.nivel_dificuldade,
      forca_memoria: row.forca_memoria,
      versao: row.versao,
      estilo_cognitivo: row.estilo_cognitivo,
      emocao_ativada: row.emocao_ativada,
    } as any,
  }));
}

export async function toggleFavorite(userId: string, mnemonicoId: string): Promise<void> {
  await query(`
    UPDATE mnemonicos_usuario
    SET favorito = NOT favorito
    WHERE user_id = $1 AND mnemonico_id = $2
  `, [userId, mnemonicoId]);
}

export async function updateMnemonicoUsage(userId: string, mnemonicoId: string): Promise<void> {
  await query(`
    UPDATE mnemonicos_usuario
    SET vezes_usado = vezes_usado + 1,
        ultima_vez_usado = NOW()
    WHERE user_id = $1 AND mnemonico_id = $2
  `, [userId, mnemonicoId]);
}

export async function setFeedback(
  userId: string,
  mnemonicoId: string,
  funcionaBem: boolean
): Promise<void> {
  await query(`
    UPDATE mnemonicos_usuario
    SET funciona_bem = $3
    WHERE user_id = $1 AND mnemonico_id = $2
  `, [userId, mnemonicoId, funcionaBem]);
}

// ============================================
// TRACKING
// ============================================

export async function trackMnemonicoUse(data: Partial<MnemonicoTracking>): Promise<string> {
  const { rows } = await query<{ id: string }>(`
    INSERT INTO mnemonicos_tracking (
      user_id, mnemonico_id, ajudou_lembrar,
      tempo_para_lembrar, contexto, timestamp
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `, [
    data.user_id,
    data.mnemonico_id,
    data.ajudou_lembrar,
    data.tempo_para_lembrar,
    data.contexto,
    data.timestamp || new Date(),
  ]);

  return rows[0].id;
}

export async function getMnemonicoEffectiveness(mnemonicoId: string): Promise<{
  total_uses: number;
  success_rate: number;
  avg_time: number;
}> {
  const { rows } = await query(`
    SELECT 
      COUNT(*) as total_uses,
      SUM(CASE WHEN ajudou_lembrar THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as success_rate,
      AVG(tempo_para_lembrar) as avg_time
    FROM mnemonicos_tracking
    WHERE mnemonico_id = $1
  `, [mnemonicoId]);

  return {
    total_uses: parseInt(rows[0].total_uses || '0'),
    success_rate: parseFloat(rows[0].success_rate || '0'),
    avg_time: parseFloat(rows[0].avg_time || '0'),
  };
}

// ============================================
// ATUALIZAR MNEMÔNICO
// ============================================

export async function updateMnemonico(
  id: string,
  data: Partial<Mnemonico>
): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (data.texto_principal !== undefined) {
    fields.push(`texto_principal = $${paramCount++}`);
    values.push(data.texto_principal);
  }

  if (data.explicacao !== undefined) {
    fields.push(`explicacao = $${paramCount++}`);
    values.push(data.explicacao);
  }

  if (data.versoes_alternativas !== undefined) {
    fields.push(`versoes_alternativas = $${paramCount++}`);
    values.push(JSON.stringify(data.versoes_alternativas));
  }

  if (data.versao !== undefined) {
    fields.push(`versao = $${paramCount++}`);
    values.push(data.versao);
  }

  if (data.emocao_ativada !== undefined) {
    fields.push(`emocao_ativada = $${paramCount++}`);
    values.push(data.emocao_ativada);
  }

  if (data.forca_memoria !== undefined) {
    fields.push(`forca_memoria = $${paramCount++}`);
    values.push(data.forca_memoria);
  }

  if (fields.length === 0) return;

  fields.push('updated_at = NOW()');
  values.push(id);

  await query(
    `UPDATE mnemonicos SET ${fields.join(', ')} WHERE id = $${paramCount}`,
    values
  );
}

export async function addMnemonicoVersion(params: {
  mnemonico_id: string;
  versao: string;
  motivo?: string;
  alteracoes?: any;
  ia_model?: string;
}): Promise<string> {
  const { rows } = await query<{ id: string }>(`
    INSERT INTO mnemonicos_versions (
      mnemonico_id, versao, motivo, alteracoes, ia_model
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `, [
    params.mnemonico_id,
    params.versao,
    params.motivo ?? null,
    JSON.stringify(params.alteracoes || {}),
    params.ia_model ?? null,
  ]);

  return rows[0].id;
}

// ============================================
// DELETAR MNEMÔNICO
// ============================================

export async function deleteMnemonico(id: string): Promise<void> {
  await query('DELETE FROM mnemonicos WHERE id = $1', [id]);
}

export async function removeMnemonicoFromUser(userId: string, mnemonicoId: string): Promise<void> {
  await query(`
    DELETE FROM mnemonicos_usuario
    WHERE user_id = $1 AND mnemonico_id = $2
  `, [userId, mnemonicoId]);
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const MnemonicoRepository = {
  createMnemonico,
  getMnemonicoById,
  getAllMnemonicos,
  getMnemonicosBySubtopico,
  addMnemonicoToUser,
  getUserMnemonicos,
  getUserFavorites,
  toggleFavorite,
  updateMnemonicoUsage,
  setFeedback,
  trackMnemonicoUse,
  getMnemonicoEffectiveness,
  updateMnemonico,
  addMnemonicoVersion,
  deleteMnemonico,
  removeMnemonicoFromUser,
};

export default MnemonicoRepository;
