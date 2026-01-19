/**
 * Blueprint Service
 * 
 * Extração e análise de estrutura de editais
 */

import { query } from '../db';
import { extractBlueprint as extractBlueprintAI } from './ai/extractBlueprint';
import { OpenAIService } from './ai/openaiService';

// ============================================
// TIPOS
// ============================================

export interface Blueprint {
  id: string;
  concurso: string;
  orgao: string;
  banca: string;
  cargo: string;
  edital_url?: string;
  ano: number;
  estrutura: BlueprintStructure;
  metadata?: any;
  status: 'draft' | 'active' | 'archived';
  created_at: Date;
  updated_at: Date;
}

export interface BlueprintStructure {
  disciplinas: BlueprintDisciplina[];
  total_topicos: number;
  total_subtopicos: number;
}

export interface BlueprintDisciplina {
  nome: string;
  codigo: string;
  peso?: number;
  topicos: BlueprintTopico[];
}

export interface BlueprintTopico {
  nome: string;
  codigo: string;
  subtopicos: BlueprintSubtopico[];
}

export interface BlueprintSubtopico {
  nome: string;
  codigo: string;
  nivel?: number;
  importancia?: number;
}

// ============================================
// CRIAR BLUEPRINT
// ============================================

export async function createBlueprint(data: {
  concurso: string;
  orgao: string;
  banca: string;
  cargo: string;
  ano: number;
  edital_url?: string;
  estrutura?: BlueprintStructure;
}): Promise<string> {
  console.log(`[blueprint] Criando blueprint: ${data.concurso}`);

  const estrutura = data.estrutura || {
    disciplinas: [],
    total_topicos: 0,
    total_subtopicos: 0,
  };

  const { rows } = await query<{ id: string }>(`
    INSERT INTO blueprints (
      concurso, orgao, banca, cargo, ano, edital_url,
      estrutura, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
  `, [
    data.concurso,
    data.orgao,
    data.banca,
    data.cargo,
    data.ano,
    data.edital_url,
    JSON.stringify(estrutura),
    'draft',
  ]);

  return rows[0].id;
}

// ============================================
// BUSCAR BLUEPRINTS
// ============================================

export async function getBlueprints(filters?: {
  banca?: string;
  orgao?: string;
  ano?: number;
  status?: string;
  limit?: number;
}): Promise<Blueprint[]> {
  let sql = 'SELECT * FROM blueprints WHERE 1=1';
  const params: any[] = [];
  let paramCount = 1;

  if (filters?.banca) {
    sql += ` AND banca = $${paramCount++}`;
    params.push(filters.banca);
  }

  if (filters?.orgao) {
    sql += ` AND orgao = $${paramCount++}`;
    params.push(filters.orgao);
  }

  if (filters?.ano) {
    sql += ` AND ano = $${paramCount++}`;
    params.push(filters.ano);
  }

  if (filters?.status) {
    sql += ` AND status = $${paramCount++}`;
    params.push(filters.status);
  }

  sql += ' ORDER BY ano DESC, created_at DESC';

  if (filters?.limit) {
    sql += ` LIMIT $${paramCount++}`;
    params.push(filters.limit);
  }

  const { rows } = await query<Blueprint>(sql, params);
  return rows;
}

export async function getBlueprintById(id: string): Promise<Blueprint | null> {
  const { rows } = await query<Blueprint>(`
    SELECT * FROM blueprints WHERE id = $1
  `, [id]);

  return rows[0] || null;
}

// ============================================
// EXTRAIR ESTRUTURA (IA)
// ============================================

