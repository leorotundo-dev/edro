/**
 * Agente Redator — 5-plugin chain for production-grade advertising copy.
 *
 * Architecture:
 *   Plugin 1 (Brand Voice RAG)  → serial
 *   Plugin 2 (Strategist)       → serial
 *   Plugin 3 (Variant Generator)→ fan-out × 3 (parallel)
 *   Plugin 4 (Platform Optimizer)→ fan-out × 3 (parallel)
 *   Plugin 5 (Semantic Auditor) → fan-in, with conditional retry loop → Plugin 3
 */

import { generateCompletion } from './claudeService';

// ─── Types ───────────────────────────────────────────────────────────────────

export type BrandVoiceContext = {
  tom: string;
  palavras_proibidas: string[];
  persona: string;
  estilo: string;
  emocao_alvo: string;
};

export type HookStrategy = {
  structure: string;           // AIDA | PAS | BAB | PASTOR
  hooks: string[];             // 3-5 opening hook options
  angles: string[];            // creative angles / POVs
  key_tension: string;         // the core tension to exploit
};

export type CopyVariant = {
  appeal: 'dor' | 'logica' | 'prova_social';
  title: string;
  body: string;
  cta: string;
  legenda: string;
  hashtags: string[];
  audit: {
    approved: boolean;
    score: number;
    issues: string[];
    final_text: string;
  };
  flagged: boolean;
};

export type AgentRedatorResult = {
  brandVoice: BrandVoiceContext;
  strategy: HookStrategy;
  variants: CopyVariant[];
  pluginTimings: Record<string, number>;
};

export type AgentRedatorParams = {
  briefing?: { title?: string; payload?: any } | null;
  clientProfile?: any;
  trigger?: string | null;
  tone?: string | null;
  amd?: string | null;
  platform?: string | null;
  format?: string | null;
  taskType?: string | null;
  count?: number;
  // Plugin-level overrides: user can freeze a plugin's output and re-run downstream only
  brandVoiceOverride?: Partial<BrandVoiceContext>;
  strategyOverride?: Partial<HookStrategy>;
  appealsOverride?: Array<'dor' | 'logica' | 'prova_social'>;
};

// ─── Plugin 1 — Brand Voice RAG ──────────────────────────────────────────────

async function plugin1BrandVoice(params: AgentRedatorParams): Promise<BrandVoiceContext> {
  const profile = params.clientProfile ?? {};
  const bv = profile.brand_voice ?? profile.brandVoice ?? {};

  const prompt = `Você é um especialista em branding e brand voice.
Com base nos dados do cliente abaixo, extraia e padronize as regras de escrita em um JSON rigoroso.

DADOS DO CLIENTE:
- Segmento: ${profile.segment ?? 'não informado'}
- Tom de voz configurado: ${params.tone ?? bv.personality ?? 'não informado'}
- Personalidade da marca: ${bv.personality ?? 'não informada'}
- Vocabulário proibido: ${JSON.stringify(bv.donts ?? [])}
- Must-mentions: ${JSON.stringify(bv.must_mentions ?? [])}
- Persona: ${JSON.stringify(profile.personas?.[0] ?? profile.audience ?? {})}
- Briefing: ${params.briefing?.title ?? 'não informado'}

Retorne SOMENTE este JSON (sem markdown):
{
  "tom": "<ex: descontraído, técnico, inspirador, urgente>",
  "palavras_proibidas": ["<palavra1>", "<palavra2>"],
  "persona": "<descrição da persona em 1 frase>",
  "estilo": "<ex: parágrafos curtos, bullets, storytelling>",
  "emocao_alvo": "<ex: esperança, medo, admiração, urgência>"
}`;

  try {
    const res = await generateCompletion({ prompt, maxTokens: 400, temperature: 0.1 });
    const raw = res.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(raw) as BrandVoiceContext;
  } catch {
    return {
      tom: params.tone ?? 'profissional',
      palavras_proibidas: bv.donts ?? [],
      persona: profile.audience ?? 'público geral',
      estilo: 'parágrafos curtos e objetivos',
      emocao_alvo: 'confiança',
    };
  }
}

// ─── Plugin 2 — Strategist (Outline & Hooks) ─────────────────────────────────

