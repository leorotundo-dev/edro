import { query } from '../db/db';
import type { RagBlock } from './types';

interface RagBlockRow {
  id: number;
  disciplina: string;
  topic_code: string;
  banca: string | null;
  source_url: string;
  summary: string;
  embedding: number[] | null;
  created_at: string;
}

export async function getRagBlocksByTopic(
  disciplina: string,
  topicCode: string
): Promise<RagBlock[]> {
  const { rows } = await query<RagBlockRow>(
    `
    SELECT
      id,
      disciplina,
      topic_code,
      banca,
      source_url,
      summary,
      embedding,
      created_at
    FROM rag_blocks
    WHERE disciplina = $1
      AND topic_code = $2
    ORDER BY created_at DESC
    `,
    [disciplina, topicCode]
  );

  return rows.map((r) => ({
    id: r.id,
    disciplina: r.disciplina,
    topicCode: r.topic_code,
    banca: r.banca,
    sourceUrl: r.source_url,
    summary: r.summary,
    embedding: r.embedding,
    createdAt: new Date(r.created_at)
  }));
}