export async function extractStructure(params: {
  editalText: string;
  concurso: string;
  banca: string;
}): Promise<BlueprintStructure> {
  console.log(`[blueprint] Extraindo estrutura para: ${params.concurso}`);

  try {
    // Tentar extrair com OpenAI
    try {
      const aiResult = await OpenAIService.extractBlueprintStructure({
        editalText: params.editalText,
        concurso: params.concurso,
      });

      // Converter para BlueprintStructure
      const disciplinas: BlueprintDisciplina[] = aiResult.disciplinas.map((d, idx) => ({
        nome: d.nome,
        codigo: `DISC-${idx + 1}`,
        topicos: d.topicos.map((t, tIdx) => ({
          nome: t.nome,
          codigo: `TOP-${idx + 1}-${tIdx + 1}`,
          subtopicos: t.subtopicos.map((st, stIdx) => ({
            nome: st,
            codigo: `SUB-${idx + 1}-${tIdx + 1}-${stIdx + 1}`,
          })),
        })),
      }));

      const totalTopicos = disciplinas.reduce((sum, d) => sum + d.topicos.length, 0);
      const totalSubtopicos = disciplinas.reduce(
        (sum, d) => sum + d.topicos.reduce((s, t) => s + t.subtopicos.length, 0),
        0
      );

      const estrutura: BlueprintStructure = {
        disciplinas,
        total_topicos: totalTopicos,
        total_subtopicos: totalSubtopicos,
      };

      console.log(`[blueprint] ✅ Estrutura extraída: ${estrutura.total_topicos} tópicos`);
      return estrutura;
    } catch (aiErr) {
      console.warn('[blueprint] Erro ao extrair com IA, tentando método antigo:', aiErr);
      
      // Fallback: método antigo
      const result = await extractBlueprintAI({
        editalText: params.editalText,
        concurso: params.concurso,
        banca: params.banca,
      });

      const estrutura = processExtractionResult(result);
      console.log(`[blueprint] ✅ Estrutura extraída (fallback): ${estrutura.total_topicos} tópicos`);
      return estrutura;
    }
  } catch (err) {
    console.error('[blueprint] Erro ao extrair estrutura:', err);
    throw err;
  }
}

function processExtractionResult(result: any): BlueprintStructure {
  // Processar resultado da IA e converter para BlueprintStructure
  const disciplinas: BlueprintDisciplina[] = [];
  let totalTopicos = 0;
  let totalSubtopicos = 0;

  // TODO: Implementar processamento real do resultado da IA
  // Por ora, retorna estrutura vazia

  return {
    disciplinas,
    total_topicos: totalTopicos,
    total_subtopicos: totalSubtopicos,
  };
}

// ============================================
// ANÁLISE DE ESTRUTURA
// ============================================

export async function analyzeStructure(blueprintId: string): Promise<{
  total_disciplinas: number;
  total_topicos: number;
  total_subtopicos: number;
  disciplinas_mais_extensas: Array<{ nome: string; topicos: number }>;
  nivel_complexidade: 'baixo' | 'medio' | 'alto';
}> {
  console.log(`[blueprint] Analisando estrutura de ${blueprintId}`);

  const blueprint = await getBlueprintById(blueprintId);
  if (!blueprint) {
    throw new Error('Blueprint não encontrado');
  }

  const estrutura = blueprint.estrutura;
  const totalDisciplinas = estrutura.disciplinas.length;
  const totalTopicos = estrutura.total_topicos;
  const totalSubtopicos = estrutura.total_subtopicos;

  // Disciplinas mais extensas
  const disciplinasExtensas = estrutura.disciplinas
    .map(d => ({
      nome: d.nome,
      topicos: d.topicos.length,
    }))
    .sort((a, b) => b.topicos - a.topicos)
    .slice(0, 5);

  // Nível de complexidade
  let nivel: 'baixo' | 'medio' | 'alto' = 'baixo';
  if (totalSubtopicos > 200) {
    nivel = 'alto';
  } else if (totalSubtopicos > 100) {
    nivel = 'medio';
  }

  return {
    total_disciplinas: totalDisciplinas,
    total_topicos: totalTopicos,
    total_subtopicos: totalSubtopicos,
    disciplinas_mais_extensas: disciplinasExtensas,
    nivel_complexidade: nivel,
  };
}

// ============================================
// COMPARAR BLUEPRINTS
// ============================================

export async function compareBlueprints(id1: string, id2: string): Promise<{
  comum: string[];
  exclusivo_1: string[];
  exclusivo_2: string[];
  similaridade: number;
}> {
  console.log(`[blueprint] Comparando blueprints ${id1} e ${id2}`);

  const bp1 = await getBlueprintById(id1);
  const bp2 = await getBlueprintById(id2);

  if (!bp1 || !bp2) {
    throw new Error('Blueprint não encontrado');
  }

  // Extrair todos os subtópicos
  const topicos1 = extractAllTopicCodes(bp1.estrutura);
  const topicos2 = extractAllTopicCodes(bp2.estrutura);

  const comum = topicos1.filter(t => topicos2.includes(t));
  const exclusivo1 = topicos1.filter(t => !topicos2.includes(t));
  const exclusivo2 = topicos2.filter(t => !topicos1.includes(t));

  // Calcular similaridade (Jaccard)
  const totalUnicos = new Set([...topicos1, ...topicos2]).size;
  const similaridade = totalUnicos > 0 ? (comum.length / totalUnicos) * 100 : 0;

  return {
    comum,
    exclusivo_1: exclusivo1,
    exclusivo_2: exclusivo2,
    similaridade,
  };
}

