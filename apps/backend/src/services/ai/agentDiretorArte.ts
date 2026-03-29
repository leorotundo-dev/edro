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

import { generateCompletion, generateCompletionWithVision } from './claudeService';
import { generateCompletionWithVision as geminiVision } from './geminiService';
import { generateImageWithFal, type FalModel, type FalLoraConfig } from './falAiService';
import { loadCachedStyle, analyzeClientVisualStyle, type ClientVisualStyle } from '../visualStyleAnalyzer';
import {
  buildArtDirectionCritiqueBlock,
  buildArtDirectionKnowledgeBlock,
  resolveArtDirectionKnowledge,
} from './artDirectionKnowledge';
import { buildArtDirectionMemoryContext } from './artDirectionMemoryService';

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
  referenceMovements: string[];
  designPrinciples: string[];
  layoutHeuristics: string[];
  accessibilityRules: string[];
  critiqueFocus: string[];
  strategySummary: string;
  trendSignals: string[];
  referenceExamples: Array<{ title: string; sourceUrl: string }>;
  externalKnowledgeSummary: string;
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
  recommendations?: string[];
  summary?: string;
};

export type MultiFormatResult = {
  format: string;
  aspectRatio: string;
  imageUrl: string;
};

export type CopyImageAlignment = {
  alignment_score: number;          // 0–100: sinergia copy↔imagem
  relationship: 'complementar' | 'reforco' | 'duplicacao' | 'contradicao';
  issues: string[];
  copy_adjustment?: string;         // sugestão de copy ajustada quando score < 50
  summary: string;
};

export type AgentDiretorArteResult = {
  brandVisual: BrandVisualContext;
  payload: FalApiPayload;
  imageUrl: string;
  imageUrls: string[];
  seed?: number;
  critique: VisualCritique;
  copyAlignment?: CopyImageAlignment;  // P4b — alinhamento Gemini copy↔imagem
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
  onProgress?: (event: string, data: object) => void;
};

// ─── Plugin 1 — Brand Visual RAG ─────────────────────────────────────────────

