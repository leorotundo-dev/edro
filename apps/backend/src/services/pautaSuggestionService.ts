import { query } from '../db';
import { getClientPreferenceContext, buildPreferencePromptBlock } from './preferenceEngine';
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

  const [clientRes, preferenceCtx] = await Promise.all([
    query<ClientRow>(
      `SELECT id, name, segment_primary, profile FROM clients WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
      [client_id, tenant_id]
    ),
    getClientPreferenceContext(client_id, tenant_id),
  ]);

  const client = clientRes.rows[0];
  if (!client) return null;

  const profile = client.profile || {};
  const preferenceBlock = buildPreferencePromptBlock(preferenceCtx);

  let parsed: any = null;
  try {
    const result = await generateWithProvider('gemini', {
      prompt: `Você é um estrategista de conteúdo. Com base na oportunidade abaixo, crie DUAS abordagens distintas de pauta para a empresa.

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

${preferenceBlock ? `HISTÓRICO DE PREFERÊNCIAS:\n${preferenceBlock}` : ''}`,
      temperature: 0.4,
      maxTokens: 700,
    });
    parsed = safeParseJson(result.output);
  } catch {
    parsed = null;
  }

  const data = parsed && parsed.approach_a && parsed.approach_b
    ? parsed
    : fallbackApproaches(source, client);

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
        source.score ?? 7.0,
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

  const [clientRes, preferenceCtx] = await Promise.all([
    query<ClientRow>(
      `SELECT id, name, segment_primary, profile FROM clients WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
      [client_id, tenant_id]
    ),
    getClientPreferenceContext(client_id, tenant_id),
  ]);

  const client = clientRes.rows[0];
  if (!client) return;

  const profile = client.profile || {};
  const preferenceBlock = buildPreferencePromptBlock(preferenceCtx);

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

    let parsed: any = null;
    try {
      const result = await generateWithProvider('gemini', {
        prompt: `Você é um estrategista de conteúdo. Com base na oportunidade abaixo, crie DUAS abordagens distintas de pauta para a empresa.

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

${preferenceBlock ? `HISTÓRICO DE PREFERÊNCIAS:\n${preferenceBlock}` : ''}`,
        temperature: 0.4,
        maxTokens: 700,
      });
      parsed = safeParseJson(result.output);
    } catch {
      parsed = null;
    }

    const data = parsed && parsed.approach_a && parsed.approach_b
      ? parsed
      : fallbackApproaches(source, client);

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
          source.score ?? 7.0,
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
