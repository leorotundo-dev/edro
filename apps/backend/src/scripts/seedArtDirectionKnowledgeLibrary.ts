import { pool } from '../db';
import { CORE_ART_DIRECTION_CONCEPTS } from '../services/ai/artDirectionCoreConcepts';
import {
  EDRO_DA_CANON_SEED,
  KNOWLEDGE_LIBRARY_SOURCE,
} from '../services/ai/artDirectionKnowledgeLibrarySeed';

type CanonRow = {
  id: string;
  slug: string;
  title: string;
};

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function estimateTokens(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words * 1.35));
}

function buildDraftDefinition(title: string) {
  return `Entrada inicial do canon da Edro para curadoria sobre ${title}. Expandir com definição, heurísticas, exemplos e contexto histórico antes de ativar no motor.`;
}

function buildDraftSummary(title: string, canonTitle: string) {
  return `${title} faz parte do canon ${canonTitle} e está aguardando expansão editorial.`;
}

function buildDraftChunks(title: string, canonTitle: string) {
  return [
    {
      chunkType: 'definition',
      content: `Definição-base de ${title} dentro do canon ${canonTitle}. Expandir com contexto conceitual claro.`,
    },
    {
      chunkType: 'history',
      content: `Contexto histórico e cultural de ${title}. Registrar origens, movimentos relacionados e evolução do termo.`,
    },
    {
      chunkType: 'heuristic',
      content: `Heurísticas práticas de ${title}. Explicar como esse conceito orienta direção de arte, composição, tipografia ou repertório.`,
    },
    {
      chunkType: 'application',
      content: `Aplicações de ${title}. Documentar quando usar, quando evitar e em quais formatos ou mídias ele se manifesta.`,
    },
    {
      chunkType: 'critique',
      content: `Critério de revisão para ${title}. Registrar como o Jarvis e o bot DA devem avaliar o uso desse conceito em peças reais.`,
    },
    {
      chunkType: 'example',
      content: `Exemplos e repertório de ${title}. Adicionar casos, movimentos, referências e comparações úteis para treino.`,
    },
  ];
}

async function resolveCanonMap(client: any) {
  const result = await client.query(
    `SELECT id, slug, title
       FROM da_canons
      WHERE tenant_id IS NULL
        AND slug = ANY($1::text[])`,
    [EDRO_DA_CANON_SEED.map((canon) => canon.canonSlug)]
  );
  const rows = result.rows as CanonRow[];

  return new Map(rows.map((row) => [row.slug, row]));
}

async function upsertEntry(client: any, params: {
  canonId: string;
  slug: string;
  title: string;
  canonTitle: string;
  definition: string;
  summaryShort: string;
  summaryMedium: string;
  summaryLong: string;
  whenToUse: string[];
  whenToAvoid: string[];
  heuristics: string[];
  critiqueChecks: string[];
  examples: string[];
  relatedTags: string[];
  sourceConfidence: number;
  status: 'active' | 'draft';
  metadata: Record<string, any>;
}) {
  const result = await client.query(
    `INSERT INTO da_canon_entries (
       tenant_id,
       canon_id,
       slug,
       title,
       summary_short,
       summary_medium,
       summary_long,
       definition,
       when_to_use,
       when_to_avoid,
       heuristics,
       critique_checks,
       examples,
       related_tags,
       source_confidence,
       status,
       metadata
     ) VALUES (
       NULL,
       $1,
       $2,
       $3,
       $4,
       $5,
       $6,
       $7,
       $8::jsonb,
       $9::jsonb,
       $10::jsonb,
       $11::jsonb,
       $12::jsonb,
       $13::jsonb,
       $14,
       $15,
       $16::jsonb
     )
     ON CONFLICT (canon_id, slug)
     DO UPDATE SET
       title = EXCLUDED.title,
       summary_short = EXCLUDED.summary_short,
       summary_medium = EXCLUDED.summary_medium,
       summary_long = EXCLUDED.summary_long,
       definition = EXCLUDED.definition,
       when_to_use = EXCLUDED.when_to_use,
       when_to_avoid = EXCLUDED.when_to_avoid,
       heuristics = EXCLUDED.heuristics,
       critique_checks = EXCLUDED.critique_checks,
       examples = EXCLUDED.examples,
       related_tags = EXCLUDED.related_tags,
       source_confidence = EXCLUDED.source_confidence,
       status = EXCLUDED.status,
       metadata = EXCLUDED.metadata,
       updated_at = now()
     RETURNING id`,
    [
      params.canonId,
      params.slug,
      params.title,
      params.summaryShort,
      params.summaryMedium,
      params.summaryLong,
      params.definition,
      JSON.stringify(params.whenToUse),
      JSON.stringify(params.whenToAvoid),
      JSON.stringify(params.heuristics),
      JSON.stringify(params.critiqueChecks),
      JSON.stringify(params.examples),
      JSON.stringify(params.relatedTags),
      params.sourceConfidence,
      params.status,
      JSON.stringify(params.metadata),
    ]
  );
  const rows = result.rows as Array<{ id: string }>;

  return rows[0]?.id as string;
}

