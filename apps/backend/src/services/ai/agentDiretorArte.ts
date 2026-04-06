/**
 * Agente Diretor de Arte — 6-plugin chain for production-grade ad creative generation.
 *
 * Architecture:
 *   P1 Brand Visual RAG     → serial (reads client visual identity + LoRA)
 *   P2 Prompt Brain         → serial (LLM engineers optimal Fal.ai API payload)
 *   P3 Rendering            → serial (Fal.ai HTTP call, ~3-12s)
 *   P4 Visual Critique      → serial (vision LLM evaluates the image)
 *   P5 Critique Loop        → conditional retry P2→P3→P4 (max 2 retries)
 *   P6 Multi-format         → fan-out parallel (optional, generates multiple sizes)
 */

import { generateCompletion } from './claudeService';
import { generateImageWithFal, type FalModel, type FalLoraConfig } from './falAiService';
import { loadCachedStyle, analyzeClientVisualStyle, type ClientVisualStyle } from '../visualStyleAnalyzer';
import { getRelevantSkills, detectCalendarEventType, detectSectorKeywords } from '../jarvisSkillsService';

// ─── Types ───────────────────────────────────────────────────────────────────

export type BrandVisualContext = {
  primaryColor: string;
  styleKeywords: string[];
  moodKeywords: string[];
  avoidElements: string[];
  loraId: string | null;         // Fal.ai LoRA path for brand visual consistency
  loraScale: number;             // 0.0–1.0 (default 0.85)
  referenceStyle: string;        // ex: "hiper-realismo", "flat design", "minimalismo"
  typography: string;
};

export type FalApiPayload = {
  concept: string;               // 1-sentence visual concept
  prompt: string;                // engineered positive prompt for Fal.ai
  negativePrompt: string;
  model: FalModel;
  aspectRatio: string;
  guidanceScale: number;
  numInferenceSteps: number;
  loras: FalLoraConfig[];
};

export type VisualCritique = {
  pass: boolean;
  score: number;                 // 0–100
  dimensions: Array<{ label: string; score: number; note?: string }>;
  issues: string[];
  promptRefinements: string;     // what to change in prompt for retry
};

export type MultiFormatResult = {
  format: string;
  aspectRatio: string;
  imageUrl: string;
};

export type AgentDiretorArteResult = {
  brandVisual: BrandVisualContext;
  payload: FalApiPayload;
  imageUrl: string;
  imageUrls: string[];
  seed?: number;
  critique: VisualCritique;
  attempts: number;
  multiFormat?: MultiFormatResult[];
  pluginTimings: Record<string, number>;
};

export type AgentDAParams = {
  copy?: string | null;
  briefing?: { title?: string; payload?: any } | null;
  clientProfile?: any;
  trigger?: string | null;
  platform?: string | null;
  format?: string | null;
  aspectRatio?: string;
  // DA direction from ArteNode UI (Plugin 3 DA)
  camera?: string;
  lighting?: string;
  composition?: string;
  // Overrides for parameter control
  brandVisualOverride?: Partial<BrandVisualContext>;
  payloadOverride?: Partial<FalApiPayload>;
  generateMultiFormat?: boolean;
  brandPack?: boolean;          // generate ALL 5 formats (Story/Feed/Portrait/LinkedIn/Banner)
  visualReferences?: string[];  // reference image URLs from Visual Insights (feed into P2)
  // ── Canvas Campaign Pipeline ──
  boldness?: number;            // 0.0 (conservador/fiel ao Instagram) → 1.0 (arrojado/tendências)
  tenantId?: string;            // for loading Instagram visual style
  clientId?: string;            // for loading Instagram visual style
  campaignConcept?: string;     // conceito criativo da campanha
  pieceIndex?: number;          // qual peça da campanha (para variação)
  totalPieces?: number;         // total de peças na campanha
  spatialDirective?: string;    // "leave clean area in top 30% for headline"
};

// ─── Plugin 1 — Brand Visual RAG ─────────────────────────────────────────────

