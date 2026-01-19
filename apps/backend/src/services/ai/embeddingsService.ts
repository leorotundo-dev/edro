/**
 * Embeddings Service
 * Real OpenAI embeddings implementation
 */

import OpenAI from 'openai';
import { MonitoringService } from '../../middleware/monitoring';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = 'text-embedding-ada-002';
const EMBEDDING_DIMENSIONS = 1536;

// ============================================
// GENERATE EMBEDDINGS
// ============================================

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    // Truncate if too long (max 8191 tokens for ada-002)
    const truncated = text.substring(0, 8000);

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: truncated,
    });

    MonitoringService.trackIaUsage({
      model: EMBEDDING_MODEL,
      type: 'embedding',
      promptTokens: response.usage?.prompt_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    });

    return response.data[0].embedding;
  } catch (err) {
    console.error('[embeddings] Error generating embedding:', err);
    
    // Fallback to zero vector if OpenAI fails
    console.warn('[embeddings] Using zero vector fallback');
    return new Array(EMBEDDING_DIMENSIONS).fill(0);
  }
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    if (!texts || texts.length === 0) {
      return [];
    }

    // Filter empty texts
    const validTexts = texts.filter(t => t && t.trim().length > 0);
    
    if (validTexts.length === 0) {
      return [];
    }

    // Truncate all texts
    const truncated = validTexts.map(t => t.substring(0, 8000));

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: truncated,
    });

    MonitoringService.trackIaUsage({
      model: EMBEDDING_MODEL,
      type: 'embedding',
      promptTokens: response.usage?.prompt_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    });

    return response.data.map(d => d.embedding);
  } catch (err) {
    console.error('[embeddings] Error generating batch embeddings:', err);
    
    // Fallback to zero vectors
    console.warn('[embeddings] Using zero vectors fallback');
    return texts.map(() => new Array(EMBEDDING_DIMENSIONS).fill(0));
  }
}

// ============================================
// COSINE SIMILARITY
// ============================================

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

// ============================================
// FIND SIMILAR
// ============================================

export interface SimilarItem<T> {
  item: T;
  similarity: number;
}

export function findSimilar<T extends { embedding?: number[] }>(
  query: number[],
  items: T[],
  topK: number = 10
): SimilarItem<T>[] {
  const results: SimilarItem<T>[] = [];

  for (const item of items) {
    if (!item.embedding || item.embedding.length === 0) {
      continue;
    }

    const similarity = cosineSimilarity(query, item.embedding);
    results.push({ item, similarity });
  }

  // Sort by similarity (descending)
  results.sort((a, b) => b.similarity - a.similarity);

  // Return top K
  return results.slice(0, topK);
}

// ============================================
// BATCH PROCESSING
// ============================================

export async function generateEmbeddingsBatch(
  items: Array<{ id: string; text: string }>,
  batchSize: number = 100
): Promise<Array<{ id: string; embedding: number[] }>> {
  const results: Array<{ id: string; embedding: number[] }> = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    console.log(`[embeddings] Processing batch ${i / batchSize + 1}/${Math.ceil(items.length / batchSize)}`);

    const texts = batch.map(item => item.text);
    const embeddings = await generateEmbeddings(texts);

    for (let j = 0; j < batch.length; j++) {
      results.push({
        id: batch[j].id,
        embedding: embeddings[j],
      });
    }

    // Rate limiting: wait 1s between batches
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

// ============================================
// RERANK
// ============================================

export async function rerankWithEmbeddings<T extends { text: string }>(
  query: string,
  items: T[],
  topK: number = 10
): Promise<T[]> {
  try {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // Generate embeddings for all items
    const texts = items.map(item => item.text);
    const itemEmbeddings = await generateEmbeddings(texts);

    // Calculate similarities
    const similarities = itemEmbeddings.map(emb => 
      cosineSimilarity(queryEmbedding, emb)
    );

    // Create items with similarities
    const itemsWithSimilarity = items.map((item, idx) => ({
      item,
      similarity: similarities[idx],
    }));

    // Sort and return top K
    itemsWithSimilarity.sort((a, b) => b.similarity - a.similarity);

    return itemsWithSimilarity.slice(0, topK).map(x => x.item);
  } catch (err) {
    console.error('[embeddings] Error reranking:', err);
    return items.slice(0, topK);
  }
}

// ============================================
// EXPORTS
// ============================================

export const EmbeddingsService = {
  generateEmbedding,
  generateEmbeddings,
  generateEmbeddingsBatch,
  cosineSimilarity,
  findSimilar,
  rerankWithEmbeddings,
};

export default EmbeddingsService;
