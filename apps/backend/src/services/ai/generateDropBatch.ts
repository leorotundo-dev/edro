import { OpenAIService } from './openaiService';

type Level = 'N1' | 'N2' | 'N3' | 'N4' | 'N5';

export interface DropBatchInput {
  disciplina: string;
  topicCode: string;
  topicName: string;
  banca?: string;
  nivel?: string;
  ragContext?: string;
}

export interface GeneratedDrop {
  tipo: string;
  nivel: Level;
  dificuldade: number;
  title: string;
  conteudo: string;
  question?: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  tags?: string[];
  duration_minutes?: number;
  topicCode?: string;
  topicName?: string;
  disciplina?: string;
  banca?: string;
}

export interface DropBatchResult {
  drops: GeneratedDrop[];
  meta: {
    source: 'ai' | 'fallback';
    levels: Level[];
    variants: string[];
    generated_at: string;
  };
}

const LEVELS: Level[] = ['N1', 'N2', 'N3', 'N4', 'N5'];

const VARIANTS = [
  { id: 'basico', tipo: 'fundamento', includeQuestion: false },
  { id: 'avancado', tipo: 'aprofundamento', includeQuestion: false },
  { id: 'turbo', tipo: 'mini-questao', includeQuestion: true },
];

function normalizeLevel(nivel?: string): Level | null {
  if (!nivel) return null;
  const upper = nivel.toUpperCase();
  if (LEVELS.includes(upper as Level)) return upper as Level;
  return null;
}

function levelToDifficulty(level: Level): number {
  switch (level) {
    case 'N1':
      return 1;
    case 'N2':
      return 2;
    case 'N3':
      return 3;
    case 'N4':
      return 4;
    case 'N5':
      return 5;
    default:
      return 3;
  }
}

function clampDifficulty(value: any, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(5, Math.max(1, Math.round(parsed)));
}

function normalizeTipo(raw: any, fallback: string): string {
  const value = String(raw || '').toLowerCase().trim();
  const map: Record<string, string> = {
    basico: 'fundamento',
    fundamento: 'fundamento',
    avancado: 'aprofundamento',
    aprofundado: 'aprofundamento',
    aprofundamento: 'aprofundamento',
    turbo: 'mini-questao',
    'mini-questao': 'mini-questao',
    'mini_question': 'mini-questao',
  };
  return map[value] || fallback;
}

function truncateText(text: string, maxLen: number) {
  if (!text) return text;
  return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
}

function buildSystemPrompt() {
  return [
    'You are an expert tutor for exam prep.',
    'Return JSON only, no markdown.',
    'Keep content concise and focused on the topic.',
  ].join(' ');
}

function buildUserPrompt(input: DropBatchInput, levels: Level[]) {
  const ragContext = input.ragContext ? truncateText(input.ragContext, 1200) : '';
  const contextBlock = ragContext ? `
Context:
${ragContext}
` : '';

  return [
    'Generate study drops for the topic below.',
    `Discipline: ${input.disciplina}`,
    `Topic: ${input.topicName} (${input.topicCode})`,
    `Exam board: ${input.banca || 'general'}`,
    `Levels: ${levels.join(', ')}`,
    'Variants: basico, avancado, turbo.',
    contextBlock,
    'Return JSON in this format:',
    '{',
    '  "drops": [',
    '    {',
    '      "tipo": "fundamento|aprofundamento|mini-questao",',
    '      "nivel": "N1|N2|N3|N4|N5",',
    '      "dificuldade": 1,',
    '      "title": "short title",',
    '      "conteudo": "plain text summary",',
    '      "question": "only for mini-questao",',
    '      "options": ["A) ...", "B) ...", "C) ...", "D) ...", "E) ..."],',
    '      "correctAnswer": "a",',
    '      "explanation": "short explanation",',
    '      "tags": ["tag1", "tag2"]',
    '    }',
    '  ]',
    '}',
  ].join('\n');
}