async function plugin1BrandVisualRag(params: AgentDAParams): Promise<BrandVisualContext> {
  const profile = params.clientProfile ?? {};
  const vi = profile.visual_identity ?? profile.brand_tokens ?? {};
  const bv = profile.brand_voice ?? {};

  // Load Instagram visual style if available
  let instagramStyle: ClientVisualStyle | null = null;
  if (params.clientId) {
    instagramStyle = await loadCachedStyle(params.clientId, 'instagram');
    // Auto-analyze if expired and we have tenantId
    if (!instagramStyle && params.tenantId) {
      instagramStyle = await analyzeClientVisualStyle(params.tenantId, params.clientId).catch(() => null);
    }
  }

  const boldness = params.boldness ?? 0.5;
  const boldnessLabel = boldness <= 0.3 ? 'CONSERVADOR — mantenha fiel ao estilo atual do cliente'
    : boldness <= 0.7 ? 'EQUILIBRADO — respeite a identidade mas traga frescor'
    : 'ARROJADO — proponha evolução visual, referências de tendência, ouse mais';

  const instagramBlock = instagramStyle ? `
ANÁLISE VISUAL DO INSTAGRAM (estilo atual real do cliente):
${instagramStyle.style_summary}
- Cores dominantes nos posts: ${instagramStyle.dominant_colors?.join(', ') ?? 'não analisado'}
- Estilo fotográfico: ${instagramStyle.photo_style ?? 'variado'}
- Composição habitual: ${instagramStyle.composition ?? 'variada'}
- Mood visual: ${instagramStyle.mood ?? 'variado'}
- Harmonia de cores: ${instagramStyle.color_harmony ?? 'variada'}` : '';

  const campaignBlock = params.campaignConcept ? `
CONCEITO DA CAMPANHA: ${params.campaignConcept}
${params.pieceIndex != null ? `PEÇA ${params.pieceIndex + 1} DE ${params.totalPieces ?? '?'} — varie a composição entre peças, mantenha coesão visual` : ''}` : '';

  const prompt = `Você é um especialista em identidade visual de marcas.
Analise os dados do cliente abaixo e extraia as regras de direção de arte em um JSON rigoroso.

NÍVEL DE OUSADIA: ${(boldness * 10).toFixed(0)}/10 — ${boldnessLabel}

DADOS DO CLIENTE:
- Segmento: ${profile.segment ?? 'não informado'}
- Cores da marca: ${JSON.stringify(vi.colors ?? profile.brand_colors ?? [])}
- Tipografia: ${vi.typography ?? 'não informada'}
- Estilo visual configurado: ${vi.imageStyle ?? vi.style ?? 'não informado'}
- Palavras de humor/mood: ${JSON.stringify(vi.moodWords ?? [])}
- Elementos a evitar: ${JSON.stringify(vi.avoidElements ?? bv.donts ?? [])}
- LoRA treinado: ${profile.fal_lora_id ?? 'não disponível'}
- Personalidade da marca: ${bv.personality ?? 'não informada'}
${instagramBlock}${campaignBlock}

Retorne SOMENTE este JSON (sem markdown):
{
  "primaryColor": "<hex da cor primária>",
  "styleKeywords": ["<ex: hiper-realista>", "<ex: luminoso>", "<ex: premium>"],
  "moodKeywords": ["<ex: aspiracional>", "<ex: dinâmico>"],
  "avoidElements": ["<ex: logos concorrentes>", "<ex: estilo vintage>"],
  "referenceStyle": "<ex: hiper-realismo fotográfico | flat design minimalista | ilustração editorial>",
  "typography": "<ex: san-serif bold | serif elegante | handwriting>"
}`;

  try {
    const res = await generateCompletion({ prompt, maxTokens: 400, temperature: 0.1 });
    const raw = res.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      loraId:    profile.fal_lora_id ?? null,
      loraScale: profile.fal_lora_scale ?? 0.85,
    };
  } catch {
    return {
      primaryColor: vi.colors?.[0] ?? '#E85219',
      styleKeywords: vi.moodWords ?? ['profissional', 'moderno'],
      moodKeywords: ['aspiracional'],
      avoidElements: bv.donts ?? [],
      loraId: profile.fal_lora_id ?? null,
      loraScale: profile.fal_lora_scale ?? 0.85,
      referenceStyle: vi.imageStyle ?? 'fotografia de produto profissional',
      typography: vi.typography ?? 'sans-serif bold',
    };
  }
}

// ─── Plugin 2 — Prompt Brain (Visual Engineering) ───────────────────────────

