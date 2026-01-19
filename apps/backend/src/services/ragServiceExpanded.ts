/**
 * RAG Service - Expanded
 * 
 * Sistema de Retrieval-Augmented Generation expandido
 * com embeddings e busca semântica
 */

import { query } from '../db';
import { summarizeRAG } from './ai/summarizeRAG';
import { OpenAIService } from './ai/openaiService';

// ============================================
// TIPOS
// ============================================

export interface RagBlock {
  id: string;
  disciplina: string;
  topic_code: string;
  banca?: string;
  source_url: string;
  summary: string;
  full_content?: string;
  embedding?: number[];
  metadata?: any;
  created_at: Date;
}

export interface RagSearchResult {
  block: RagBlock;
  similarity: number;
  relevance_score: number;
}

// ============================================
// CRIAR BLOCOS RAG
// ============================================

export async function createRagBlock(data: {
  disciplina: string;
  topicCode: string;
  banca?: string;
  sourceUrl: string;
  summary: string;
  fullContent?: string;
  metadata?: any;
}): Promise<string> {
  console.log(`[rag] Criando bloco RAG: ${data.topicCode}`);

  const { rows } = await query<{ id: string }>(`
    INSERT INTO rag_blocks (
      disciplina, topic_code, banca, source_url,
      summary, full_content, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `, [
    data.disciplina,
    data.topicCode,
    data.banca,
    data.sourceUrl,
    data.summary,
    data.fullContent,
    JSON.stringify(data.metadata || {}),
  ]);

  const blockId = rows[0].id;

  // Gerar embedding (assíncrono)
  generateEmbedding(blockId, data.summary).catch(err => {
    console.error(`[rag] Erro ao gerar embedding para ${blockId}:`, err);
  });

  return blockId;
}

// ============================================
// GERAR EMBEDDINGS
// ============================================

export async function generateEmbedding(blockId: string, text: string): Promise<void> {
  console.log(`[rag] Gerando embedding para bloco ${blockId}`);

  try {
    let embedding: number[];
    
    // Tentar gerar com OpenAI
    try {
      embedding = await OpenAIService.generateEmbedding(text);
    } catch (err) {
      console.warn('[rag] Erro ao gerar embedding real, usando simulado:', err);
      embedding = simulateEmbedding(text);
    }

    await saveEmbedding(blockId, embedding);

    console.log(`[rag] ✅ Embedding salvo para ${blockId}`);
  } catch (err) {
    console.error(`[rag] Erro ao gerar embedding:`, err);
    throw err;
  }
}

function simulateEmbedding(text: string): number[] {
  // Simula embedding de 1536 dimensões (padrão OpenAI)
  const embedding: number[] = [];
  for (let i = 0; i < 1536; i++) {
    embedding.push(Math.random() * 2 - 1); // -1 a 1
  }
  return embedding;
}

async function saveEmbedding(blockId: string, embedding: number[]): Promise<void> {
  await query(`
    UPDATE rag_blocks
    SET embedding = $2
    WHERE id = $1
  `, [blockId, JSON.stringify(embedding)]);
}

// ============================================
// BUSCA SEMÂNTICA
// ============================================