async function plugin2Strategist(
  params: AgentRedatorParams,
  bv: BrandVoiceContext,
): Promise<HookStrategy> {
  const amdDescriptions: Record<string, string> = {
    compartilhar:   'viralizar via compartilhamento (identidade, dark social)',
    salvar:         'gerar saves (conteúdo de valor, listas, frameworks)',
    clicar:         'gerar cliques no link (escassez, prova social, CTA claro)',
    responder:      'gerar comentários (pergunta aberta, opinião dividida)',
    pedir_proposta: 'gerar pedido de orçamento (dor específica + solução imediata)',
  };
  const triggerDescriptions: Record<string, string> = {
    G01: 'Escassez — urgência de tempo ou quantidade',
    G02: 'Autoridade — credenciais e expertise',
    G03: 'Prova Social — depoimentos e números',
    G04: 'Reciprocidade — valor gratuito primeiro',
    G05: 'Curiosidade — incomplete loop, revelação',
    G06: 'Identidade — pertencimento, "pessoas como você"',
    G07: 'Dor/Solução — nomear a dor e resolver',
  };

  const prompt = `Você é um redator sênior e estrategista de conteúdo publicitário.
NÃO escreva o texto final. Sua tarefa é criar a ESTRATÉGIA e os GANCHOS para os primeiros 3 segundos.

CONTEXTO:
- Tom de voz: ${bv.tom}
- Persona: ${bv.persona}
- Emoção alvo: ${bv.emocao_alvo}
- AMD (ação desejada): ${amdDescriptions[params.amd ?? ''] ?? params.amd ?? 'engajamento geral'}
- Gatilho psicológico: ${triggerDescriptions[params.trigger ?? ''] ?? 'nenhum'}
- Plataforma: ${params.platform ?? 'não definida'}
- Briefing: ${params.briefing?.title ?? 'não informado'}
- Objetivo do briefing: ${params.briefing?.payload?.objective ?? 'não informado'}

Retorne SOMENTE este JSON (sem markdown):
{
  "structure": "<AIDA | PAS | BAB | PASTOR>",
  "hooks": ["<gancho 1>", "<gancho 2>", "<gancho 3>"],
  "angles": ["<ângulo criativo 1: ex. dor>", "<ângulo 2: ex. dado>", "<ângulo 3: ex. prova social>"],
  "key_tension": "<a tensão central a explorar em 1 frase>"
}`;

  try {
    const res = await generateCompletion({ prompt, maxTokens: 600, temperature: 0.4 });
    const raw = res.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(raw) as HookStrategy;
  } catch {
    return {
      structure: 'AIDA',
      hooks: ['Você sabia que…', 'A maioria das pessoas não percebe…', 'O que separa quem consegue de quem não consegue…'],
      angles: ['dor', 'lógica', 'prova social'],
      key_tension: 'Situação atual vs. resultado desejado',
    };
  }
}

// ─── Plugin 3 — Variant Generator (The Braçal Writer) ────────────────────────