async function plugin2PromptBrain(
  params: AgentDAParams,
  brandVisual: BrandVisualContext,
  promptRefinements?: string,
  skillBlock?: string,
): Promise<FalApiPayload> {
  const hasLora = !!brandVisual.loraId;
  const model: FalModel = hasLora ? 'flux-lora' : 'flux-pro';

  const daDirectives: string[] = [];
  if (params.camera && params.camera !== 'auto')      daDirectives.push(`câmera: ${params.camera}`);
  if (params.lighting && params.lighting !== 'auto')  daDirectives.push(`iluminação: ${params.lighting}`);
  if (params.composition && params.composition !== 'auto') daDirectives.push(`composição: ${params.composition}`);

  const triggerVisualMap: Record<string, string> = {
    G01: 'urgência visual, relógio ou contador, vermelho',
    G02: 'autoridade visual, contexto profissional, branco e azul',
    G03: 'multidão, depoimentos, rostos humanos sorridentes',
    G04: 'presente, presente sendo dado, gesto generoso',
    G05: 'mistério, detalhe parcialmente revelado, luz focalizada',
    G06: 'grupo de pessoas similares, comunidade, pertencimento',
    G07: 'contraste antes/depois, dor vs solução, transformação',
  };

  const skillSection = skillBlock ? `\n${skillBlock}\n` : '';

  const prompt = `Você é o melhor Diretor de Arte do mundo, especializado em criação de prompts para IA generativa de imagens.
Você domina composição visual, psicologia das cores, hierarquia de Gestalt, storytelling visual e direção criativa para todas as plataformas.
Sua tarefa é engenheirar o prompt PERFEITO para o Fal.ai ${model} baseado no briefing abaixo.
${skillSection}

CONTEXTO DO CRIATIVO:
- Copy aprovada: ${params.copy?.slice(0, 300) ?? 'não informada'}
- Plataforma: ${params.platform ?? 'Instagram'} / Formato: ${params.format ?? 'Feed'}
- Gatilho psicológico: ${triggerVisualMap[params.trigger ?? ''] ?? 'não especificado'}
- Briefing: ${params.briefing?.title ?? 'não informado'}

IDENTIDADE VISUAL DA MARCA:
- Cor primária: ${brandVisual.primaryColor}
- Estilo: ${brandVisual.referenceStyle}
- Keywords de estilo: ${brandVisual.styleKeywords.join(', ')}
- Mood: ${brandVisual.moodKeywords.join(', ')}
- EVITAR: ${brandVisual.avoidElements.join(', ')}
- Tipografia: ${brandVisual.typography}

DIREÇÃO DE ARTE:
${daDirectives.length ? daDirectives.join('\n') : '(automática — IA decide)'}

${hasLora ? `LoRA da marca: DISPONÍVEL (ID: ${brandVisual.loraId}) — USE o modelo flux-lora` : 'LoRA: não disponível — use flux-pro'}

${params.visualReferences && params.visualReferences.length > 0
  ? `REFERÊNCIAS VISUAIS SELECIONADAS PELO CLIENTE (inspire-se no estilo destas imagens):\n${params.visualReferences.slice(0, 4).map((u, i) => `${i + 1}. ${u}`).join('\n')}`
  : ''}
${promptRefinements ? `REFINAMENTOS DO CRITIQUE LOOP (corrija estes pontos):\n${promptRefinements}` : ''}
${params.spatialDirective ? `DIRETIVA ESPACIAL PARA LAYOUT (a imagem será composta com texto sobreposto):
${params.spatialDirective}
IMPORTANTE: Gere a imagem respeitando esta diretiva — deixe espaço limpo nas áreas indicadas para texto.` : ''}

Regras para o prompt:
1. Seja ESPECÍFICO sobre sujeito, ambiente, iluminação, câmera
2. Use terminologia fotográfica/cinematográfica profissional
3. Inclua a cor primária da marca (${brandVisual.primaryColor}) de forma natural no ambiente ou produto
4. NÃO use texto ou palavras na imagem (texto vem da legenda)
5. Máximo 250 tokens no prompt positivo

Retorne SOMENTE este JSON (sem markdown):
{
  "concept": "<conceito visual em 1 frase>",
  "prompt": "<prompt positivo otimizado para Fal.ai, em inglês>",
  "negativePrompt": "<negative prompt: text, watermark, logo, blurry, distorted, ugly, deformed>",
  "model": "${model}",
  "aspectRatio": "${params.aspectRatio ?? '1:1'}",
  "guidanceScale": <3.0–7.0>,
  "numInferenceSteps": <20–35>
}`;

  try {
    const res = await generateCompletion({ prompt, maxTokens: 700, temperature: 0.3 });
    const raw = res.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(raw);

    const loras: FalLoraConfig[] = brandVisual.loraId
      ? [{ path: brandVisual.loraId, scale: brandVisual.loraScale, name: 'brand-lora' }]
      : [];

    return { ...parsed, loras };
  } catch {
    const loras: FalLoraConfig[] = brandVisual.loraId
      ? [{ path: brandVisual.loraId, scale: brandVisual.loraScale }]
      : [];
    return {
      concept: 'Composição clean de produto em ambiente profissional',
      prompt: `${brandVisual.referenceStyle}, ${brandVisual.styleKeywords.join(', ')}, ${brandVisual.moodKeywords.join(', ')}, high quality, 4k`,
      negativePrompt: 'text, watermark, logo, blurry, distorted, ugly, deformed, low quality',
      model,
      aspectRatio: params.aspectRatio ?? '1:1',
      guidanceScale: 3.5,
      numInferenceSteps: 28,
      loras,
    };
  }
}