async function upsertSource(client: any, entryId: string) {
  await client.query(
    `DELETE FROM da_canon_sources
      WHERE entry_id = $1
        AND source_type = $2
        AND title = $3`,
    [entryId, KNOWLEDGE_LIBRARY_SOURCE.sourceType, KNOWLEDGE_LIBRARY_SOURCE.title]
  );

  await client.query(
    `INSERT INTO da_canon_sources (
       tenant_id,
       entry_id,
       source_type,
       title,
       author,
       url,
       notes,
       trust_score,
       metadata
     ) VALUES (
       NULL,
       $1,
       $2,
       $3,
       $4,
       NULL,
       $5,
       $6,
       '{}'::jsonb
     )`,
    [
      entryId,
      KNOWLEDGE_LIBRARY_SOURCE.sourceType,
      KNOWLEDGE_LIBRARY_SOURCE.title,
      KNOWLEDGE_LIBRARY_SOURCE.author,
      KNOWLEDGE_LIBRARY_SOURCE.notes,
      KNOWLEDGE_LIBRARY_SOURCE.trustScore,
    ]
  );
}

async function replaceChunks(client: any, entryId: string, chunks: Array<{ chunkType: string; content: string }>) {
  await client.query(`DELETE FROM da_canon_chunks WHERE entry_id = $1`, [entryId]);

  let index = 0;
  for (const chunk of chunks) {
    if (!chunk.content.trim()) continue;
    index += 1;
    await client.query(
      `INSERT INTO da_canon_chunks (
         tenant_id,
         entry_id,
         chunk_index,
         chunk_type,
         content,
         token_estimate,
         metadata
       ) VALUES (
         NULL,
         $1,
         $2,
         $3,
         $4,
         $5,
         '{}'::jsonb
       )`,
      [entryId, index, chunk.chunkType, chunk.content, estimateTokens(chunk.content)]
    );
  }
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const canonMap = await resolveCanonMap(client) as Map<string, CanonRow>;
    const coreConceptMap = new Map(
      CORE_ART_DIRECTION_CONCEPTS.map((concept) => [concept.slug, concept])
    );

    let totalEntries = 0;
    let activeEntries = 0;
    let draftEntries = 0;

    for (const canonSeed of EDRO_DA_CANON_SEED) {
      const canon = canonMap.get(canonSeed.canonSlug);
      if (!canon) {
        throw new Error(`canon_not_found:${canonSeed.canonSlug}`);
      }

      for (const entryTitle of canonSeed.entries) {
        const slug = slugify(entryTitle);
        const core = coreConceptMap.get(slug);
        const isActive = Boolean(core);

        const definition = core?.definition ?? buildDraftDefinition(entryTitle);
        const heuristics = core?.heuristics ?? [];
        const whenToUse = core?.whenToUse ?? [];
        const whenToAvoid = core?.whenToAvoid ?? [];
        const critiqueChecks = core?.critiqueChecks ?? [];
        const examples = core?.examples ?? [];

        const entryId = await upsertEntry(client, {
          canonId: canon.id,
          slug,
          title: entryTitle,
          canonTitle: canon.title,
          definition,
          summaryShort: core?.definition ?? entryTitle,
          summaryMedium:
            core?.definition ?? buildDraftSummary(entryTitle, canon.title),
          summaryLong:
            core?.definition ??
            `${buildDraftSummary(entryTitle, canon.title)} Essa entrada foi criada para receber curadoria da Edro e servir de base para treino do motor de Direção de Arte.`,
          whenToUse,
          whenToAvoid,
          heuristics,
          critiqueChecks,
          examples,
          relatedTags: [canon.slug],
          sourceConfidence: isActive ? 0.9 : 0.65,
          status: isActive ? 'active' : 'draft',
          metadata: {
            seeded_from: 'book_cover_taxonomy',
            canon_slug: canon.slug,
            needs_editorial_expansion: !isActive,
          },
        });

        await upsertSource(client, entryId);

        if (isActive && core) {
          const chunks = [
            {
              chunkType: 'definition',
              content: core.definition,
            },
            {
              chunkType: 'heuristic',
              content: core.heuristics.join('. '),
            },
            {
              chunkType: 'application',
              content: `Quando usar: ${core.whenToUse.join('; ')}. Quando evitar: ${core.whenToAvoid.join('; ')}.`,
            },
            {
              chunkType: 'critique',
              content: core.critiqueChecks.join('. '),
            },
            {
              chunkType: 'example',
              content: core.examples.join('. '),
            },
          ];
          await replaceChunks(client, entryId, chunks);
          activeEntries += 1;
        } else {
          await replaceChunks(client, entryId, buildDraftChunks(entryTitle, canon.title));
          draftEntries += 1;
        }

        totalEntries += 1;
      }
    }

    await client.query('COMMIT');
    console.log(
      `[seedArtDirectionKnowledgeLibrary] upserted ${totalEntries} entries (${activeEntries} active, ${draftEntries} draft)`
    );
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[seedArtDirectionKnowledgeLibrary] failed:', err);
  process.exit(1);
});