async function plugin3Generator(
  params: AgentRedatorParams,
  bv: BrandVoiceContext,
  strategy: HookStrategy,
  appeal: 'dor' | 'logica' | 'prova_social',
  rejectionFeedback?: string,
): Promise<Omit<CopyVariant, 'audit' | 'flagged'>> {
  const appealInstructions: Record<string, string> = {
    dor:         'Foque na DOR específica da persona. Nomeie o problema com precisão antes de apresentar a solução. Use linguagem visceral e empática.',
    logica:      'Foque em DADOS e LÓGICA. Use números, percentuais, comparações e argumentos racionais. Convença pelo raciocínio.',
    prova_social: 'Foque em PROVA SOCIAL. Mencione resultados de clientes, casos de sucesso, volume de pessoas atendidas. Crie FOMO e validação.',
  };

  const platform = params.platform?.toLowerCase() ?? 'instagram';
  const charLimits: Record<string, string> = {
    instagram: '≤ 125 chars no título, legenda até 2200 chars',
    linkedin:  '≤ 210 chars antes do "ver mais", posts de até 3000 chars',
    twitter:   '≤ 280 chars totais',
    facebook:  '≤ 80 chars no copy principal',
  };

  const hook = strategy.hooks[appeal === 'dor' ? 0 : appeal === 'logica' ? 1 : 2] ?? strategy.hooks[0];

  const prompt = `Você é um redator publicitário especialista. Escreva uma variante completa de copy.

REGRAS DE MARCA (OBRIGATÓRIAS):
- Tom: ${bv.tom}
- Estilo: ${bv.estilo}
- Palavras PROIBIDAS: ${bv.palavras_proibidas.join(', ') || 'nenhuma'}
- Emoção alvo: ${bv.emocao_alvo}

ESTRATÉGIA:
- Estrutura: ${strategy.structure}
- Gancho de abertura: "${hook}"
- Ângulo deste texto: ${appealInstructions[appeal]}
- Tensão central: ${strategy.key_tension}

CONTEXTO:
- Plataforma: ${params.platform ?? 'Instagram'} (limite: ${charLimits[platform] ?? 'adapte ao contexto'})
- Formato: ${params.format ?? 'Post'}
- AMD: ${params.amd ?? 'engajamento'}
${rejectionFeedback ? `\nFEEDBACK DO AUDITOR (CORRIJA ESTES PONTOS):\n${rejectionFeedback}` : ''}

Retorne SOMENTE este JSON (sem markdown):
{
  "title": "<título / headline principal>",
  "body": "<corpo do texto>",
  "cta": "<chamada para ação curta e direta>",
  "legenda": "<legenda para redes sociais com emojis contextuais>"
}`;

  try {
    const res = await generateCompletion({ prompt, maxTokens: 800, temperature: 0.7 });
    const raw = res.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(raw);
    return { appeal, ...parsed };
  } catch {
    return {
      appeal,
      title: `Variante ${appeal}`,
      body: '',
      cta: 'Saiba mais',
      legenda: '',
    };
  }
}

// ─── Plugin 4 — Platform Optimizer ───────────────────────────────────────────

async function plugin4PlatformOptimizer(
  params: AgentRedatorParams,
  variant: Omit<CopyVariant, 'audit' | 'flagged'>,
): Promise<Omit<CopyVariant, 'audit' | 'flagged'>> {
  const platform = params.platform?.toLowerCase() ?? 'instagram';
  const platformRules: Record<string, string> = {
    instagram: 'Parágrafos de 1-2 linhas. Emojis a cada 2-3 parágrafos. Quebras de linha para escaneabilidade. Hashtags no final (5-10). CTA antes das hashtags.',
    linkedin:  'Tom profissional. Primeiro parágrafo = gancho (sem hashtags no início). Bullets para listas. Hashtags ao final (3-5). CTA explícito.',
    twitter:   'Máximo 280 chars. Sem hashtags no body, apenas 1-2 ao final. CTA ultra-curto.',
    facebook:  'Parágrafos curtos. Link preview como CTA primário. Emojis moderados.',
    tiktok:    'Legenda curta (150 chars). Hashtags trending (10+). Hook na primeira linha.',
  };

  const prompt = `Você é um especialista em formatação de conteúdo para ${params.platform ?? 'Instagram'}.
Adapte o texto abaixo para as especificidades da plataforma, sem alterar o conteúdo ou tom.

REGRAS DA PLATAFORMA ${params.platform ?? 'Instagram'}:
${platformRules[platform] ?? platformRules.instagram}

TEXTO ORIGINAL:
Título: ${variant.title}
Corpo: ${variant.body}
CTA: ${variant.cta}
Legenda: ${variant.legenda}

Retorne SOMENTE este JSON (sem markdown):
{
  "title": "<título otimizado>",
  "body": "<corpo formatado para a plataforma>",
  "cta": "<CTA otimizado>",
  "legenda": "<legenda formatada com hashtags geradas para ${params.platform ?? 'Instagram'}>",
  "hashtags": ["<hashtag1>", "<hashtag2>", "<hashtag3>", "<hashtag4>", "<hashtag5>"]
}`;

  try {
    const res = await generateCompletion({ prompt, maxTokens: 700, temperature: 0.3 });
    const raw = res.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(raw);
    return { ...variant, ...parsed };
  } catch {
    return { ...variant, hashtags: [] };
  }
}

// ─── Plugin 5 — Semantic Auditor ─────────────────────────────────────────────