async function plugin1BrandVisualRag(params: AgentDAParams): Promise<BrandVisualContext> {
  const profile = params.clientProfile ?? {};
  const vi = profile.visual_identity ?? profile.brand_tokens ?? {};
  const bv = profile.brand_voice ?? {};
  const knowledge = resolveArtDirectionKnowledge({
    copy: params.copy,
    platform: params.platform,
    format: params.format,
    trigger: params.trigger,
    briefing: params.briefing,
    brandTokens: vi,
    segment: profile.segment,
  });

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
  const memory = await buildArtDirectionMemoryContext({
    tenantId: params.tenantId,
    clientId: params.clientId,
    platform: params.platform,
    segment: profile.segment,
    conceptLimit: 4,
    referenceLimit: 4,
    trendLimit: 4,
  });
  const externalKnowledgeSummary = memory.promptBlock || '';

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
${buildArtDirectionKnowledgeBlock(knowledge)}
${externalKnowledgeSummary ? `\nMEMÓRIA EXTERNA DE DIREÇÃO DE ARTE:\n${externalKnowledgeSummary}\n` : ''}

Retorne SOMENTE este JSON (sem markdown):
{
  "primaryColor": "<hex da cor primária>",
  "styleKeywords": ["<ex: hiper-realista>", "<ex: luminoso>", "<ex: premium>"],
  "moodKeywords": ["<ex: aspiracional>", "<ex: dinâmico>"],
  "avoidElements": ["<ex: logos concorrentes>", "<ex: estilo vintage>"],
  "referenceStyle": "<ex: hiper-realismo fotográfico | flat design minimalista | ilustração editorial>",
  "typography": "<ex: san-serif bold | serif elegante | handwriting>",
  "referenceMovements": ["<ex: Design Suíço>", "<ex: editorial premium>"],
  "designPrinciples": ["<ex: hierarquia explícita>", "<ex: contraste alto>"],
  "layoutHeuristics": ["<ex: headline curta no terço inferior>", "<ex: proteger safe zones>"],
  "accessibilityRules": ["<ex: contraste AA>", "<ex: evitar fundo poluído atrás do texto>"],
  "critiqueFocus": ["<ex: legibilidade>", "<ex: aderência à marca>"],
  "strategySummary": "<resuma em 1 frase como a copy deve virar direção de arte>"
}`;

  try {
    const res = await generateCompletion({ prompt, maxTokens: 400, temperature: 0.1 });
    const raw = res.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(raw) as Partial<BrandVisualContext>;
    return {
      primaryColor: parsed.primaryColor || vi.colors?.[0] || '#E85219',
      styleKeywords: Array.isArray(parsed.styleKeywords) && parsed.styleKeywords.length ? parsed.styleKeywords : (vi.moodWords ?? ['profissional', 'moderno']),
      moodKeywords: Array.isArray(parsed.moodKeywords) && parsed.moodKeywords.length ? parsed.moodKeywords : ['aspiracional'],
      avoidElements: Array.isArray(parsed.avoidElements) ? parsed.avoidElements : (bv.donts ?? []),
      loraId:    profile.fal_lora_id ?? null,
      loraScale: profile.fal_lora_scale ?? 0.85,
      referenceStyle: parsed.referenceStyle || vi.imageStyle || vi.style || 'fotografia de produto profissional',
      typography: parsed.typography || vi.typography || 'sans-serif bold',
      referenceMovements: Array.isArray(parsed.referenceMovements) && parsed.referenceMovements.length ? parsed.referenceMovements : knowledge.referenceMovements,
      designPrinciples: Array.isArray(parsed.designPrinciples) && parsed.designPrinciples.length ? parsed.designPrinciples : knowledge.designPrinciples,
      layoutHeuristics: Array.isArray(parsed.layoutHeuristics) && parsed.layoutHeuristics.length ? parsed.layoutHeuristics : knowledge.layoutHeuristics,
      accessibilityRules: Array.isArray(parsed.accessibilityRules) && parsed.accessibilityRules.length ? parsed.accessibilityRules : knowledge.accessibilityRules,
      critiqueFocus: Array.isArray(parsed.critiqueFocus) && parsed.critiqueFocus.length ? parsed.critiqueFocus : knowledge.critiqueFocus,
      strategySummary: parsed.strategySummary || knowledge.strategySummary,
      trendSignals: memory.trends.map((item) => item.tag),
      referenceExamples: memory.references.map((item) => ({ title: item.title, sourceUrl: item.source_url })),
      externalKnowledgeSummary,
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
      referenceMovements: knowledge.referenceMovements,
      designPrinciples: knowledge.designPrinciples,
      layoutHeuristics: knowledge.layoutHeuristics,
      accessibilityRules: knowledge.accessibilityRules,
      critiqueFocus: knowledge.critiqueFocus,
      strategySummary: knowledge.strategySummary,
      trendSignals: memory.trends.map((item) => item.tag),
      referenceExamples: memory.references.map((item) => ({ title: item.title, sourceUrl: item.source_url })),
      externalKnowledgeSummary,
    };
  }
}

// ─── Plugin 2 — Prompt Brain (Visual Engineering) ───────────────────────────

async function plugin2PromptBrain(
  params: AgentDAParams,
  brandVisual: BrandVisualContext,
  promptRefinements?: string,
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

  const prompt = `Você é um Diretor de Arte de alta performance especializado em criação de prompts para IA generativa de imagens.
Sua tarefa é engenheirar o prompt PERFEITO para o Fal.ai ${model} baseado no briefing abaixo.

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
- Repertório de referência: ${brandVisual.referenceMovements.join(', ')}
- Princípios obrigatórios: ${brandVisual.designPrinciples.join('; ')}
- Heurísticas de layout: ${brandVisual.layoutHeuristics.join('; ')}
- Regras de acessibilidade: ${brandVisual.accessibilityRules.join('; ')}
- Estratégia resumida: ${brandVisual.strategySummary}
${brandVisual.externalKnowledgeSummary ? `- Memória externa consolidada:\n${brandVisual.externalKnowledgeSummary}` : ''}
${brandVisual.trendSignals.length ? `- Tendências monitoradas: ${brandVisual.trendSignals.join(', ')}` : ''}
${brandVisual.referenceExamples.length ? `- Referências observadas: ${brandVisual.referenceExamples.map((item) => item.title).slice(0, 4).join(' | ')}` : ''}

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
6. Preserve áreas limpas e legíveis para overlay respeitando as heurísticas de layout
7. Traduza a copy em composição visual coerente com a estratégia resumida e o repertório de referência
8. Evite fundos caóticos nas áreas de texto e respeite as regras de acessibilidade

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
      prompt: `${brandVisual.referenceStyle}, ${brandVisual.styleKeywords.join(', ')}, ${brandVisual.moodKeywords.join(', ')}, ${brandVisual.strategySummary}, high quality, 4k`,
      negativePrompt: 'text, watermark, logo, blurry, distorted, ugly, deformed, low quality, busy lower third, low contrast text zone',
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
  const memory = await buildArtDirectionMemoryContext({
    tenantId: params.tenantId,
    clientId: params.clientId,
    platform: params.platform,
    segment: params.clientProfile?.segment,
    conceptLimit: 4,
    referenceLimit: 4,
    trendLimit: 4,
  });
  const critiqueFramework = buildArtDirectionCritiqueBlock(resolveArtDirectionKnowledge({
    copy,
    platform: params.platform,
    format: params.format,
    trigger: params.trigger,
    briefing: params.briefing,
    brandTokens: params.clientProfile?.visual_identity ?? params.clientProfile?.brand_tokens ?? {},
    segment: params.clientProfile?.segment,
  }));
  const prompt = `Você é um Diretor de Arte sênior com olhar crítico apurado.
Avalie a imagem gerada contra o briefing e as regras visuais da marca.

CONTEXTO:
- Copy: ${copy?.slice(0, 200) ?? 'não informada'}
- Plataforma: ${params.platform ?? 'Instagram'}
- Gatilho: ${params.trigger ?? 'nenhum'}
- Briefing: ${params.briefing?.title ?? 'não informado'}

REGRAS DA MARCA:
- Estilo esperado: ${brandVisual.referenceStyle}
- Mood: ${brandVisual.moodKeywords.join(', ')}
- EVITAR: ${brandVisual.avoidElements.join(', ')}
- Princípios: ${brandVisual.designPrinciples.join('; ')}
- Heurísticas de layout: ${brandVisual.layoutHeuristics.join('; ')}
- Regras de acessibilidade: ${brandVisual.accessibilityRules.join('; ')}
${memory.critiqueBlock ? `\nMEMÓRIA EXTERNA DE CRÍTICA:\n${memory.critiqueBlock}\n` : ''}

${critiqueFramework}

Avalie 6 dimensões (0–100 cada):
1. Qualidade de Renderização (artefatos, nitidez, realismo)
2. Consistência de Marca (cores, estilo, mood)
3. Hierarquia Visual (elemento principal em destaque, composição)
4. Coerência Copy↔Imagem (imagem reforça a mensagem da copy)
5. Acessibilidade e Legibilidade (área útil para overlay, contraste, ruído)
6. Adequação ao Canal/Formato (a peça funciona para a mídia e proporção informadas)

Limiar de aprovação: 75/100.

Retorne SOMENTE este JSON (sem markdown):
{
  "pass": <true se overall ≥ 75>,
  "score": <média das 6 dimensões>,
  "dimensions": [
    { "label": "Qualidade de Renderização", "score": <0-100>, "note": "<problema se <72>" },
    { "label": "Consistência de Marca",     "score": <0-100>, "note": "<problema se <72>" },
    { "label": "Hierarquia Visual",         "score": <0-100>, "note": "<problema se <72>" },
    { "label": "Coerência Copy↔Imagem",     "score": <0-100>, "note": "<problema se <72>" },
    { "label": "Acessibilidade e Legibilidade", "score": <0-100>, "note": "<problema se <72>" },
    { "label": "Adequação ao Canal/Formato", "score": <0-100>, "note": "<problema se <72>" }
  ],
  "issues": ["<problema 1>", "<problema 2>"],
  "recommendations": ["<ação 1>", "<ação 2>"],
  "summary": "<resuma em 1 frase o julgamento de direção de arte>",
  "promptRefinements": "<instrução específica de como REESCREVER o prompt para corrigir os problemas>"
}`;

  try {
    const res = await generateCompletionWithVision({ prompt, imageUrl, maxTokens: 700, temperature: 0.1 });
    const raw = res.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(raw) as Partial<VisualCritique>;
    return {
      pass: Boolean(parsed.pass),
      score: typeof parsed.score === 'number' ? Math.max(0, Math.min(100, parsed.score)) : 70,
      dimensions: Array.isArray(parsed.dimensions) ? parsed.dimensions : [],
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      promptRefinements: typeof parsed.promptRefinements === 'string' ? parsed.promptRefinements : '',
    };
  } catch {
    return {
      pass: true,
      score: 70,
      dimensions: [
        { label: 'Qualidade de Renderização', score: 70 },
        { label: 'Consistência de Marca',     score: 70 },
        { label: 'Hierarquia Visual',         score: 70 },
        { label: 'Coerência Copy↔Imagem',     score: 70 },
        { label: 'Acessibilidade e Legibilidade', score: 70 },
        { label: 'Adequação ao Canal/Formato', score: 70 },
      ],
      issues: ['Critique endpoint indisponível — estimativa heurística'],
      recommendations: [],
      summary: '',
      promptRefinements: '',
    };
  }
}

