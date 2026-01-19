import crypto from 'crypto';
import { query } from '../db';
import { editalRepository } from '../repositories/editalRepository';
import { createDiscipline } from '../repositories/disciplineRepository';
import { createDrop, findDropForTopic } from '../repositories/dropRepository';
import { generateJSON, generateDrop } from './ai/openaiService';
import { generateAutoFormacao } from './autoFormacaoService';
import { generateQuestionsForEdital } from './questionGenerationService';
import { collectStudySources, StudySource } from './studySourcesService';
import { UserSourcesService } from './userSourcesService';
import { buildTopicCode, buildTopicCodeKey } from '../utils/topicCode';

type StudyOutline = {
  disciplinas: Array<{
    nome: string;
    topicos: Array<{
      nome: string;
      subtopicos: string[];
    }>;
  }>;
};

type StudyPackResult = {
  edital_id: string;
  user_id: string;
  topics_total: number;
  drops_created: number;
  questions_generated: number;
};

const normalizeText = (value: string) => value.trim();
const normalizeOptional = (value?: string | null) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const MAX_DROPS_TOTAL = toPositiveInt(process.env.STUDY_DROPS_MAX_TOTAL, 8);
const MAX_QUESTIONS_TOTAL = toPositiveInt(process.env.STUDY_QUESTIONS_MAX_TOTAL, 30);

const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'igshid',
];

const isSignedUrl = (value: string) => {
  const lower = value.toLowerCase();
  return (
    lower.includes('x-amz-signature=') ||
    lower.includes('x-amz-credential=') ||
    lower.includes('x-amz-algorithm=') ||
    lower.includes('awsaccesskeyid=')
  );
};

const isValidHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && !isSignedUrl(url.toString());
  } catch {
    return false;
  }
};

const sanitizeUrl = (value: string): string | null => {
  try {
    const url = new URL(value);
    TRACKING_PARAMS.forEach((param) => url.searchParams.delete(param));
    return url.toString();
  } catch {
    return null;
  }
};

const normalizeSourceUrl = (value?: string | null): string | null => {
  const trimmed = normalizeOptional(value);
  if (!trimmed) return null;
  const sanitized = sanitizeUrl(trimmed);
  if (!sanitized || !isValidHttpUrl(sanitized)) return null;
  return sanitized;
};

const normalizeStudySource = (source: StudySource): StudySource | null => {
  const url = normalizeSourceUrl(source.url);
  if (!url) return null;
  let title = normalizeOptional(source.title);
  if (!title) {
    try {
      title = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      title = 'Fonte';
    }
  }
  return {
    ...source,
    url,
    title,
  };
};

async function ensureDisciplineId(name: string): Promise<string> {
  const { rows } = await query<{ id: string }>(
    'SELECT id FROM disciplines WHERE LOWER(name) = LOWER($1) LIMIT 1',
    [name]
  );
  if (rows[0]?.id) return rows[0].id;
  const created = await createDiscipline({ name });
  return created.id;
}

async function generateStudyOutline(topic: string, level?: string): Promise<StudyOutline> {
  const systemPrompt = `You are a curriculum planner.
Return a clean outline for study. Use short names and avoid fluff.
Output JSON only.`;

  const prompt = `Topic: ${topic}
Level: ${level || 'auto'}

Return JSON:
{
  "disciplinas": [
    {
      "nome": "Nome da disciplina",
      "topicos": [
        {
          "nome": "Topico",
          "subtopicos": ["Subtopico 1", "Subtopico 2"]
        }
      ]
    }
  ]
}`;

  const result = await generateJSON({ prompt, systemPrompt, temperature: 0.2 });
  const disciplinas = Array.isArray(result?.disciplinas) ? result.disciplinas : [];
  const normalized = disciplinas.map((disc: any) => ({
    nome: normalizeText(String(disc?.nome || 'Fundamentos')),
    topicos: Array.isArray(disc?.topicos)
      ? disc.topicos.map((topico: any) => ({
          nome: normalizeText(String(topico?.nome || 'Basico')),
          subtopicos: Array.isArray(topico?.subtopicos)
            ? topico.subtopicos.map((item: any) => normalizeText(String(item)))
            : [],
        }))
      : [],
  }));

  if (normalized.length === 0) {
    return {
      disciplinas: [
        {
          nome: 'Fundamentos',
          topicos: [{ nome: topic, subtopicos: [] }],
        },
      ],
    };
  }

  return { disciplinas: normalized };
}

