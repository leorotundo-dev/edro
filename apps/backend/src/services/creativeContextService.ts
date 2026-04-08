/**
 * creativeContextService.ts
 *
 * Assembles the Creative Context Object (CCO) — all variables needed to
 * generate copy + visual brief from the same creative spine (tensão + conceito).
 *
 * Instead of having each agent make N separate DB queries, this service fetches
 * everything in one Promise.all and returns a single typed object.
 *
 * Architecture:
 *   assembleCreativeContext(briefingId, clientId, tenantId)
 *     → fetches 7 sources in parallel
 *     → returns CreativeContextObject
 *
 *   generateVisualBrief(conceito, artDirectionContext, platformSpecs)
 *     → derives visual brief from tensão (not from copy text)
 */

import { query } from '../db';
import { generateCompletion } from './ai/claudeService';
import { buildClientLivingMemory } from './clientLivingMemoryService';
import { buildBriefingDiagnostics } from './briefingDiagnosticService';

// ── Types ─────────────────────────────────────────────────────────────────────

export type CreativeContextObject = {
  cliente: {
    nome: string;
    promessa: string;
    diferenciais: string[];
    tom: string;
    proibicoes: string[];
    loraId: string | null;
    raw: Record<string, any>;
  };
  comportamento: {
    amd: string;
    triggers: string[];
    learningRules: { rule_name: string; effective_pattern: string; confidence: number }[];
  };
  cultura: string | null;                 // trends + clipping + calendar
  memoria: {
    copiesAnteriores: string[];           // anti-repetição: últimas 5 copies
    contextoVivo: string | null;
    diagnosticoBriefing: string | null;
  };
  visual: {
    artDirectionContext: string;
    loraStatus: string | null;
  };
  briefing: {
    id: string;
    titulo: string;
    objetivo: string;
    contexto: string | null;
    plataforma: string | null;
    formato: string | null;
    payload: Record<string, any>;
  };
};

export type VisualBrief = {
  cena: string;
  emocao_visual: string;
  paleta: string;
  composicao: string;
  evitar: string[];
  conceito_anchor: string;
};

// ── assembleCreativeContext ────────────────────────────────────────────────────

