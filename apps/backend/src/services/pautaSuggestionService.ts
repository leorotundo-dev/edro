import { query } from '../db';
import { getClientPreferenceContext, buildPreferencePromptBlock } from './preferenceEngine';
import { getClientPreferences } from './learningLoopService';
import { generateWithProvider } from './ai/copyOrchestrator';

export type PautaSource = {
  type: string;   // 'clipping' | 'calendar' | 'opportunity'
  id: string;
  title: string;
  summary: string;
  domain?: string;
  date?: string;
  score?: number;
};

type ClientRow = {
  id: string;
  name: string;
  segment_primary?: string | null;
  profile?: Record<string, any> | null;
};

type PautaSuggestionPayload = {
  topic_category: string | null;
  suggested_deadline: string | null;
  approach_a: Record<string, any>;
  approach_b: Record<string, any>;
  ai_score: number | null;
};

function safeParseJson(text: string): any {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
  } catch {}
  return null;
}

function fallbackApproaches(source: PautaSource, client: ClientRow) {
  return {
    topic_category: source.type === 'calendar' ? 'Sazonal' : 'Institucional',
    suggested_deadline: source.date || new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    approach_a: {
      title: `${source.title} · visão institucional`,
      angle: 'Protagonismo',
      message: `Enfoque institucional com dados, contexto e impacto no negócio.`,
      tone: 'Profissional',
      platforms: ['LinkedIn Post', 'Instagram Feed'],
      why: 'Abordagem segura e alinhada ao posicionamento da marca.',
    },
    approach_b: {
      title: `${source.title} · oportunidade criativa`,
      angle: 'Thought Leadership',
      message: `Enfoque criativo com CTA claro e apelo emocional.`,
      tone: 'Inspirador',
      platforms: ['Instagram Story', 'Instagram Feed'],
      why: 'Abordagem que engaja e gera shares orgânicos.',
    },
  };
}

function isValidSuggestionPayload(parsed: any): parsed is {
  topic_category?: string;
  suggested_deadline?: string;
  approach_a: Record<string, any>;
  approach_b: Record<string, any>;
} {
  return Boolean(parsed?.approach_a && parsed?.approach_b);
}

function buildPautaAnalysisPrompt(params: {
  client: ClientRow;
  source: PautaSource;
  preferenceBlock: string;
  directivesBlock: string;
}) {
  const { client, source, preferenceBlock, directivesBlock } = params;
  const profile = client.profile || {};
  return `Você é um estrategista de conteúdo. Com base na oportunidade abaixo, crie DUAS abordagens distintas de pauta para a empresa.

As abordagens devem ser diferentes em ângulo e execução — não variações do mesmo tema.

Retorne APENAS JSON válido:
{
  "topic_category": "categoria do tema (ex: Logística, Inovação, Institucional)",
  "suggested_deadline": "YYYY-MM-DD",
  "approach_a": {
    "angle": "nome do ângulo (ex: Protagonismo, Thought Leadership, Notícia)",
    "title": "título da pauta",
    "message": "mensagem principal em 1-2 frases",
    "tone": "tom sugerido",
    "platforms": ["plataforma1", "plataforma2"],
    "why": "por que este ângulo faz sentido"
  },
  "approach_b": {
    "angle": "nome do ângulo alternativo",
    "title": "título alternativo",
    "message": "mensagem alternativa",
    "tone": "tom alternativo",
    "platforms": ["plataforma1"],
    "why": "por que este ângulo alternativo faz sentido"
  }
}

EMPRESA: ${client.name}
SEGMENTO: ${client.segment_primary || 'não informado'}
PILARES: ${(profile.pillars || []).join(', ') || 'não informados'}

OPORTUNIDADE:
Fonte: ${source.domain || source.type}
Título: ${source.title}
Resumo: ${source.summary}
${source.date ? `Data do evento: ${source.date}` : ''}

${preferenceBlock ? `HISTÓRICO DE PREFERÊNCIAS:\n${preferenceBlock}` : ''}${directivesBlock}`;
}