// ─── Plugin 3 — Rendering ─────────────────────────────────────────────────────

async function plugin3Render(payload: FalApiPayload): Promise<{ imageUrl: string; imageUrls: string[]; seed?: number }> {
  const result = await generateImageWithFal({
    prompt:              payload.prompt,
    negativePrompt:      payload.negativePrompt,
    aspectRatio:         payload.aspectRatio,
    numImages:           3,
    guidanceScale:       payload.guidanceScale,
    numInferenceSteps:   payload.numInferenceSteps,
    model:               payload.model,
    loras:               payload.loras.length ? payload.loras : undefined,
  });
  return { imageUrl: result.imageUrl, imageUrls: result.imageUrls, seed: result.seed };
}

// ─── Plugin 4 — Visual Critique (Vision LLM) ─────────────────────────────────

async function plugin4Critique(
  imageUrl: string,
  copy: string | null | undefined,
  params: AgentDAParams,
  brandVisual: BrandVisualContext,
): Promise<VisualCritique> {
  const prompt = `Você é um Diretor de Arte sênior com olhar crítico apurado.
Avalie a imagem gerada contra o briefing e as regras visuais da marca.

IMAGEM GERADA: ${imageUrl}

CONTEXTO:
- Copy: ${copy?.slice(0, 200) ?? 'não informada'}
- Plataforma: ${params.platform ?? 'Instagram'}
- Gatilho: ${params.trigger ?? 'nenhum'}
- Briefing: ${params.briefing?.title ?? 'não informado'}

REGRAS DA MARCA:
- Estilo esperado: ${brandVisual.referenceStyle}
- Mood: ${brandVisual.moodKeywords.join(', ')}
- EVITAR: ${brandVisual.avoidElements.join(', ')}

Avalie 4 dimensões (0–100 cada):
1. Qualidade de Renderização (artefatos, nitidez, realismo)
2. Consistência de Marca (cores, estilo, mood)
3. Hierarquia Visual (elemento principal em destaque, composição)
4. Coerência Copy↔Imagem (imagem reforça a mensagem da copy)

Limiar de aprovação: 72/100.

Retorne SOMENTE este JSON (sem markdown):
{
  "pass": <true se overall ≥ 72>,
  "score": <média das 4 dimensões>,
  "dimensions": [
    { "label": "Qualidade de Renderização", "score": <0-100>, "note": "<problema se <72>" },
    { "label": "Consistência de Marca",     "score": <0-100>, "note": "<problema se <72>" },
    { "label": "Hierarquia Visual",         "score": <0-100>, "note": "<problema se <72>" },
    { "label": "Coerência Copy↔Imagem",     "score": <0-100>, "note": "<problema se <72>" }
  ],
  "issues": ["<problema 1>", "<problema 2>"],
  "promptRefinements": "<instrução específica de como REESCREVER o prompt para corrigir os problemas>"
}`;

  try {
    const res = await generateCompletion({ prompt, maxTokens: 600, temperature: 0.1 });
    const raw = res.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(raw) as VisualCritique;
  } catch {
    return {
      pass: true,
      score: 70,
      dimensions: [
        { label: 'Qualidade de Renderização', score: 70 },
        { label: 'Consistência de Marca',     score: 70 },
        { label: 'Hierarquia Visual',         score: 70 },
        { label: 'Coerência Copy↔Imagem',     score: 70 },
      ],
      issues: ['Critique endpoint indisponível — estimativa heurística'],
      promptRefinements: '',
    };
  }
}

// ─── Plugin 6 — Multi-Format ─────────────────────────────────────────────────

const MULTI_FORMAT_SIZES: Array<{ format: string; aspectRatio: string }> = [
  { format: 'Story 9:16',     aspectRatio: '9:16' },
  { format: 'Feed 1:1',       aspectRatio: '1:1'  },
  { format: 'Portrait 4:5',   aspectRatio: '4:5'  },
  { format: 'LinkedIn 4:3',   aspectRatio: '4:3'  },
  { format: 'Banner 16:9',    aspectRatio: '16:9' },
];