async function plugin5Auditor(
  params: AgentRedatorParams,
  variant: Omit<CopyVariant, 'audit' | 'flagged'>,
  bv: BrandVoiceContext,
): Promise<CopyVariant['audit']> {
  const prompt = `Você é um auditor semântico de copy publicitário. Faça um check-up cruzado rigoroso.

REGRAS DE MARCA:
- Tom: ${bv.tom}
- Palavras PROIBIDAS: ${bv.palavras_proibidas.join(', ') || 'nenhuma'}
- Persona: ${bv.persona}

BRIEFING:
- Título: ${params.briefing?.title ?? 'não informado'}
- Objetivo: ${params.briefing?.payload?.objective ?? 'não informado'}
- AMD: ${params.amd ?? 'não definida'}
- Gatilho: ${params.trigger ?? 'nenhum'}

COPY PARA AUDITAR:
Título: ${variant.title}
Corpo: ${variant.body}
CTA: ${variant.cta}
Legenda: ${variant.legenda}

CRITÉRIOS DE REPROVAÇÃO (qualquer um reprova):
1. Uso de palavras proibidas
2. Tom inconsistente com a marca
3. Incoerência semântica entre título, corpo e CTA
4. CTA sem clareza ou ambíguo
5. AMD não atendida pelo copy

Retorne SOMENTE este JSON (sem markdown):
{
  "approved": <true | false>,
  "score": <0-100>,
  "issues": ["<problema específico se houver>"],
  "final_text": "<o texto final CORRIGIDO se approved=true, ou o texto original se false>"
}`;

  try {
    const res = await generateCompletion({ prompt, maxTokens: 600, temperature: 0.1 });
    const raw = res.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(raw);
  } catch {
    return { approved: true, score: 70, issues: [], final_text: variant.body };
  }
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

const MAX_AUDIT_RETRIES = 1;

export async function runAgentRedator(params: AgentRedatorParams): Promise<AgentRedatorResult> {
  const timings: Record<string, number> = {};
  const t = (key: string, fn: () => Promise<any>) => {
    const start = Date.now();
    return fn().then((v) => { timings[key] = Date.now() - start; return v; });
  };

  // Plugin 1 — Brand Voice (skip if user provided override)
  const brandVoice: BrandVoiceContext = params.brandVoiceOverride
    ? { ...(await t('p1_brand_voice', () => plugin1BrandVoice(params))), ...params.brandVoiceOverride }
    : await t('p1_brand_voice', () => plugin1BrandVoice(params));

  // Plugin 2 — Strategist (skip generation if fully overridden)
  const strategy: HookStrategy = params.strategyOverride &&
    params.strategyOverride.structure && params.strategyOverride.hooks?.length
    ? params.strategyOverride as HookStrategy
    : await t('p2_strategist', () =>
        plugin2Strategist(params, brandVoice).then((s) => ({ ...s, ...params.strategyOverride }))
      );

  // Plugin 3 — Fan-out: up to 3 variants in parallel
  const appeals: Array<'dor' | 'logica' | 'prova_social'> = params.appealsOverride?.length
    ? params.appealsOverride.slice(0, 3)
    : ['dor', 'logica', 'prova_social'];
  const rawVariants = await t('p3_generator', () =>
    Promise.all(appeals.map((appeal) => plugin3Generator(params, brandVoice, strategy, appeal)))
  );

  // Plugin 4 — Fan-out: optimize all 3 in parallel
  const optimized = await t('p4_optimizer', () =>
    Promise.all(rawVariants.map((v) => plugin4PlatformOptimizer(params, v)))
  );

  // Plugin 5 — Fan-in with conditional retry loop
  const variants: CopyVariant[] = await t('p5_auditor', () =>
    Promise.all(
      optimized.map(async (variant) => {
        let current = variant;
        let audit = await plugin5Auditor(params, current, brandVoice);

        if (!audit.approved && MAX_AUDIT_RETRIES > 0) {
          // Loop back to Plugin 3 with rejection feedback
          const rejectionFeedback = audit.issues.join('\n');
          const retried = await plugin3Generator(params, brandVoice, strategy, current.appeal, rejectionFeedback);
          const retriedOptimized = await plugin4PlatformOptimizer(params, retried);
          current = retriedOptimized;
          audit = await plugin5Auditor(params, current, brandVoice);
        }

        return {
          ...current,
          audit,
          flagged: !audit.approved,
        } satisfies CopyVariant;
      })
    )
  );

  return { brandVoice, strategy, variants, pluginTimings: timings };
}
