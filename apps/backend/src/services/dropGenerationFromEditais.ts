import { query } from '../db';
import { generateDropBatchForTopic } from './ai/generateDropBatch';
import { createDrop } from '../repositories/dropRepository';
import { makeHash } from '../utils/hash';

interface EditalRow {
  id: string;
  titulo: string;
  banca?: string | null;
  disciplinas?: any;
  conteudo_programatico?: any;
}

type TopicEntry = {
  disciplineName: string;
  topicName: string;
  topicCode: string;
  ragContext?: string;
};

type GenerateDropsResult = {
  editaisProcessed: number;
  topicsProcessed: number;
  dropsGenerated: number;
  failedTopics: number;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const disciplineCache = new Map<string, string>();

function normalizeText(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === 'number') return String(value);
  return null;
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

function buildTopicCode(disciplineName: string, topicName: string): string {
  const raw = `${disciplineName}-${topicName}`;
  const slug = slugify(raw);
  return slug || slugify(`${disciplineName}-topico`);
}

function normalizeTopicEntry(raw: any): { name: string; subtopics: string[] } | null {
  const name =
    normalizeText(raw?.nome) ||
    normalizeText(raw?.name) ||
    normalizeText(raw?.title) ||
    normalizeText(raw);
  if (!name || name.length < 3) return null;

  const subtopicsRaw = raw?.subtopicos || raw?.subtopics || raw?.topicos || raw?.topics;
  const subtopics = Array.isArray(subtopicsRaw)
    ? subtopicsRaw
        .map((entry) =>
          normalizeText(entry?.nome) || normalizeText(entry?.name) || normalizeText(entry)
        )
        .filter(Boolean)
    : [];

  return { name, subtopics: subtopics as string[] };
}

function extractTopicEntries(raw: any): Array<{ name: string; subtopics: string[] }> {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map(normalizeTopicEntry).filter(Boolean) as Array<{ name: string; subtopics: string[] }>;
  }
  if (typeof raw === 'object') {
    if (Array.isArray(raw.topicos) || Array.isArray(raw.topics)) {
      return extractTopicEntries(raw.topicos || raw.topics);
    }
    const single = normalizeTopicEntry(raw);
    if (single) return [single];
  }
  return [];
}

function collectTopicsFromProgramatic(conteudo: any): Array<{ discipline: string; topics: Array<{ name: string; subtopics: string[] }> }> {
  if (!conteudo || typeof conteudo !== 'object') return [];
  const entries = Object.entries(conteudo);
  if (!entries.length) return [];

  return entries
    .map(([disciplina, topics]) => {
      const name = normalizeText(disciplina);
      if (!name) return null;
      const extracted = extractTopicEntries(topics);
      if (!extracted.length) return null;
      return { discipline: name, topics: extracted };
    })
    .filter(Boolean) as Array<{ discipline: string; topics: Array<{ name: string; subtopics: string[] }> }>;
}

function collectTopicsFromDisciplinas(disciplinas: any): Array<{ discipline: string; topics: Array<{ name: string; subtopics: string[] }> }> {
  if (!Array.isArray(disciplinas)) return [];
  return disciplinas
    .map((disc) => {
      const name = normalizeText(disc?.nome) || normalizeText(disc?.name);
      if (!name) return null;
      const topicos = disc?.topicos || disc?.topics || [];
      const extracted = extractTopicEntries(topicos);
      if (!extracted.length) return null;
      return { discipline: name, topics: extracted };
    })
    .filter(Boolean) as Array<{ discipline: string; topics: Array<{ name: string; subtopics: string[] }> }>;
}

function collectEditalTopics(edital: EditalRow, maxTopics: number): TopicEntry[] {
  const byProgram = collectTopicsFromProgramatic(edital.conteudo_programatico);
  const byDisc = byProgram.length ? [] : collectTopicsFromDisciplinas(edital.disciplinas);
  const sources = byProgram.length ? byProgram : byDisc;
  const output: TopicEntry[] = [];
  const seen = new Set<string>();

  for (const source of sources) {
    for (const topic of source.topics) {
      if (output.length >= maxTopics) break;
      const topicName = topic.name.trim();
      const topicCode = buildTopicCode(source.discipline, topicName);
      if (seen.has(topicCode)) continue;
      seen.add(topicCode);

      const ragContext = topic.subtopics.length
        ? `Subtopicos: ${topic.subtopics.slice(0, 12).join(', ')}`
        : undefined;

      output.push({
        disciplineName: source.discipline,
        topicName,
        topicCode,
        ragContext,
      });
    }
    if (output.length >= maxTopics) break;
  }

  return output;
}

