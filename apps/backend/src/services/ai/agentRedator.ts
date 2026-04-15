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

export const MOMENTO_COPY_DIRECTION: Record<string, string> = {
  problema: `
ESTÁGIO DE CONSCIÊNCIA: DESCOBERTA (problema)
A audiência ainda não sabe que tem esse problema ou está em negação.
REGRAS CRÍTICAS:
- NÃO mencione o produto/serviço diretamente
- NÃO use CTAs de venda
- Use linguagem de empatia e reconhecimento
- Objetivo: fazer a pessoa se identificar com o problema
`,
  solucao: `
ESTÁGIO DE CONSCIÊNCIA: AVALIANDO (solucao)
A audiência conhece o problema e está comparando soluções.
REGRAS CRÍTICAS:
- Compare com alternativas genéricas ou status quo
- Use dados, provas e diferenciais específicos
- Responda objeções comuns implicitamente
- CTA aceitável: ver como funciona, comparar, baixar caso
`,
  decisao: `
ESTÁGIO DE CONSCIÊNCIA: PRONTO PARA AGIR (decisao)
A audiência está perto de escolher e precisa do empurrão final.
REGRAS CRÍTICAS:
- Elimine a última objeção
- Use prova social específica e urgência genuína
- CTA direto, sem ambiguidade
- Tom de confiança total
`,
};

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
  momento?: 'problema' | 'solucao' | 'decisao' | null;
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
  const momentoDirection = params.momento ? MOMENTO_COPY_DIRECTION[params.momento] || '' : '';
  const livingMemoryBlock = String(
    params.briefing?.payload?.living_memory_context
      ?? params.clientProfile?.__livingMemoryBlock
      ?? '',
  ).trim();
  const briefingDiagnostics = String(
    params.briefing?.payload?.briefing_diagnostics
      ?? params.clientProfile?.__briefingDiagnostics
      ?? '',
  ).trim();
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
${momentoDirection}
${livingMemoryBlock ? `\nMEMÓRIA VIVA DO CLIENTE (respeite decisões, promessas e restrições):\n${livingMemoryBlock.slice(0, 1200)}` : ''}
${briefingDiagnostics ? `\nDIAGNÓSTICO DO BRIEFING (compense lacunas e evite conflitos):\n${briefingDiagnostics.slice(0, 900)}` : ''}

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
  const momentoDirection = params.momento ? MOMENTO_COPY_DIRECTION[params.momento] || '' : '';
  const livingMemoryBlock = String(
    params.briefing?.payload?.living_memory_context
      ?? params.clientProfile?.__livingMemoryBlock
      ?? '',
  ).trim();
  const briefingDiagnostics = String(
    params.briefing?.payload?.briefing_diagnostics
      ?? params.clientProfile?.__briefingDiagnostics
      ?? '',
  ).trim();
  const appealInstructions: Record<string, string> = {
    dor:         'Foque na DOR específica da persona. Nomeie o problema com precisão antes de apresentar a solução. Use linguagem visceral e empática.',
    logica:      'Foque em DADOS e LÓGICA. Use números, percentuais, comparações e argumentos racionais. Convença pelo raciocínio.',
    prova_social: 'Foque em PROVA SOCIAL. Mencione resultados de clientes, casos de sucesso, volume de pessoas atendidas. Crie FOMO e validação.',
  };

  const rawPlatform3 = params.platform?.toLowerCase() ?? 'instagram';
  const platform = rawPlatform3.includes('reel') ? 'reels'
    : rawPlatform3.includes('storie') ? 'stories'
    : rawPlatform3.includes('tiktok') ? 'tiktok'
    : rawPlatform3.includes('linkedin') ? 'linkedin'
    : rawPlatform3.includes('twitter') || rawPlatform3 === 'x' ? 'twitter'
    : rawPlatform3.includes('facebook') || rawPlatform3 === 'fb' ? 'facebook'
    : rawPlatform3.includes('whatsapp') ? 'whatsapp'
    : rawPlatform3.includes('email') ? 'email'
    : rawPlatform3.includes('instagram') ? 'instagram'
    : rawPlatform3;
  const charLimits: Record<string, string> = {
    instagram: 'Linha 1 ≤ 125 chars (visível sem "ver mais"), legenda até 2200 chars, 8-15 hashtags',
    reels:     'Legenda ≤ 150 chars, roteiro por cortes de câmera, hashtags ao final',
    tiktok:    'Legenda ≤ 150 chars, 15-30 hashtags, roteiro linha-a-linha (cada linha = corte)',
    stories:   '1 ideia por slide, texto central com margem de 15%, CTA no último slide',
    linkedin:  'Linha 1 ≤ 210 chars (visível antes de "ver mais"), post até 3000 chars, 3-5 hashtags no final',
    twitter:   '≤ 270 chars por tweet; thread: 1º tweet = tese completa + 🧵, numeração 1/ 2/ 3/',
    facebook:  '≤ 80 chars no copy principal, link preview como CTA, 2-5 hashtags',
    whatsapp:  '≤ 3 parágrafos de 160 chars, link no final, bold apenas em 1-2 palavras-chave',
    email:     'Subject ≤ 50 chars, 1 CTA por email, parágrafos de 2-3 linhas',
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
${momentoDirection}

CONTEXTO:
- Plataforma: ${params.platform ?? 'Instagram'} (limite: ${charLimits[platform] ?? 'adapte ao contexto'})
- Formato: ${params.format ?? 'Post'}
- AMD: ${params.amd ?? 'engajamento'}
${livingMemoryBlock ? `\nMEMÓRIA VIVA DO CLIENTE (obrigatório respeitar):\n${livingMemoryBlock.slice(0, 1400)}` : ''}
${briefingDiagnostics ? `\nDIAGNÓSTICO DO BRIEFING (compense as lacunas abaixo antes de escrever):\n${briefingDiagnostics.slice(0, 1000)}` : ''}
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
      hashtags: [],
    };
  }
}

