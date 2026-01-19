import 'dotenv/config';
import { pool, query } from '../db';
import fetch from 'node-fetch';
import { summarizeRAGBlock } from '../services/ai/summarizeRAG';

interface RagBlockRow {
  id: number;
}

interface RagSource {
  disciplina: string;
  topicCode: string;
  topicName: string;
  banca?: string | null;
  sourceUrl: string;
}

const SOURCES: RagSource[] = [
  {
    disciplina: 'Português',
    topicCode: 'PT-01',
    topicName: 'Morfologia',
    banca: null,
    sourceUrl: 'https://brasilescola.uol.com.br/gramatica/morfologia.htm'
  },
  {
    disciplina: 'Direito Constitucional',
    topicCode: 'DC-01',
    topicName: 'Constituição Federal – Princípios Fundamentais',
    banca: null,
    sourceUrl: 'https://www.todamateria.com.br/constituicao-federal/'
  }
];

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  console.log('[rag-feeder] Iniciando job...');

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const src of SOURCES) {
    console.log(`[rag-feeder] Processando: ${src.topicCode} - ${src.topicName}`);

    try {
      // Verificar se já existe
      const { rows: existing } = await query<RagBlockRow>(
        `
        SELECT id
        FROM rag_blocks
        WHERE disciplina = $1
          AND topic_code = $2
          AND (banca IS NULL OR banca = $3)
          AND source_url = $4
        LIMIT 1
        `,
        [src.disciplina, src.topicCode, src.banca ?? null, src.sourceUrl]
      );

      if (existing.length > 0) {
        console.log('[rag-feeder] ⏭️  Já existe registro para esta fonte, pulando.');
        skipped++;
        continue;
      }

      // Buscar HTML
      console.log(`[rag-feeder] Buscando: ${src.sourceUrl}`);
      const res = await fetch(src.sourceUrl);
      if (!res.ok) {
        console.error(`[rag-feeder] ❌ Erro ao buscar URL (${res.status}): ${src.sourceUrl}`);
        failed++;
        continue;
      }

      // Extrair texto
      const html = await res.text();
      const plainText = htmlToText(html);

      if (!plainText || plainText.length < 500) {
        console.warn('[rag-feeder] ⚠️  Texto extraído muito curto, pulando.');
        skipped++;
        continue;
      }

      // Gerar resumo com IA
      console.log('[rag-feeder] Gerando resumo com IA...');
      const { summary } = await summarizeRAGBlock({
        disciplina: src.disciplina,
        topicCode: src.topicCode,
        topicName: src.topicName,
        banca: src.banca ?? undefined,
        sourceUrl: src.sourceUrl,
        content: plainText
      });

      if (!summary) {
        console.warn('[rag-feeder] ⚠️  Summary vazio, pulando.');
        skipped++;
        continue;
      }

      // Inserir em rag_blocks
      await query(
        `
        INSERT INTO rag_blocks (
          disciplina,
          topic_code,
          banca,
          source_url,
          summary,
          embedding
        ) VALUES ($1, $2, $3, $4, $5, NULL)
        `,
        [
          src.disciplina,
          src.topicCode,
          src.banca ?? null,
          src.sourceUrl,
          summary
        ]
      );

      processed++;
      console.log('[rag-feeder] ✅ Bloco inserido em rag_blocks.');
    } catch (err) {
      failed++;
      console.error('[rag-feeder] ❌ Erro ao processar fonte:', err);
    }
  }

  console.log(`[rag-feeder] ✅ Job finalizado: ${processed} processados, ${skipped} pulados, ${failed} falhas`);
  await pool.end();
}

main().catch((err) => {
  console.error('[rag-feeder] ❌ Erro fatal:', err);
  process.exit(1);
});