async function plugin6MultiFormat(
  payload: FalApiPayload,
  excludeAspectRatio: string,
  brandPack?: boolean,
): Promise<MultiFormatResult[]> {
  const targets = brandPack
    ? MULTI_FORMAT_SIZES
    : MULTI_FORMAT_SIZES.filter((f) => f.aspectRatio !== excludeAspectRatio).slice(0, 3);
  const results = await Promise.allSettled(
    targets.map(async (target) => {
      const res = await generateImageWithFal({
        prompt:            payload.prompt,
        negativePrompt:    payload.negativePrompt,
        aspectRatio:       target.aspectRatio,
        numImages:         1,
        guidanceScale:     payload.guidanceScale,
        numInferenceSteps: Math.min(payload.numInferenceSteps, 20), // faster for multi-format
        model:             payload.model,
        loras:             payload.loras.length ? payload.loras : undefined,
      });
      return { format: target.format, aspectRatio: target.aspectRatio, imageUrl: res.imageUrl };
    })
  );
  return results
    .filter((r): r is PromiseFulfilledResult<MultiFormatResult> => r.status === 'fulfilled')
    .map((r) => r.value);
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

const MAX_CRITIQUE_RETRIES = 2;

export async function runAgentDiretorArte(params: AgentDAParams): Promise<AgentDiretorArteResult> {
  const timings: Record<string, number> = {};
  const t = <T>(key: string, fn: () => Promise<T>) => {
    const start = Date.now();
    return fn().then((v) => { timings[key] = Date.now() - start; return v; });
  };

  // Skill Graph — load relevant visual craft knowledge before P2 Prompt Brain
  let daSkillBlock = '';
  try {
    const profile = params.clientProfile ?? {};
    const briefingText = [params.briefing?.title, params.campaignConcept].filter(Boolean).join(' ');
    const calendarEventType = detectCalendarEventType(briefingText) ?? undefined;
    const sectorKeywords = detectSectorKeywords(profile);

    daSkillBlock = await getRelevantSkills({
      platform: params.platform ?? undefined,
      format: params.format ?? undefined,
      trigger: params.trigger ?? undefined,
      calendarEventType,
      sectorKeywords,
      objective: briefingText,
      agentType: 'art',
    });
  } catch {
    // Graceful degradation
  }

  // P1 — Brand Visual RAG (merge with override if provided)
  let brandVisual = await t('p1_brand_rag', () => plugin1BrandVisualRag(params));
  if (params.brandVisualOverride) brandVisual = { ...brandVisual, ...params.brandVisualOverride };

  // P2 → P3 → P4 loop (with retry on critique fail)
  let payload!: FalApiPayload;
  let renderResult!: { imageUrl: string; imageUrls: string[]; seed?: number };
  let critique!: VisualCritique;
  let attempts = 0;
  let promptRefinements: string | undefined;

  while (attempts <= MAX_CRITIQUE_RETRIES) {
    // P2 — Prompt Brain (with skill graph injected)
    payload = await t(`p2_prompt_brain_${attempts}`, () =>
      plugin2PromptBrain(params, brandVisual, promptRefinements, daSkillBlock)
    );
    if (params.payloadOverride) payload = { ...payload, ...params.payloadOverride };

    // P3 — Render
    renderResult = await t(`p3_render_${attempts}`, () => plugin3Render(payload));

    // P4 — Critique
    critique = await t(`p4_critique_${attempts}`, () =>
      plugin4Critique(renderResult.imageUrl, params.copy, params, brandVisual)
    );

    if (critique.pass || attempts >= MAX_CRITIQUE_RETRIES) break;

    // P5 — Critique loop: inject refinements and retry
    promptRefinements = critique.promptRefinements;
    attempts++;
  }

  // P6 — Multi-format (optional, non-blocking)
  let multiFormat: MultiFormatResult[] | undefined;
  if (params.generateMultiFormat || params.brandPack) {
    multiFormat = await t('p6_multi_format', () =>
      plugin6MultiFormat(payload, payload.aspectRatio, params.brandPack)
    );
  }

  return {
    brandVisual,
    payload,
    imageUrl:  renderResult.imageUrl,
    imageUrls: renderResult.imageUrls,
    seed:      renderResult.seed,
    critique,
    attempts,
    multiFormat,
    pluginTimings: timings,
  };
}