function mapOutlineToEdital(outline: StudyOutline) {
  const disciplinas = outline.disciplinas.map((disc) => ({
    nome: disc.nome,
    topicos: disc.topicos,
  }));

  const conteudoProgramatico: Record<string, any> = {};
  outline.disciplinas.forEach((disc) => {
    conteudoProgramatico[disc.nome] = {
      topicos: disc.topicos,
    };
  });

  return { disciplinas, conteudoProgramatico };
}

async function findCustomEditalForUser(userId: string, topicTag: string) {
  const { rows } = await query(
    `
      SELECT e.*
      FROM editais e
      JOIN edital_usuarios eu ON eu.edital_id = e.id
      WHERE eu.user_id = $1
        AND e.tags @> $2::jsonb
        AND e.tags @> $3::jsonb
      LIMIT 1
    `,
    [userId, JSON.stringify(['custom']), JSON.stringify([topicTag])]
  );
  return rows[0] || null;
}

function buildDropContent(payload: { content: string; examples?: string[]; tips?: string[] }) {
  const examples = (payload.examples || []).filter(Boolean);
  const tips = (payload.tips || []).filter(Boolean);
  const parts = [payload.content.trim()];

  if (examples.length) {
    parts.push(`\nExemplos:\n- ${examples.join('\n- ')}`);
  }

  if (tips.length) {
    parts.push(`\nDicas:\n- ${tips.join('\n- ')}`);
  }

  return parts.join('\n');
}

type DropPayload = {
  title: string;
  text: string;
  examples: string[];
  hints: string[];
  references: string[];
};

const normalizeList = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeText(String(item))).filter(Boolean);
};

const uniqueList = (items: string[]) => Array.from(new Set(items));

function normalizeDropPayload(
  raw: any,
  fallbackTitle: string,
  fallbackReferences: string[]
): DropPayload {
  const title = normalizeText(String(raw?.title || fallbackTitle || 'Drop'));
  const text = normalizeText(String(raw?.text || raw?.content || ''));
  const examples = normalizeList(raw?.examples);
  const hints = normalizeList(raw?.hints ?? raw?.tips);
  const references = uniqueList(normalizeList(raw?.references).concat(fallbackReferences));
  return {
    title,
    text,
    examples,
    hints,
    references,
  };
}

function buildDropTextPayload(payload: DropPayload) {
  return JSON.stringify({
    text: payload.text,
    examples: payload.examples,
    hints: payload.hints,
    references: payload.references,
  });
}

function buildReferenceList(sources: StudySource[]) {
  return uniqueList(
    sources.map((source) => {
      const title = normalizeText(source.title || '');
      if (title) return `${title} - ${source.url}`;
      return source.url;
    })
  );
}

async function generateDropFromSources(params: {
  topico: string;
  subtopico: string;
  dificuldade: number;
  sources: StudySource[];
  banca?: string;
}): Promise<DropPayload> {
  const references = buildReferenceList(params.sources);
  const lengthGuide =
    params.dificuldade >= 4 ? '900-1200' : params.dificuldade >= 3 ? '800-1100' : '650-950';
  const systemPrompt = [
    'You are an educational assistant.',
    'Use only the provided sources.',
    'Do not invent facts.',
  ].join(' ');

  const sourcesBlock = params.sources
    .map((source, index) =>
      [
        `SOURCE ${index + 1}`,
        `Title: ${source.title}`,
        `URL: ${source.url}`,
        `Excerpt: ${source.excerpt}`,
      ].join('\n')
    )
    .join('\n\n');

  const prompt = [
    `Topic: ${params.topico}`,
    `Subtopic: ${params.subtopico}`,
    `Difficulty: ${params.dificuldade}/5`,
    params.banca ? `Exam board: ${params.banca}` : 'Exam board: general',
    '',
    'Sources:',
    sourcesBlock,
    '',
    'Return JSON:',
    '{',
    '  "title": "Short title",',
    `  "text": "Study text (${lengthGuide} words) with definitions, nuances, exceptions, and exam pitfalls. Use paragraphs and end with a short bullet list of key points.",`,
    '  "examples": ["Example 1", "Example 2"],',
    '  "hints": ["Hint 1", "Hint 2"],',
    '  "references": ["https://..."]',
    '}',
    '',
    'Rules:',
    '- Use only the sources above.',
    '- Paraphrase. No direct quotes.',
    '- references must be the URLs from the sources.',
    '- Include common traps and how the banca tends to charge this subtopic.',
  ].join('\n');

  const result = await generateJSON({ prompt, systemPrompt, temperature: 0.3 });
  const normalized = normalizeDropPayload(result, params.subtopico, references);
  if (!normalized.text) {
    throw new Error('drop_sources_empty');
  }
  return { ...normalized, references };
}