export async function semanticSearch(params: {
  query: string;
  disciplina?: string;
  topicCode?: string;
  banca?: string;
  limit?: number;
}): Promise<RagSearchResult[]> {
  console.log(`[rag] Busca semântica: "${params.query}"`);

  // Gerar embedding da query
  const queryEmbedding = await generateQueryEmbedding(params.query);

  // Buscar blocos relevantes
  let sql = 'SELECT * FROM rag_blocks WHERE embedding IS NOT NULL';
  const sqlParams: any[] = [];
  let paramCount = 1;

  if (params.disciplina) {
    sql += ` AND disciplina = $${paramCount++}`;
    sqlParams.push(params.disciplina);
  }

  if (params.topicCode) {
    sql += ` AND topic_code = $${paramCount++}`;
    sqlParams.push(params.topicCode);
  }

  if (params.banca) {
    sql += ` AND banca = $${paramCount++}`;
    sqlParams.push(params.banca);
  }

  const { rows } = await query<any>(sql, sqlParams);

  // Calcular similaridade
  const results: RagSearchResult[] = rows.map((row: any) => {
    const embedding = typeof row.embedding === 'string' 
      ? JSON.parse(row.embedding) 
      : row.embedding;

    const similarity = cosineSimilarity(queryEmbedding, embedding);
    const relevanceScore = calculateRelevance(similarity, row);

    return {
      block: {
        id: row.id,
        disciplina: row.disciplina,
        topic_code: row.topic_code,
        banca: row.banca,
        source_url: row.source_url,
        summary: row.summary,
        full_content: row.full_content,
        metadata: row.metadata,
        created_at: row.created_at,
      },
      similarity,
      relevance_score: relevanceScore,
    };
  });

  // Ordenar por relevância
  results.sort((a, b) => b.relevance_score - a.relevance_score);

  // Limitar resultados
  const limit = params.limit || 10;
  return results.slice(0, limit);
}