function normalizeAiDrops(raw: any, input: DropBatchInput, levels: Level[]): GeneratedDrop[] {
  const rawDrops = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.drops)
      ? raw.drops
      : Array.isArray(raw?.items)
        ? raw.items
        : [];

  if (!Array.isArray(rawDrops) || rawDrops.length === 0) return [];

  return rawDrops.map((drop: any, index: number) => {
    const level = normalizeLevel(drop.nivel) || levels[index % levels.length];
    const fallbackDifficulty = levelToDifficulty(level);
    const tipo = normalizeTipo(drop.tipo, VARIANTS[index % VARIANTS.length].tipo);
    const title = String(drop.title || drop.titulo || drop.question || input.topicName || input.topicCode);
    const conteudo = String(drop.conteudo || drop.content || drop.text || '');
    const includeQuestion = tipo === 'mini-questao';
    const options = includeQuestion
      ? (Array.isArray(drop.options) ? drop.options.map(String) : undefined)
      : undefined;

    return {
      tipo,
      nivel: level,
      dificuldade: clampDifficulty(drop.dificuldade, fallbackDifficulty),
      title: title.trim(),
      conteudo: conteudo.trim(),
      question: includeQuestion ? String(drop.question || `Qual afirmacao esta correta sobre ${input.topicName}?`) : undefined,
      options: includeQuestion ? (options && options.length >= 4 ? options : undefined) : undefined,
      correctAnswer: includeQuestion ? String(drop.correctAnswer || 'a') : undefined,
      explanation: includeQuestion ? String(drop.explanation || `Resposta correta: ${input.topicName}.`) : undefined,
      tags: Array.isArray(drop.tags) ? drop.tags.map(String) : undefined,
      duration_minutes: drop.duration_minutes ? Number(drop.duration_minutes) : undefined,
      topicCode: input.topicCode,
      topicName: input.topicName,
      disciplina: input.disciplina,
      banca: input.banca,
    };
  });
}

function buildFallbackDrops(input: DropBatchInput, levels: Level[]): GeneratedDrop[] {
  const drops: GeneratedDrop[] = [];
  const baseTags = [input.disciplina, input.topicCode, input.banca].filter(Boolean) as string[];

  levels.forEach((level) => {
    VARIANTS.forEach((variant) => {
      const title = `${input.topicName} - ${variant.id} ${level}`;
      const difficulty = levelToDifficulty(level);
      const conteudo = [
        `Resumo ${variant.id} de ${input.topicName}.`,
        'Foque nos conceitos essenciais e exemplos praticos.',
        'Use este drop como guia rapido antes de revisar.',
      ].join(' ');

      const drop: GeneratedDrop = {
        tipo: variant.tipo,
        nivel: level,
        dificuldade: difficulty,
        title,
        conteudo,
        tags: [...baseTags, level, variant.id],
        topicCode: input.topicCode,
        topicName: input.topicName,
        disciplina: input.disciplina,
        banca: input.banca,
      };

      if (variant.includeQuestion) {
        drop.question = `Qual afirmacao esta correta sobre ${input.topicName}?`;
        drop.options = [
          `A) ${input.topicName} e um conceito central do tema.`,
          `B) ${input.topicName} nao aparece em concursos.`,
          `C) ${input.topicName} nao tem aplicacao pratica.`,
          `D) ${input.topicName} sempre e incorreto.`,
          `E) ${input.topicName} nao possui regras.`,
        ];
        drop.correctAnswer = 'a';
        drop.explanation = `A alternativa A resume o ponto central sobre ${input.topicName}.`;
      }

      drops.push(drop);
    });
  });

  return drops;
}

export async function generateDropBatchForTopic(input: DropBatchInput): Promise<DropBatchResult> {
  const normalizedLevel = normalizeLevel(input.nivel);
  const levels = normalizedLevel ? [normalizedLevel] : LEVELS;

  try {
    const systemPrompt = buildSystemPrompt();
    const prompt = buildUserPrompt(input, levels);

    const aiResult = await OpenAIService.generateJSON({
      prompt,
      systemPrompt,
      temperature: 0.5,
    });

    const normalizedDrops = normalizeAiDrops(aiResult, input, levels);
    const drops = normalizedDrops.length > 0 ? normalizedDrops : buildFallbackDrops(input, levels);

    return {
      drops,
      meta: {
        source: normalizedDrops.length > 0 ? 'ai' : 'fallback',
        levels,
        variants: VARIANTS.map((v) => v.id),
        generated_at: new Date().toISOString(),
      },
    };
  } catch (err) {
    const drops = buildFallbackDrops(input, levels);
    return {
      drops,
      meta: {
        source: 'fallback',
        levels,
        variants: VARIANTS.map((v) => v.id),
        generated_at: new Date().toISOString(),
      },
    };
  }
}