async function buildDropPayload(params: {
  topico: string;
  subtopico: string;
  dificuldade: number;
  sources: StudySource[];
  banca?: string;
}): Promise<DropPayload> {
  const references = buildReferenceList(params.sources);
  if (!params.sources.length) {
    throw new Error('drop_sources_empty');
  }

  return await generateDropFromSources(params);
}

export async function getOrCreateCustomEdital(params: {
  userId: string;
  topic: string;
}): Promise<{ editalId: string; topicTag: string }> {
  const topicTag = `topic:${slugify(params.topic) || crypto.randomUUID().slice(0, 8)}`;

  const existing = await findCustomEditalForUser(params.userId, topicTag);
  if (existing?.id) {
    return { editalId: existing.id, topicTag };
  }

  const codigo = `custom-${crypto.randomUUID().slice(0, 8)}`;
  const edital = await editalRepository.create(
    {
      codigo,
      titulo: `Estudo: ${params.topic}`,
      orgao: 'Estudo livre',
      status: 'publicado',
      tags: ['custom', 'tema_livre', topicTag],
      observacoes: `topic=${params.topic}`,
    },
    params.userId
  );

  await editalRepository.addUsuario(edital.id, params.userId);
  return { editalId: edital.id, topicTag };
}

export async function buildStudyPack(params: {
  editalId: string;
  userId: string;
  topic: string;
  level?: string;
  sourceIds?: string[];
  onProgress?: (progress: number, step: string, meta?: Record<string, any>) => Promise<void> | void;
}): Promise<StudyPackResult> {
  const report = async (progress: number, step: string, meta?: Record<string, any>) => {
    if (!params.onProgress) return;
    await params.onProgress(progress, step, meta);
  };

  const edital = await editalRepository.findById(params.editalId);
  const rawEditalSourceUrl =
    normalizeOptional(edital?.link_edital_completo) ||
    (Array.isArray(edital?.arquivos)
      ? normalizeOptional(edital?.arquivos?.[0]?.url || edital?.arquivos?.[0]?.origem_url)
      : null);
  const editalSourceUrl = normalizeSourceUrl(rawEditalSourceUrl);
  const editalSources = editalSourceUrl
    ? [
        {
          url: editalSourceUrl,
          title: 'Edital',
        },
      ]
    : [];

  await report(5, 'outline:start', {
    topic: params.topic,
    level: params.level ?? 'auto',
  });
  const outline = await generateStudyOutline(params.topic, params.level);
  await report(15, 'outline:done', {
    disciplinas: outline.disciplinas.length,
  });
  const mapped = mapOutlineToEdital(outline);

  await editalRepository.update(
    {
      id: params.editalId,
      disciplinas: mapped.disciplinas as any,
      conteudo_programatico: mapped.conteudoProgramatico,
      status: 'publicado',
    },
    params.userId
  );
  await report(25, 'edital:updated', {
    disciplinas: mapped.disciplinas.length,
  });

  await generateAutoFormacao({ editalId: params.editalId, userId: params.userId, force: true });
  await report(35, 'auto_formacao:done');

  const userStudySources = await UserSourcesService.listStudySources({
    userId: params.userId,
    editalId: params.sourceIds && params.sourceIds.length ? null : params.editalId,
    sourceIds: params.sourceIds,
  });

  const topicItems: Array<{ disciplina: string; topico: string; subtopico: string }> = [];
  outline.disciplinas.forEach((disc) => {
    disc.topicos.forEach((topico) => {
      if (Array.isArray(topico.subtopicos) && topico.subtopicos.length) {
        topico.subtopicos.forEach((sub) => {
          topicItems.push({ disciplina: disc.nome, topico: topico.nome, subtopico: sub });
        });
      } else {
        topicItems.push({ disciplina: disc.nome, topico: topico.nome, subtopico: topico.nome });
      }
    });
  });

  const limitedTopics = topicItems.slice(0, MAX_DROPS_TOTAL);
  let dropsCreated = 0;
  let missingSources = 0;
  let failedTopics = 0;
  const sourceCache = new Map<string, StudySource[]>();

  for (let index = 0; index < limitedTopics.length; index += 1) {
    const item = limitedTopics[index];
    const disciplineId = await ensureDisciplineId(item.disciplina);
    const topicCode = buildTopicCode(item.disciplina, item.subtopico);
    const existing = await findDropForTopic({
      topicCode,
      disciplineId,
      originUserId: params.userId,
    });
    if (!existing) {
      try {
        const sourceKey = buildTopicCodeKey(item.disciplina, item.subtopico);
        let sources = sourceCache.get(sourceKey);
        if (!sources) {
          const queryTopic = `${item.subtopico} ${item.disciplina}`.trim();
          try {
            sources = await collectStudySources(queryTopic);
          } catch (err) {
            console.warn('[study-pack] source collection failed', err);
            sources = [];
          }
          sourceCache.set(sourceKey, sources);
        }

        const combinedSources = Array.from(
          new Map(
            [...userStudySources, ...(sources || [])]
              .map(normalizeStudySource)
              .filter((item): item is StudySource => Boolean(item))
              .map((source) => [source.url, source])
          ).values()
        );

        const dropPayload = await buildDropPayload({
          topico: item.topico,
          subtopico: item.subtopico,
          dificuldade: 2,
          sources: combinedSources,
          banca: edital?.banca ?? undefined,
        });
        const dropText = buildDropTextPayload(dropPayload);

        const dropSources = combinedSources
          .map((source) => ({
            url: normalizeSourceUrl(source.url),
            title: normalizeOptional(source.title) || source.title,
          }))
          .filter((source) => source.url) as Array<{ url: string; title?: string }>;
        const mergedSources = Array.from(
          new Map(
            [...dropSources, ...editalSources]
              .map((source) => {
                const url = normalizeSourceUrl(source.url);
                if (!url) return null;
                return [url, { ...source, url }] as [string, { url: string; title?: string }];
              })
              .filter(Boolean) as Array<[string, { url: string; title?: string }]>
          ).values()
        );
        const primarySourceUrl =
          normalizeSourceUrl(editalSourceUrl) ||
          normalizeSourceUrl(dropSources[0]?.url) ||
          null;
        const imageUrl =
          normalizeOptional(combinedSources.find((source) => source.image_url)?.image_url) ||
          null;

        await createDrop({
          discipline_id: disciplineId,
          title: dropPayload.title,
          content: buildDropContent({
            content: dropPayload.text,
            examples: dropPayload.examples,
            tips: dropPayload.hints,
          }),
          difficulty: 2,
          topic_code: topicCode,
          drop_type: 'study_request',
          status: 'published',
          origin: 'study_request',
          origin_user_id: params.userId,
          origin_meta: {
            edital_id: params.editalId,
            disciplina: item.disciplina,
            topic: item.topico,
            topic_name: item.topico,
            subtopic: item.subtopico,
            subtopico: item.subtopico,
            source_url: primarySourceUrl,
            edital_url: editalSourceUrl,
            image_url: imageUrl,
            sources: mergedSources,
            sources_missing: mergedSources.length === 0,
          },
          drop_text: dropText,
        });

        dropsCreated += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'drop_error';
        if (message === 'drop_sources_empty') {
          missingSources += 1;
        } else {
          failedTopics += 1;
        }
        console.warn('[study-pack] drop skipped', {
          disciplina: item.disciplina,
          subtopico: item.subtopico,
          reason: message,
        });
      }
    }

    const dropProgress = limitedTopics.length
      ? 40 + Math.round(((index + 1) / limitedTopics.length) * 30)
      : 40;
    await report(dropProgress, 'drops:processing', {
      processed: index + 1,
      total: limitedTopics.length,
      created: dropsCreated,
      missing_sources: missingSources,
      failed_topics: failedTopics,
    });
  }

  await report(70, 'drops:done', {
    created: dropsCreated,
    total: limitedTopics.length,
    missing_sources: missingSources,
    failed_topics: failedTopics,
  });

  if (dropsCreated === 0) {
    throw new Error('Nenhuma fonte valida encontrada para gerar conteudo.');
  }

  await report(75, 'questions:starting');
  const questionsResult = await generateQuestionsForEdital({
    editalId: params.editalId,
    userId: params.userId,
    maxTotalQuestions: MAX_QUESTIONS_TOTAL,
    status: 'active',
  });
  await report(95, 'questions:done', {
    questions_generated: questionsResult.questions_generated || 0,
  });

  const result = {
    edital_id: params.editalId,
    user_id: params.userId,
    topics_total: topicItems.length,
    drops_created: dropsCreated,
    questions_generated: questionsResult.questions_generated || 0,
    missing_sources: missingSources,
    failed_topics: failedTopics,
  };

  await report(100, 'completed', result);
  return result;
}