async function generateQueryEmbedding(text: string): Promise<number[]> {
  try {
    return await OpenAIService.generateEmbedding(text);
  } catch (err) {
    console.warn('[rag] Erro ao gerar embedding de query, usando simulado:', err);
    return simulateEmbedding(text);
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function calculateRelevance(similarity: number, block: any): number {
  // Combinar similaridade com outros fatores
  let relevance = similarity * 100;

  // Boost se tiver banca específica
  if (block.banca) {
    relevance *= 1.1;
  }

  // Penalizar blocos muito antigos
  const daysSinceCreation = (Date.now() - new Date(block.created_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceCreation > 365) {
    relevance *= 0.9;
  }

  return Math.min(100, relevance);
}

// ============================================
// BUSCAR BLOCOS
// ============================================

export async function getRagBlocks(filters?: {
  disciplina?: string;
  topicCode?: string;
  banca?: string;
  limit?: number;
}): Promise<RagBlock[]> {
  let sql = 'SELECT * FROM rag_blocks WHERE 1=1';
  const params: any[] = [];
  let paramCount = 1;

  if (filters?.disciplina) {
    sql += ` AND disciplina = $${paramCount++}`;
    params.push(filters.disciplina);
  }

  if (filters?.topicCode) {
    sql += ` AND topic_code = $${paramCount++}`;
    params.push(filters.topicCode);
  }

  if (filters?.banca) {
    sql += ` AND banca = $${paramCount++}`;
    params.push(filters.banca);
  }

  sql += ' ORDER BY created_at DESC';

  if (filters?.limit) {
    sql += ` LIMIT $${paramCount++}`;
    params.push(filters.limit);
  }

  const { rows } = await query<RagBlock>(sql, params);
  return rows;
}

export async function getRagBlockById(id: string): Promise<RagBlock | null> {
  const { rows } = await query<RagBlock>(`
    SELECT * FROM rag_blocks WHERE id = $1
  `, [id]);

  return rows[0] || null;
}

export async function getRagBlocksByTopic(
  disciplina: string,
  topicCode: string
): Promise<RagBlock[]> {
  return getRagBlocks({ disciplina, topicCode });
}

// ============================================
// SUMARIZAÇÃO COM IA
// ============================================

export async function summarizeContent(params: {
  fullContent: string;
  topicCode: string;
  banca?: string;
}): Promise<string> {
  console.log(`[rag] Sumarizando conteúdo de ${params.topicCode}`);

  try {
    // Tentar com OpenAI primeiro
    try {
      const summary = await OpenAIService.summarizeForRAG({
        rawText: params.fullContent,
        topicCode: params.topicCode,
      });
      return summary;
    } catch (aiErr) {
      console.warn('[rag] Erro ao sumarizar com IA, tentando método antigo:', aiErr);
      
      // Fallback: método antigo
      const summary = await summarizeRAG({
        rawText: params.fullContent,
        topicCode: params.topicCode,
        banca: params.banca,
      });
      return summary;
    }
  } catch (err) {
    console.error('[rag] Erro ao sumarizar:', err);
    // Fallback final: primeiros 500 caracteres
    return params.fullContent.substring(0, 500) + '...';
  }
}

// ============================================
// ATUALIZAR BLOCO
// ============================================

export async function updateRagBlock(
  id: string,
  data: Partial<RagBlock>
): Promise<void> {
  console.log(`[rag] Atualizando bloco ${id}`);

  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (data.summary !== undefined) {
    fields.push(`summary = $${paramCount++}`);
    values.push(data.summary);

    // Regerar embedding se summary mudou
    generateEmbedding(id, data.summary).catch(err => {
      console.error(`[rag] Erro ao regerar embedding:`, err);
    });
  }

  if (data.full_content !== undefined) {
    fields.push(`full_content = $${paramCount++}`);
    values.push(data.full_content);
  }

  if (data.metadata !== undefined) {
    fields.push(`metadata = $${paramCount++}`);
    values.push(JSON.stringify(data.metadata));
  }

  if (fields.length === 0) return;

  values.push(id);

  await query(
    `UPDATE rag_blocks SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramCount}`,
    values
  );
}

// ============================================
// DELETAR BLOCO
// ============================================

export async function deleteRagBlock(id: string): Promise<void> {
  console.log(`[rag] Deletando bloco ${id}`);
  await query('DELETE FROM rag_blocks WHERE id = $1', [id]);
}

// ============================================
// ESTATÍSTICAS
// ============================================

export async function getRagStats(): Promise<{
  total_blocks: number;
  blocks_with_embeddings: number;
  blocks_por_disciplina: Array<{ disciplina: string; count: number }>;
  blocks_por_banca: Array<{ banca: string; count: number }>;
}> {
  const { rows: total } = await query(`
    SELECT COUNT(*) as total FROM rag_blocks
  `);

  const { rows: withEmbeddings } = await query(`
    SELECT COUNT(*) as total FROM rag_blocks WHERE embedding IS NOT NULL
  `);

  const { rows: porDisciplina } = await query(`
    SELECT disciplina, COUNT(*) as count
    FROM rag_blocks
    GROUP BY disciplina
    ORDER BY count DESC
  `);

  const { rows: porBanca } = await query(`
    SELECT banca, COUNT(*) as count
    FROM rag_blocks
    WHERE banca IS NOT NULL
    GROUP BY banca
    ORDER BY count DESC
  `);

  return {
    total_blocks: parseInt(total[0].total),
    blocks_with_embeddings: parseInt(withEmbeddings[0].total),
    blocks_por_disciplina: porDisciplina.map(d => ({
      disciplina: d.disciplina,
      count: parseInt(d.count),
    })),
    blocks_por_banca: porBanca.map(b => ({
      banca: b.banca,
      count: parseInt(b.count),
    })),
  };
}

// ============================================
// BATCH OPERATIONS
// ============================================

export async function regenerateAllEmbeddings(): Promise<{
  total: number;
  success: number;
  errors: number;
}> {
  console.log('[rag] Regenerando todos os embeddings');

  const blocks = await getRagBlocks();
  let success = 0;
  let errors = 0;

  for (const block of blocks) {
    try {
      await generateEmbedding(block.id, block.summary);
      success++;
    } catch (err) {
      errors++;
      console.error(`[rag] Erro no bloco ${block.id}:`, err);
    }
  }

  return {
    total: blocks.length,
    success,
    errors,
  };
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const RagServiceExpanded = {
  createRagBlock,
  generateEmbedding,
  semanticSearch,
  getRagBlocks,
  getRagBlockById,
  getRagBlocksByTopic,
  summarizeContent,
  updateRagBlock,
  deleteRagBlock,
  getRagStats,
  regenerateAllEmbeddings,
};

export default RagServiceExpanded;