async function resolveDisciplineId(name?: string): Promise<string | null> {
  if (!name) return null;
  if (UUID_REGEX.test(name)) return name;

  const normalized = name.trim();
  if (!normalized) return null;

  const cached = disciplineCache.get(normalized.toLowerCase());
  if (cached) return cached;

  const { rows } = await query<{ id: string }>(
    'SELECT id FROM disciplines WHERE LOWER(name) = LOWER($1) LIMIT 1',
    [normalized]
  );

  let id = rows[0]?.id ?? null;

  if (!id) {
    try {
      const insert = await query<{ id: string }>(
        'INSERT INTO disciplines (name) VALUES ($1) RETURNING id',
        [normalized]
      );
      id = insert.rows[0]?.id ?? null;
    } catch {
      const retry = await query<{ id: string }>(
        'SELECT id FROM disciplines WHERE LOWER(name) = LOWER($1) LIMIT 1',
        [normalized]
      );
      id = retry.rows[0]?.id ?? null;
    }
  }

  if (id) {
    disciplineCache.set(normalized.toLowerCase(), id);
  }

  return id;
}

export async function generateDropsFromEditais(options?: {
  limitEditais?: number;
  maxTopicsPerEdital?: number;
  maxTotalTopics?: number;
}): Promise<GenerateDropsResult> {
  const limitEditais = options?.limitEditais ?? 5;
  const maxTopicsPerEdital = options?.maxTopicsPerEdital ?? 25;
  const maxTotalTopics = options?.maxTotalTopics ?? 120;

  const { rows: editais } = await query<EditalRow>(
    `
    SELECT id, titulo, banca, disciplinas, conteudo_programatico
    FROM editais
    WHERE (
      jsonb_array_length(COALESCE(disciplinas, '[]'::jsonb)) > 0
      OR jsonb_object_length(COALESCE(conteudo_programatico, '{}'::jsonb)) > 0
    )
    ORDER BY updated_at DESC
    LIMIT $1
    `,
    [limitEditais]
  );

  if (editais.length === 0) {
    return { editaisProcessed: 0, topicsProcessed: 0, dropsGenerated: 0, failedTopics: 0 };
  }

  let topicsProcessed = 0;
  let dropsGenerated = 0;
  let failedTopics = 0;

  for (const edital of editais) {
    const topics = collectEditalTopics(edital, maxTopicsPerEdital);
    if (!topics.length) continue;

    for (const topic of topics) {
      if (topicsProcessed >= maxTotalTopics) break;

      const disciplineId = await resolveDisciplineId(topic.disciplineName);
      if (!disciplineId) {
        failedTopics++;
        continue;
      }

      const cacheKey = makeHash(`edital:${edital.id}|topic:${topic.topicCode}`);
      const { rows: cacheRows } = await query<{ id: number }>(
        'SELECT id FROM drop_cache WHERE hash = $1 LIMIT 1',
        [cacheKey]
      );

      if (cacheRows.length > 0) {
        continue;
      }

      try {
        const result = await generateDropBatchForTopic({
          disciplina: topic.disciplineName,
          topicCode: topic.topicCode,
          topicName: topic.topicName,
          banca: edital.banca ?? undefined,
          ragContext: topic.ragContext,
        });

        await query(
          `
          INSERT INTO drop_cache (blueprint_id, hash, topic_code, payload)
          VALUES ($1, $2, $3, $4)
          `,
          [null, cacheKey, topic.topicCode, JSON.stringify(result)]
        );

        for (const drop of result.drops ?? []) {
          const payload = {
            ...drop,
            banca: edital.banca ?? drop.banca,
            edital_id: edital.id,
            edital_titulo: edital.titulo,
            disciplina: topic.disciplineName,
            topic_code: topic.topicCode,
            topic_name: topic.topicName,
          };

          await createDrop({
            discipline_id: disciplineId,
            title: drop.title || drop.question || topic.topicName,
            content: JSON.stringify(payload),
            difficulty: drop.dificuldade ?? 1,
            topic_code: topic.topicCode,
            drop_type: drop.tipo ?? 'fundamento',
            drop_text: drop.conteudo ?? '',
            origin: 'edital',
            origin_meta: {
              edital_id: edital.id,
              banca: edital.banca ?? null,
              disciplina: topic.disciplineName,
              topic_name: topic.topicName,
            },
          });
          dropsGenerated++;
        }

        topicsProcessed++;
      } catch {
        failedTopics++;
      }
    }

    if (topicsProcessed >= maxTotalTopics) break;
  }

  return {
    editaisProcessed: editais.length,
    topicsProcessed,
    dropsGenerated,
    failedTopics,
  };
}