function buildPautaExpansionPrompt(analysisOutput: string, client: ClientRow, source: PautaSource) {
  return `Você é um estrategista criativo. Expanda a análise abaixo em duas abordagens editoriais mais fortes, específicas e publicáveis.

REGRAS:
- manter somente 2 abordagens
- deixar os títulos mais concretos
- tornar a mensagem mais acionável
- sugerir plataformas coerentes com o tipo de pauta
- sem texto genérico

CLIENTE: ${client.name}
SEGMENTO: ${client.segment_primary || 'não informado'}
OPORTUNIDADE: ${source.title}
RESUMO: ${source.summary}

ANÁLISE BASE:
${analysisOutput}

Retorne APENAS JSON no mesmo formato da análise original.`;
}

function buildPautaRefinementPrompt(analysisOutput: string, expansionOutput: string) {
  return `Você é um editor-chefe. Escolha e refine as melhores duas abordagens abaixo em formato final pronto para pauta.

REGRAS:
- manter exatamente 2 abordagens: approach_a e approach_b
- garantir que sejam realmente diferentes entre si
- títulos curtos e fortes
- messages objetivas
- platforms plausíveis
- why com justificativa curta e concreta
- sem markdown

ANÁLISE ESTRATÉGICA:
${analysisOutput}

EXPANSÃO CRIATIVA:
${expansionOutput}

Retorne APENAS JSON válido:
{
  "topic_category": "categoria do tema",
  "suggested_deadline": "YYYY-MM-DD",
  "approach_a": {
    "angle": "ângulo",
    "title": "título",
    "message": "mensagem",
    "tone": "tom",
    "platforms": ["plataforma1"],
    "why": "justificativa"
  },
  "approach_b": {
    "angle": "ângulo",
    "title": "título",
    "message": "mensagem",
    "tone": "tom",
    "platforms": ["plataforma1"],
    "why": "justificativa"
  }
}`;
}

function buildPautaVariantText(approach: Record<string, any>) {
  return [
    approach?.title,
    approach?.message,
    approach?.why,
    Array.isArray(approach?.platforms) ? `Plataformas: ${approach.platforms.join(', ')}` : null,
  ].filter(Boolean).join('\n');
}

async function generatePautaPayload(params: {
  client: ClientRow;
  client_id: string;
  tenant_id: string;
  source: PautaSource;
  preferenceBlock: string;
  directivesBlock: string;
}): Promise<PautaSuggestionPayload> {
  const { client, client_id, tenant_id, source, preferenceBlock, directivesBlock } = params;
  const analysisPrompt = buildPautaAnalysisPrompt({ client, source, preferenceBlock, directivesBlock });

  let parsed: any = null;
  let analysisOutput = '';
  let expansionOutput = '';

  try {
    const geminiAnalysis = await generateWithProvider('gemini', {
      prompt: analysisPrompt,
      temperature: 0.4,
      maxTokens: 800,
    });
    analysisOutput = geminiAnalysis.output;

    const gptExpansion = await generateWithProvider('openai', {
      prompt: buildPautaExpansionPrompt(analysisOutput, client, source),
      temperature: 0.7,
      maxTokens: 1200,
    });
    expansionOutput = gptExpansion.output;

    const claudeRefinement = await generateWithProvider('claude', {
      prompt: buildPautaRefinementPrompt(analysisOutput, expansionOutput),
      temperature: 0.3,
      maxTokens: 1000,
    });

    parsed =
      safeParseJson(claudeRefinement.output) ||
      safeParseJson(gptExpansion.output) ||
      safeParseJson(geminiAnalysis.output);
  } catch {
    parsed = null;
  }

  const data = isValidSuggestionPayload(parsed)
    ? parsed
    : fallbackApproaches(source, client);

  const approachA = { ...(data.approach_a || {}) };
  const approachB = { ...(data.approach_b || {}) };
  let aiScore = source.score ?? 7.0;

  try {
    const { runSimulation } = await import('./campaignSimulator/simulationReport');
    const simReport = await runSimulation({
      tenantId: tenant_id,
      clientId: client_id,
      variants: [
        { index: 0, text: buildPautaVariantText(approachA) },
        { index: 1, text: buildPautaVariantText(approachB) },
      ],
    });
    const winnerIndex = simReport.winner_index ?? 0;
    const winner = simReport.variants?.[winnerIndex];
    aiScore = winner?.aggregate_resonance ?? simReport.winner_resonance ?? aiScore;
    approachA.simulation = {
      recommended: winnerIndex === 0,
      resonance: simReport.variants?.[0]?.aggregate_resonance ?? null,
    };
    approachB.simulation = {
      recommended: winnerIndex === 1,
      resonance: simReport.variants?.[1]?.aggregate_resonance ?? null,
    };
  } catch {
    // fallback silencioso: pauta continua mesmo sem simulador
  }

  return {
    topic_category: data.topic_category || null,
    suggested_deadline: data.suggested_deadline || null,
    approach_a: approachA,
    approach_b: approachB,
    ai_score: aiScore,
  };
}