export async function assembleCreativeContext(params: {
  briefingId: string;
  clientId?: string | null;
  tenantId: string;
}): Promise<CreativeContextObject | null> {
  const { briefingId, clientId, tenantId } = params;

  // ── Fetch all sources in parallel ────────────────────────────────────────

  const [briefingRes, clientRes, behaviorRes, learningRes, copiesRes, clippingRes, artDirRes] =
    await Promise.allSettled([
      // 1. Briefing — only real columns; titulo/objetivo/plataforma/formato live in payload JSONB
      query<{ id: string; title: string; payload: any; main_client_id: string | null }>(
        `SELECT id, title, payload, main_client_id
         FROM edro_briefings
         WHERE id = $1 AND tenant_id = $2
         LIMIT 1`,
        [briefingId, tenantId],
      ),

      // 2. Client profile
      clientId
        ? query<{ id: string; name: string; knowledge_base: any; tone_description: string | null; lora_fal_id: string | null }>(
            `SELECT id, name, COALESCE(knowledge_base, '{}'::jsonb) as knowledge_base,
                    tone_description, NULL as lora_fal_id
             FROM clients
             WHERE id = $1
             LIMIT 1`,
            [clientId],
          )
        : Promise.resolve({ rows: [] }),

      // 3. Behavior profile (AMD + triggers)
      clientId
        ? query<{ preferred_amd: string | null; preferred_triggers: string[] | null }>(
            `SELECT preferred_amd, preferred_triggers
             FROM client_behavior_profiles
             WHERE client_id = $1 AND tenant_id = $2
             ORDER BY updated_at DESC
             LIMIT 1`,
            [clientId, tenantId],
          )
        : Promise.resolve({ rows: [] }),

      // 4. Top learning rules (confidence >= 0.7)
      clientId
        ? query<{ rule_name: string; effective_pattern: string; confidence_score: string }>(
            `SELECT rule_name, effective_pattern, confidence_score::text
             FROM learning_rules
             WHERE client_id = $1 AND tenant_id = $2
               AND is_active = true AND confidence_score >= 0.70
             ORDER BY confidence_score DESC
             LIMIT 5`,
            [clientId, tenantId],
          )
        : Promise.resolve({ rows: [] }),

      // 5. Recent copies (anti-repetition) — from studio_creatives library
      clientId
        ? query<{ copy_text: string }>(
            `SELECT COALESCE(copy_body, '') as copy_text
             FROM studio_creatives
             WHERE client_id = $1::uuid AND tenant_id = $2::uuid
               AND copy_body IS NOT NULL
             ORDER BY created_at DESC
             LIMIT 5`,
            [clientId, tenantId],
          ).catch(() => ({ rows: [] }))
        : Promise.resolve({ rows: [] }),

      // 6. Cultural context (recent clipping + upcoming calendar dates)
      clientId
        ? query<{ title: string; summary: string | null; type: 'clipping' | 'calendar' }>(
            `(SELECT ci.title, ci.summary, 'clipping' as type
              FROM clipping_items ci
              JOIN clipping_sources cs ON cs.id = ci.source_id
              WHERE cs.client_id = $1 AND ci.tenant_id = $2
                AND ci.published_at > now() - interval '48 hours'
                AND ci.relevance_score >= 65
              ORDER BY ci.relevance_score DESC
              LIMIT 3)
             UNION ALL
             (SELECT ce.title, ce.description as summary, 'calendar' as type
              FROM calendar_events ce
              WHERE ce.client_id::text = $1
                AND ce.event_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '14 days'
              ORDER BY ce.event_date ASC
              LIMIT 3)`,
            [clientId, tenantId],
          )
        : Promise.resolve({ rows: [] }),

      // 7. Art direction context — from client_visual_style synthesis
      clientId
        ? query<{ style_notes: string | null }>(
            `SELECT style_summary AS style_notes
             FROM client_visual_style
             WHERE client_id = $1 AND tenant_id = $2
             ORDER BY analyzed_at DESC
             LIMIT 1`,
            [clientId, tenantId],
          ).catch(() => ({ rows: [] }))
        : Promise.resolve({ rows: [] }),
    ]);

  // ── Extract results ───────────────────────────────────────────────────────

  const briefingRow = briefingRes.status === 'fulfilled' ? briefingRes.value.rows[0] : null;
  if (!briefingRow) return null;

  const resolvedClientId = clientId ?? briefingRow.main_client_id ?? null;
  const clientRow = clientRes.status === 'fulfilled' ? clientRes.value.rows[0] : null;
  const behaviorRow = behaviorRes.status === 'fulfilled' ? behaviorRes.value.rows[0] : null;
  const learningRows = learningRes.status === 'fulfilled' ? learningRes.value.rows : [];
  const copiesRows = copiesRes.status === 'fulfilled' ? copiesRes.value.rows : [];
  const culturalRows = clippingRes.status === 'fulfilled' ? clippingRes.value.rows : [];
  const artDirRow = artDirRes.status === 'fulfilled' ? artDirRes.value.rows[0] : null;

  const kb = clientRow?.knowledge_base ?? {};
  const livingMemory = resolvedClientId
    ? await buildClientLivingMemory({
        tenantId,
        clientId: resolvedClientId,
        briefing: {
          title: briefingRow.title ?? briefingRow.payload?.title ?? '',
          objective: briefingRow.payload?.objective ?? briefingRow.payload?.objetivo ?? '',
          context: briefingRow.payload?.context ?? briefingRow.payload?.notes ?? briefingRow.payload?.additional_notes ?? null,
          payload: briefingRow.payload ?? {},
        },
        maxEvidence: 4,
        maxActions: 3,
      }).catch(() => ({
        block: '',
        directives: [],
        evidence: [],
        pendingActions: [],
        snapshot: {
          active_directives: 0,
          evidence_signals: 0,
          fresh_signals_7d: 0,
          pending_commitments: 0,
          evidence_by_source: {},
        },
      }))
    : {
        block: '',
        directives: [],
        evidence: [],
        pendingActions: [],
        snapshot: {
          active_directives: 0,
          evidence_signals: 0,
          fresh_signals_7d: 0,
          pending_commitments: 0,
          evidence_by_source: {},
        },
      };
  const briefingDiagnostics = buildBriefingDiagnostics({
    briefing: {
      title: briefingRow.title ?? briefingRow.payload?.title ?? '',
      objective: briefingRow.payload?.objective ?? briefingRow.payload?.objetivo ?? '',
      context: briefingRow.payload?.context ?? briefingRow.payload?.notes ?? briefingRow.payload?.additional_notes ?? null,
      platform: briefingRow.payload?.platform ?? briefingRow.payload?.plataforma
        ?? (Array.isArray(briefingRow.payload?.channels) ? briefingRow.payload.channels[0] : null)
        ?? briefingRow.payload?.channels ?? null,
      format: briefingRow.payload?.format ?? briefingRow.payload?.formato ?? briefingRow.payload?.creative_format ?? null,
      payload: briefingRow.payload ?? {},
    },
    livingMemory,
  });

  // Build cultural context block
  let cultura: string | null = null;
  if (culturalRows.length > 0) {
    const parts: string[] = [];
    const clipping = culturalRows.filter((r) => r.type === 'clipping');
    const calendar = culturalRows.filter((r) => r.type === 'calendar');
    if (clipping.length > 0) {
      parts.push(`TENDÊNCIAS DO MOMENTO: ${clipping.map((r) => r.title).join(' · ')}`);
    }
    if (calendar.length > 0) {
      parts.push(`DATAS RELEVANTES (próximos 14 dias): ${calendar.map((r) => r.title).join(' · ')}`);
    }
    cultura = parts.join('\n');
  }

  return {
    cliente: {
      nome: clientRow?.name ?? kb.brand_name ?? 'Não informado',
      promessa: kb.brand_promise ?? '',
      diferenciais: Array.isArray(kb.differentiators) ? kb.differentiators.slice(0, 4) : [],
      tom: clientRow?.tone_description ?? kb.tone ?? '',
      proibicoes: Array.isArray(kb.forbidden_claims) ? kb.forbidden_claims : [],
      loraId: clientRow?.lora_fal_id ?? null,
      raw: { ...clientRow, knowledge_base: kb },
    },
    comportamento: {
      amd: behaviorRow?.preferred_amd ?? 'salvar',
      triggers: behaviorRow?.preferred_triggers ?? [],
      learningRules: learningRows.map((r) => ({
        rule_name: r.rule_name,
        effective_pattern: r.effective_pattern,
        confidence: parseFloat(r.confidence_score),
      })),
    },
    cultura,
    memoria: {
      copiesAnteriores: copiesRows.map((r) => r.copy_text).filter(Boolean),
      contextoVivo: livingMemory.block || null,
      diagnosticoBriefing: briefingDiagnostics.block || null,
    },
    visual: {
      artDirectionContext: artDirRow?.style_notes ?? '',
      loraStatus: null,
    },
    briefing: {
      id: briefingRow.id,
      // Extract semantic fields from payload JSONB (edro_briefings only has title + payload as columns)
      titulo: briefingRow.title ?? briefingRow.payload?.title ?? '',
      objetivo: briefingRow.payload?.objective ?? briefingRow.payload?.objetivo ?? '',
      contexto: briefingRow.payload?.context ?? briefingRow.payload?.notes ?? briefingRow.payload?.additional_notes ?? null,
      plataforma: briefingRow.payload?.platform ?? briefingRow.payload?.plataforma
        ?? (Array.isArray(briefingRow.payload?.channels) ? briefingRow.payload.channels[0] : null)
        ?? briefingRow.payload?.channels ?? null,
      formato: briefingRow.payload?.format ?? briefingRow.payload?.formato ?? briefingRow.payload?.creative_format ?? null,
      payload: briefingRow.payload ?? {},
    },
  };
}