function extractAllTopicCodes(estrutura: BlueprintStructure): string[] {
  const codes: string[] = [];

  estrutura.disciplinas.forEach(d => {
    d.topicos.forEach(t => {
      codes.push(t.codigo);
      t.subtopicos.forEach(st => {
        codes.push(st.codigo);
      });
    });
  });

  return codes;
}

// ============================================
// ATUALIZAR BLUEPRINT
// ============================================

export async function updateBlueprint(
  id: string,
  data: Partial<Blueprint>
): Promise<void> {
  console.log(`[blueprint] Atualizando blueprint ${id}`);

  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (data.concurso !== undefined) {
    fields.push(`concurso = $${paramCount++}`);
    values.push(data.concurso);
  }

  if (data.orgao !== undefined) {
    fields.push(`orgao = $${paramCount++}`);
    values.push(data.orgao);
  }

  if (data.banca !== undefined) {
    fields.push(`banca = $${paramCount++}`);
    values.push(data.banca);
  }

  if (data.estrutura !== undefined) {
    fields.push(`estrutura = $${paramCount++}`);
    values.push(JSON.stringify(data.estrutura));
  }

  if (data.status !== undefined) {
    fields.push(`status = $${paramCount++}`);
    values.push(data.status);
  }

  if (fields.length === 0) return;

  fields.push('updated_at = NOW()');
  values.push(id);

  await query(
    `UPDATE blueprints SET ${fields.join(', ')} WHERE id = $${paramCount}`,
    values
  );
}

// ============================================
// ATIVAR/ARQUIVAR
// ============================================

export async function activateBlueprint(id: string): Promise<void> {
  console.log(`[blueprint] Ativando blueprint ${id}`);
  await updateBlueprint(id, { status: 'active' });
}

export async function archiveBlueprint(id: string): Promise<void> {
  console.log(`[blueprint] Arquivando blueprint ${id}`);
  await updateBlueprint(id, { status: 'archived' });
}

// ============================================
// DELETAR BLUEPRINT
// ============================================

export async function deleteBlueprint(id: string): Promise<void> {
  console.log(`[blueprint] Deletando blueprint ${id}`);
  await query('DELETE FROM blueprints WHERE id = $1', [id]);
}

// ============================================
// ESTATÍSTICAS
// ============================================

export async function getBlueprintStats(): Promise<{
  total_blueprints: number;
  total_ativos: number;
  bancas: Array<{ banca: string; count: number }>;
  orgaos: Array<{ orgao: string; count: number }>;
}> {
  const { rows: total } = await query(`
    SELECT COUNT(*) as total FROM blueprints
  `);

  const { rows: ativos } = await query(`
    SELECT COUNT(*) as total FROM blueprints WHERE status = 'active'
  `);

  const { rows: bancas } = await query(`
    SELECT banca, COUNT(*) as count
    FROM blueprints
    GROUP BY banca
    ORDER BY count DESC
    LIMIT 10
  `);

  const { rows: orgaos } = await query(`
    SELECT orgao, COUNT(*) as count
    FROM blueprints
    GROUP BY orgao
    ORDER BY count DESC
    LIMIT 10
  `);

  return {
    total_blueprints: parseInt(total[0].total),
    total_ativos: parseInt(ativos[0].total),
    bancas: bancas.map(b => ({ banca: b.banca, count: parseInt(b.count) })),
    orgaos: orgaos.map(o => ({ orgao: o.orgao, count: parseInt(o.count) })),
  };
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const BlueprintService = {
  createBlueprint,
  getBlueprints,
  getBlueprintById,
  extractStructure,
  analyzeStructure,
  compareBlueprints,
  updateBlueprint,
  activateBlueprint,
  archiveBlueprint,
  deleteBlueprint,
  getBlueprintStats,
};

export default BlueprintService;