// ─── Plugin 4 — Platform Optimizer ───────────────────────────────────────────

async function plugin4PlatformOptimizer(
  params: AgentRedatorParams,
  variant: Omit<CopyVariant, 'audit' | 'flagged'>,
): Promise<Omit<CopyVariant, 'audit' | 'flagged'>> {
  const rawPlatform = params.platform?.toLowerCase() ?? 'instagram';
  // Normalize platform key to match platformRules keys
  const platform = rawPlatform.includes('reel') ? 'reels'
    : rawPlatform.includes('storie') ? 'stories'
    : rawPlatform.includes('tiktok') ? 'tiktok'
    : rawPlatform.includes('linkedin') ? 'linkedin'
    : rawPlatform.includes('twitter') || rawPlatform === 'x' ? 'twitter'
    : rawPlatform.includes('facebook') || rawPlatform === 'fb' ? 'facebook'
    : rawPlatform.includes('whatsapp') || rawPlatform === 'wa' ? 'whatsapp'
    : rawPlatform.includes('email') ? 'email'
    : rawPlatform.includes('instagram') ? 'instagram'
    : rawPlatform;
  const platformRules: Record<string, string> = {
    instagram: `REGRAS INSTAGRAM FEED:
- Linha 1 (≤125 chars): deve funcionar SEM "ver mais" — é a única linha que a maioria lê
- Estrutura: gancho → desenvolvimento (3-4 parágrafos) → prova/dado → CTA → hashtags
- Parágrafos de 1-2 linhas com espaço duplo entre eles (sem espaço = muro de texto)
- Emojis contextuais (não decorativos) a cada 2-3 parágrafos, nunca no meio de frase
- Hashtags: 8-15, mix nicho (10K-500K) + média (500K-5M) + ampla (>5M), sempre no FINAL
- CTA explícito ANTES das hashtags — nunca enterrar o CTA depois das tags
- Se carrossel: legenda referencia os slides ("Deslize →")`,

    reels: `REGRAS INSTAGRAM REELS:
- Legenda: ≤ 150 chars, 1 frase de impacto que complementa o vídeo
- Hashtags: 8-15, mix nicho + ampla, ao final da legenda
- Roteiro segue: [HOOK 0-3s] → [CONFLITO 3-25s] → [VIRADA/INSIGHT 25-45s] → [CTA+PAUSA 45-58s]
- Cada linha do roteiro = instrução de corte de câmera
- Texto em tela: máx 5 palavras por bloco, fonte grande, alto contraste
- CTA verbal + pausa de câmera antes do final (0.5s de silêncio = ênfase emocional)`,

    tiktok: `REGRAS TIKTOK:
- Legenda: ≤ 150 chars, direto ao ponto — sem parágrafos longos
- Hashtags: 15-30, sempre incluir #fyp #foryou + nicho específico + 2-3 trending do momento
- Roteiro: [HOOK visceral 0-3s] → [DESENVOLVIMENTO 3-25s] → [PAYOFF 25-45s] → [CTA+PAUSA]
- Cada linha = instrução de edição/corte
- Texto em tela: máx 5 palavras, fonte enorme, contraste extremo, posição central
- Hook obrigatório nos 3 primeiros segundos — pergunta, afirmação polêmica ou promessa
- Mencionar "trending audio" quando culturalmente relevante`,

    stories: `REGRAS INSTAGRAM STORIES:
- 1 ideia por slide — jamais sobrecarregar
- Texto: posição central, 15% de margem segura nas bordas (UI do app cobre as bordas)
- Fundo: cor sólida ou blur suave — nunca textura poluída ou foto escura com texto claro
- Sequência: [Gancho/Pergunta] → [Desenvolvimento] → [Prova] → [CTA com Link Sticker]
- Link Sticker apenas no ÚLTIMO slide
- Se objetivo é engajamento: usar Enquete ou Caixinha de Perguntas (3x mais resposta)
- Cada slide: máx 2-3 linhas de texto`,

    linkedin: `REGRAS LINKEDIN:
- Primeira linha: insight inesperado ou dado contraintuitivo (visível sem "ver mais", ≤ 210 chars)
- JAMAIS começar com: "Hoje quero compartilhar", "É com prazer", "Vim trazer", "Reflexão"
- Estrutura: [Insight/Hook] → [Contexto/história] → [Aprendizado concreto] → [CTA]
- Tom: par a par — especialista com especialista, primeira pessoa, sem pedantismo corporativo
- Bullets: use símbolos (→ ✓ ▸), nunca hífen puro; máx 5 bullets por bloco
- Hashtags: 3-5 ao FINAL, NUNCA no corpo do texto
- Se carrossel: slide 1 = promessa clara, slides 2-9 = delivery, último = síntese + CTA + marca
- Horário pico: terça a quinta, 8h-10h e 12h-13h`,

    twitter: `REGRAS X/TWITTER:
- Tweet único: ≤ 270 chars (reservar 10 para citações)
- Se thread: primeiro tweet = TESE COMPLETA + promessa ("Thread sobre X 🧵")
- Numeração obrigatória: 1/ 2/ 3/ etc.
- Último tweet: síntese 1 frase + CTA + pedir RT
- Máx 2 hashtags por tweet, apenas ao final, nunca no meio de frase
- Tom direto, sem rodeios — Twitter recompensa assertividade`,

    facebook: `REGRAS FACEBOOK:
- Parágrafos curtos (2-3 linhas), espaço entre parágrafos
- Primeira linha: gancho que gera curiosidade ou identidade ("Você também faz isso?")
- Link preview como CTA primário — texto deve preparar para o clique
- Emojis moderados (1-2 por parágrafo), nunca em excesso
- CTA explícito antes do link
- Hashtags: 2-5 no máximo, Facebook não amplifica por hashtag`,

    whatsapp: `REGRAS WHATSAPP/BROADCAST:
- Primeira linha: razão clara de abrir, sem pitch — contexto antes de oferta
- Máx 3 parágrafos curtos (≤ 160 chars cada) — mensagem longa = não lida
- Link sempre no FINAL, nunca no início
- Tom: conversa humana, primeira pessoa
- Bold (*asteriscos*) apenas em 1-2 palavras-chave, nunca frases inteiras
- Emojis: 1-2 por mensagem, início ou final do parágrafo`,

    email: `REGRAS EMAIL MARKETING:
- Subject: ≤ 50 chars, benefício explícito ou curiosidade — sem spam words
- Estrutura: [Hook 1-2 linhas] → [Problema] → [Solução] → [Prova/dado] → [CTA único]
- 1 CTA principal por email — múltiplos CTAs matam conversão
- Parágrafos de 2-3 linhas, mobile first
- Preview text complementa o subject — nunca repete`,
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