// ─── Plugin 4b — Copy↔Image Alignment (Gemini Vision) ───────────────────────
//
// Roda na imagem FINAL aprovada (fora do loop de retries).
// Usa Gemini Flash Vision para calcular alignment_score entre copy e imagem.
// Se score < 50, sugere ajuste na copy para maior sinergia.

async function plugin4bCopyImageAlignment(
  imageUrl: string,
  copy: string | null | undefined,
): Promise<CopyImageAlignment> {
  if (!copy?.trim()) {
    return { alignment_score: 80, relationship: 'complementar', issues: [], summary: 'Sem copy para análise.' };
  }

  const prompt = `Você é um Diretor de Criação avaliando o alinhamento entre copy e imagem gerada por IA.

COPY:
"${copy.slice(0, 500)}"

AVALIE:
1. alignment_score: 0-100 (100 = sinergia perfeita, 0 = contradição total)
2. relationship:
   - complementar: imagem acrescenta visualmente ao que a copy diz (ideal)
   - reforco: imagem repete visualmente a copy, sem acrescentar (ok)
   - duplicacao: redundante, sem valor adicional (fraco)
   - contradicao: imagem contradiz ou confunde o texto (ruim)
3. issues: lista de problemas concretos (array de strings)
4. copy_adjustment: SE score < 50, sugira uma versão ajustada da copy que funcione melhor com esta imagem (string) — senão, omita o campo
5. summary: julgamento em 1 frase

Responda SOMENTE com JSON sem markdown:
{
  "alignment_score": <0-100>,
  "relationship": "<complementar|reforco|duplicacao|contradicao>",
  "issues": ["<problema>"],
  "copy_adjustment": "<ajuste opcional>",
  "summary": "<julgamento>"
}`;

  try {
    const res = await geminiVision({ prompt, imageUrl, temperature: 0.1, maxTokens: 400 });
    const jsonMatch = res.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('no json');
    const parsed = JSON.parse(jsonMatch[0]) as Partial<CopyImageAlignment>;
    const validRelationships: Array<CopyImageAlignment['relationship']> = ['complementar', 'reforco', 'duplicacao', 'contradicao'];
    return {
      alignment_score: typeof parsed.alignment_score === 'number' ? Math.max(0, Math.min(100, parsed.alignment_score)) : 75,
      relationship: validRelationships.includes(parsed.relationship as any) ? parsed.relationship as CopyImageAlignment['relationship'] : 'complementar',
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      copy_adjustment: typeof parsed.copy_adjustment === 'string' && parsed.copy_adjustment.length > 0 ? parsed.copy_adjustment : undefined,
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    };
  } catch {
    return { alignment_score: 75, relationship: 'complementar', issues: [], summary: 'Análise de alinhamento indisponível.' };
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

  // P1 — Brand Visual RAG (merge with override if provided)
  let brandVisual = await t('p1_brand_rag', () => plugin1BrandVisualRag(params));
  if (params.brandVisualOverride) brandVisual = { ...brandVisual, ...params.brandVisualOverride };
  params.onProgress?.('p1_done', { loraId: brandVisual.loraId, refsCount: brandVisual.referenceExamples.length });

  // P2 → P3 → P4 loop (with retry on critique fail)
  let payload!: FalApiPayload;
  let renderResult!: { imageUrl: string; imageUrls: string[]; seed?: number };
  let critique!: VisualCritique;
  let attempts = 0;
  let promptRefinements: string | undefined;

  while (attempts <= MAX_CRITIQUE_RETRIES) {
    // P2 — Prompt Brain
    payload = await t(`p2_prompt_brain_${attempts}`, () =>
      plugin2PromptBrain(params, brandVisual, promptRefinements)
    );
    if (params.payloadOverride) payload = { ...payload, ...params.payloadOverride };
    params.onProgress?.('p2_done', { promptSnippet: payload.prompt.slice(0, 60) });

    // P3 — Render
    renderResult = await t(`p3_render_${attempts}`, () => plugin3Render(payload));
    params.onProgress?.('p3_done', { imageUrl: renderResult.imageUrl, attemptNum: attempts });

    // P4 — Critique
    critique = await t(`p4_critique_${attempts}`, () =>
      plugin4Critique(renderResult.imageUrl, params.copy, params, brandVisual)
    );
    params.onProgress?.('p4_done', { score: critique.score, pass: critique.pass });

    if (critique.pass || attempts >= MAX_CRITIQUE_RETRIES) break;

    // P5 — Critique loop: inject refinements and retry
    promptRefinements = critique.promptRefinements;
    attempts++;
  }

  // P4b + P6 — run in parallel (both are post-loop, independent)
  const [copyAlignment, multiFormat] = await Promise.all([
    t('p4b_copy_alignment', () =>
      plugin4bCopyImageAlignment(renderResult.imageUrl, params.copy).then((r) => {
        if (r) params.onProgress?.('p4b_done', { alignmentScore: r.alignment_score });
        return r;
      })
    ),
    params.generateMultiFormat || params.brandPack
      ? t('p6_multi_format', () =>
          plugin6MultiFormat(payload, payload.aspectRatio, params.brandPack).then((r) => {
            if (r?.length) params.onProgress?.('p6_done', { formatCount: r.length });
            return r;
          })
        )
      : Promise.resolve(undefined),
  ]);

  return {
    brandVisual,
    payload,
    imageUrl:  renderResult.imageUrl,
    imageUrls: renderResult.imageUrls,
    seed:      renderResult.seed,
    critique,
    copyAlignment,
    attempts,
    multiFormat,
    pluginTimings: timings,
  };
}