// ── generateVisualBrief ───────────────────────────────────────────────────────

export async function generateVisualBrief(params: {
  conceito: {
    headline_concept: string;
    emotional_truth: string;
    cultural_angle: string;
    visual_direction: string;
  };
  artDirectionContext?: string;
  plataforma?: string | null;
  formato?: string | null;
}): Promise<VisualBrief> {
  const { conceito, artDirectionContext, plataforma, formato } = params;

  const prompt = `Você é um Diretor de Arte sênior. Com base no conceito criativo abaixo, gere um Visual Brief derivado da TENSÃO — não do texto da copy. A arte deve capturar a emoção, não ilustrar o texto.

CONCEITO CRIATIVO:
- Ideia central: ${conceito.headline_concept}
- Verdade emocional: ${conceito.emotional_truth}
- Ângulo cultural: ${conceito.cultural_angle}
- Direção visual inicial: ${conceito.visual_direction}
${artDirectionContext ? `\nCONTEXTO DA MARCA:\n${artDirectionContext}` : ''}
${plataforma ? `\nPLATAFORMA: ${plataforma} ${formato ? `(${formato})` : ''}` : ''}

Retorne JSON puro:
{
  "cena": "Descrição da cena principal — o momento visual que captura a tensão",
  "emocao_visual": "A emoção que o espectador deve sentir ao ver — não a mensagem, a sensação",
  "paleta": "Direção de cores e tonalidade",
  "composicao": "Estrutura visual — espaço negativo, ponto focal, ritmo",
  "evitar": ["elemento a evitar 1", "elemento a evitar 2", "elemento a evitar 3"],
  "conceito_anchor": "Frase de 1 linha que ancora todo o brief: o que a arte DEVE comunicar antes de qualquer palavra"
}`;

  try {
    const { text } = await generateCompletion({ prompt, temperature: 0.3, maxTokens: 500 });
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(clean) as VisualBrief;
  } catch {
    // Fallback if AI call fails
    return {
      cena: conceito.visual_direction,
      emocao_visual: conceito.emotional_truth,
      paleta: 'Neutro — deixar o DA decidir',
      composicao: 'Composição centrada, ponto focal no elemento emocional principal',
      evitar: ['clichês de stock', 'sorrisos forçados', 'poses de poder artificiais'],
      conceito_anchor: conceito.headline_concept,
    };
  }
}