export type GeneratedSuggestion = {
  id: string;
  approach_a: Record<string, any>;
  approach_b: Record<string, any>;
  topic_category: string | null;
  suggested_deadline: string | null;
};

/**
 * Generates a single pauta suggestion synchronously and returns the created record.
 * Used by the /pauta-inbox/from-clipping endpoint for immediate modal display.
 */
export async function generateSinglePautaSuggestion(params: {
  client_id: string;
  tenant_id: string;
  source: PautaSource;
}): Promise<GeneratedSuggestion | null> {
  const { client_id, tenant_id, source } = params;

  const [clientRes, preferenceCtx, directivesPrefs] = await Promise.all([
    query<ClientRow>(
      `SELECT id, name, segment_primary, profile FROM clients WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
      [client_id, tenant_id]
    ),
    getClientPreferenceContext(client_id, tenant_id),
    getClientPreferences({ tenant_id, client_id }).catch(() => null),
  ]);

  const client = clientRes.rows[0];
  if (!client) return null;

  const profile = client.profile || {};
  const preferenceBlock = buildPreferencePromptBlock(preferenceCtx);
  const directivesBlock = (() => {
    const boost = (directivesPrefs?.directives?.boost ?? []).slice(0, 3);
    const avoid = (directivesPrefs?.directives?.avoid ?? []).slice(0, 2);
    if (!boost.length && !avoid.length) return '';
    let block = '\nREGRAS PERMANENTES DO CLIENTE:\n';
    if (boost.length) block += `REFORÇAR: ${boost.join(' | ')}\n`;
    if (avoid.length) block += `EVITAR: ${avoid.join(' | ')}`;
    return block;
  })();

  const data = await generatePautaPayload({
    client,
    client_id,
    tenant_id,
    source,
    preferenceBlock,
    directivesBlock,
  });

  const platforms = [
    ...(data.approach_a?.platforms || []),
    ...(data.approach_b?.platforms || []),
  ].filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);

  try {
    const { rows } = await query<GeneratedSuggestion>(
      `
      INSERT INTO pauta_suggestions (
        tenant_id, client_id, title,
        approach_a, approach_b,
        source_type, source_id, source_domain, source_text,
        ai_score, topic_category, suggested_deadline, platforms
      ) VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING id, approach_a, approach_b, topic_category, suggested_deadline
      `,
      [
        tenant_id,
        client_id,
        data.approach_a?.title || source.title,
        JSON.stringify(data.approach_a),
        JSON.stringify(data.approach_b),
        source.type,
        source.id,
        source.domain || null,
        source.summary,
        data.ai_score,
        data.topic_category || null,
        data.suggested_deadline || null,
        JSON.stringify(platforms),
      ]
    );
    return rows[0] ?? null;
  } catch (err: any) {
    console.error('[pautaSuggestionService] generateSingle insert failed:', err?.message);
    return null;
  }
}

/**
 * Queries pending meeting actions and generates pauta suggestions from them.
 * Called non-blocking after a meeting is analyzed.
 */
export async function generatePautaSuggestionsFromMeetings(params: {
  client_id: string;
  tenant_id: string;
}): Promise<void> {
  const { client_id, tenant_id } = params;

  const { rows: actions } = await query(
    `SELECT ma.id, ma.title, ma.description, ma.type, ma.deadline, ma.priority,
            m.title AS meeting_title, m.recorded_at
       FROM meeting_actions ma
       JOIN meetings m ON m.id = ma.meeting_id
      WHERE ma.client_id=$1 AND ma.tenant_id=$2
        AND ma.status='pending'
        AND ma.created_at > NOW() - INTERVAL '30 days'
      ORDER BY CASE ma.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, ma.created_at DESC
      LIMIT 10`,
    [client_id, tenant_id]
  );

  if (actions.length === 0) return;

  const sources: PautaSource[] = actions.map((a: any) => ({
    type: 'meeting_action',
    id: a.id,
    title: a.title,
    summary: [
      a.description || a.title,
      a.meeting_title ? `Originado de: ${a.meeting_title}` : null,
      a.deadline ? `Prazo: ${new Date(a.deadline).toLocaleDateString('pt-BR')}` : null,
    ].filter(Boolean).join(' — '),
    date: a.deadline || a.recorded_at,
    score: a.priority === 'high' ? 8.5 : 7.0,
  }));

  await generatePautaSuggestions({ client_id, tenant_id, sources });
}

export async function generatePautaSuggestions(params: {
  client_id: string;
  tenant_id: string;
  sources: PautaSource[];
}): Promise<void> {
  const { client_id, tenant_id } = params;

  const [clientRes, preferenceCtx, directivesPrefs] = await Promise.all([
    query<ClientRow>(
      `SELECT id, name, segment_primary, profile FROM clients WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
      [client_id, tenant_id]
    ),
    getClientPreferenceContext(client_id, tenant_id),
    getClientPreferences({ tenant_id, client_id }).catch(() => null),
  ]);

  const client = clientRes.rows[0];
  if (!client) return;

  const profile = client.profile || {};
  const preferenceBlock = buildPreferencePromptBlock(preferenceCtx);
  const directivesBlock = (() => {
    const boost = (directivesPrefs?.directives?.boost ?? []).slice(0, 3);
    const avoid = (directivesPrefs?.directives?.avoid ?? []).slice(0, 2);
    if (!boost.length && !avoid.length) return '';
    let block = '\nREGRAS PERMANENTES DO CLIENTE:\n';
    if (boost.length) block += `REFORÇAR: ${boost.join(' | ')}\n`;
    if (avoid.length) block += `EVITAR: ${avoid.join(' | ')}`;
    return block;
  })();

  for (const source of params.sources) {
    // Skip items in editorial cooldown
    const inCooldown = preferenceCtx.editorial.cooldown_topics.some((topic) =>
      source.summary?.toLowerCase().includes(topic.toLowerCase()) ||
      source.title?.toLowerCase().includes(topic.toLowerCase())
    );
    if (inCooldown) continue;

    // Skip if a suggestion for this source already exists (avoid duplicates)
    const existing = await query<{ id: string }>(
      `SELECT id FROM pauta_suggestions WHERE source_id=$1 AND client_id=$2 AND status='pending' LIMIT 1`,
      [source.id, client_id]
    );
    if (existing.rows.length > 0) continue;

    const data = await generatePautaPayload({
      client,
      client_id,
      tenant_id,
      source,
      preferenceBlock,
      directivesBlock,
    });

    try {
      await query(
        `
        INSERT INTO pauta_suggestions (
          tenant_id, client_id, title,
          approach_a, approach_b,
          source_type, source_id, source_domain, source_text,
          ai_score, topic_category, suggested_deadline, platforms
        ) VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT DO NOTHING
        `,
        [
          tenant_id,
          client_id,
          data.approach_a?.title || source.title,
          JSON.stringify(data.approach_a),
          JSON.stringify(data.approach_b),
          source.type,
          source.id,
          source.domain || null,
          source.summary,
          data.ai_score,
          data.topic_category || null,
          data.suggested_deadline || null,
          JSON.stringify([
            ...(data.approach_a?.platforms || []),
            ...(data.approach_b?.platforms || []),
          ].filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)),
        ]
      );
    } catch (err: any) {
      console.error('[pautaSuggestionService] insert failed:', err?.message);
    }
  }
}