// ── toConceitoParams ──────────────────────────────────────────────────────────

/**
 * Converts a CCO to AgentConceitoParams — pass directly to runAgentConceito().
 */
export function toConceitoParams(cco: CreativeContextObject) {
  return {
    briefing: {
      title: cco.briefing.titulo,
      objective: cco.briefing.objetivo,
      context: [cco.briefing.contexto, cco.memoria.contextoVivo, cco.memoria.diagnosticoBriefing].filter(Boolean).join('\n\n') || undefined,
    },
    clientProfile: cco.cliente.raw,
    platform: cco.briefing.plataforma ?? undefined,
    cultureBlock: cco.cultura ?? undefined,
  };
}

/**
 * Converts a CCO to AgentRedatorParams — pass directly to runAgentRedator().
 */
export function toRedatorParams(cco: CreativeContextObject, conceptBlock?: string) {
  const base = {
    briefing: {
      title: cco.briefing.titulo,
      payload: {
        ...cco.briefing.payload,
        living_memory_context: cco.memoria.contextoVivo ?? undefined,
        briefing_diagnostics: cco.memoria.diagnosticoBriefing ?? undefined,
      },
    },
    clientProfile: {
      ...cco.cliente.raw,
      amd: cco.comportamento.amd,
      __livingMemoryBlock: cco.memoria.contextoVivo ?? undefined,
      __briefingDiagnostics: cco.memoria.diagnosticoBriefing ?? undefined,
    },
    trigger: cco.comportamento.triggers[0] ?? null,
    amd: cco.comportamento.amd,
    platform: cco.briefing.plataforma ?? null,
    format: cco.briefing.formato ?? null,
  };

  if (conceptBlock) {
    (base.clientProfile as any).__conceptBlock = conceptBlock;
  }

  return base;
}
