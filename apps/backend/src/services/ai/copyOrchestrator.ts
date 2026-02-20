import { env } from '../../env';
import { OpenAIService } from './openaiService';
import { GeminiService } from './geminiService';
import { ClaudeService } from './claudeService';
import type { AiCompletionResult } from './claudeService';
import { logAiUsage } from './aiUsageLogger';

export type CopyProvider = 'openai' | 'gemini' | 'claude';

export type CopyTier = 'fast' | 'creative' | 'premium';

export type TaskType =
  | 'briefing_analysis'
  | 'social_post'
  | 'variations'
  | 'validation'
  | 'headlines'
  | 'institutional_copy'
  | 'campaign_strategy'
  | 'final_review'
  | 'collaborative_analysis'
  | 'collaborative_review';

type CompletionParams = {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
};

type OrchestrationResult = {
  output: string;
  provider: CopyProvider;
  model: string;
  tier: CopyTier;
  taskType: TaskType;
};

const TASK_ROUTING: Record<TaskType, { provider: CopyProvider; tier: CopyTier }> = {
  // Camada 1: FAST (Gemini Flash) - barato e rápido
  briefing_analysis: { provider: 'gemini', tier: 'fast' },
  validation: { provider: 'gemini', tier: 'fast' },

  // Camada 2: CREATIVE (GPT-4o mini) - bom custo-benefício, criativo
  social_post: { provider: 'openai', tier: 'creative' },
  variations: { provider: 'openai', tier: 'creative' },
  headlines: { provider: 'openai', tier: 'creative' },

  // Camada 3: PREMIUM (Claude Sonnet) - alta qualidade
  institutional_copy: { provider: 'claude', tier: 'premium' },
  campaign_strategy: { provider: 'claude', tier: 'premium' },
  final_review: { provider: 'claude', tier: 'premium' },

  // Camada 4: COLLABORATIVE — roles fixos por provider
  collaborative_analysis: { provider: 'gemini', tier: 'fast' },
  collaborative_review: { provider: 'claude', tier: 'premium' },
};

const PROVIDER_MODELS: Record<CopyProvider, string> = {
  openai: env.OPENAI_MODEL,
  gemini: env.GEMINI_MODEL || 'gemini-1.5-flash',
  claude: env.ANTHROPIC_MODEL,
};

function getAvailableProviders(): CopyProvider[] {
  const available: CopyProvider[] = [];
  if (env.GEMINI_API_KEY) available.push('gemini');
  if (env.OPENAI_API_KEY) available.push('openai');
  if (env.CLAUDE_API_KEY || env.ANTHROPIC_API_KEY) available.push('claude');
  return available;
}

export function getFallbackProvider(preferred: CopyProvider): CopyProvider {
  const available = getAvailableProviders();

  if (available.includes(preferred)) {
    return preferred;
  }

  // Fallback por tier
  const fallbackOrder: Record<CopyTier, CopyProvider[]> = {
    fast: ['gemini', 'openai', 'claude'],
    creative: ['openai', 'claude', 'gemini'],
    premium: ['claude', 'openai', 'gemini'],
  };

  const tier = Object.entries(TASK_ROUTING).find(
    ([_, config]) => config.provider === preferred
  )?.[1].tier || 'creative';

  for (const provider of fallbackOrder[tier]) {
    if (available.includes(provider)) {
      return provider;
    }
  }

  throw new Error('No AI provider available. Configure at least one API key.');
}

async function callProvider(
  provider: CopyProvider,
  params: CompletionParams
): Promise<AiCompletionResult> {
  switch (provider) {
    case 'openai':
      return OpenAIService.generateCompletion(params);
    case 'gemini':
      return GeminiService.generateCompletion(params);
    case 'claude':
      return ClaudeService.generateCompletion(params);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export type UsageContext = { tenant_id: string; feature: string; metadata?: Record<string, any> };

export function fireAndForgetLog(ctx: UsageContext | undefined, provider: string, result: AiCompletionResult, durationMs?: number) {
  if (!ctx) return;
  logAiUsage({
    tenant_id: ctx.tenant_id,
    provider,
    model: result.model,
    feature: ctx.feature,
    input_tokens: result.usage.input_tokens,
    output_tokens: result.usage.output_tokens,
    duration_ms: durationMs,
    metadata: ctx.metadata,
  }).catch(() => {});
}

export async function orchestrate(
  taskType: TaskType,
  params: CompletionParams,
  usageContext?: UsageContext
): Promise<OrchestrationResult> {
  const routing = TASK_ROUTING[taskType];
  const provider = getFallbackProvider(routing.provider);

  const t = Date.now();
  const result = await callProvider(provider, params);
  fireAndForgetLog(usageContext, provider, result, Date.now() - t);

  return {
    output: result.text,
    provider,
    model: `${provider}:${result.model}`,
    tier: routing.tier,
    taskType,
  };
}

export async function generateWithProvider(
  provider: CopyProvider,
  params: CompletionParams,
  usageContext?: UsageContext
): Promise<OrchestrationResult> {
  const actualProvider = getFallbackProvider(provider);

  const t = Date.now();
  const result = await callProvider(actualProvider, params);
  fireAndForgetLog(usageContext, actualProvider, result, Date.now() - t);

  return {
    output: result.text,
    provider: actualProvider,
    model: `${actualProvider}:${result.model}`,
    tier: 'creative',
    taskType: 'social_post',
  };
}

export function getRoutingInfo(): Record<TaskType, { provider: CopyProvider; tier: CopyTier }> {
  return { ...TASK_ROUTING };
}

export function getAvailableProvidersInfo(): {
  available: CopyProvider[];
  configured: Record<CopyProvider, boolean>;
} {
  return {
    available: getAvailableProviders(),
    configured: {
      openai: !!env.OPENAI_API_KEY,
      gemini: !!env.GEMINI_API_KEY,
      claude: !!(env.CLAUDE_API_KEY || env.ANTHROPIC_API_KEY),
    },
  };
}

export type CollaborativeStage = {
  provider: CopyProvider;
  role: 'analyst' | 'creator' | 'editor';
  model: string;
  duration_ms: number;
};

export type QualityScore = {
  brand_dna_match: number;   // 0-10
  platform_fit: number;      // 0-10
  cta_clarity: number;       // 0-10
  message_clarity: number;   // 0-10
  originality: number;       // 0-10
  overall: number;           // média dos 5 critérios
  needs_revision: boolean;   // true se overall < 7.0
  revision_instruction: string;
};

export type CollaborativePipelineResult = {
  output: string;
  model: string;
  stages: CollaborativeStage[];
  analysis_json: Record<string, any> | null;
  creative_raw: string;
  editorial_notes: string;
  total_duration_ms: number;
  quality_score: QualityScore | null;
  cycle_count: number;
};

function safeParseJson(text: string): Record<string, any> | null {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
  } catch {}
  return null;
}

function buildQualityScore(parsed: Record<string, any>): QualityScore {
  const bm = Number(parsed.brand_dna_match ?? 7);
  const pf = Number(parsed.platform_fit ?? 7);
  const cc = Number(parsed.cta_clarity ?? 7);
  const mc = Number(parsed.message_clarity ?? 7);
  const or = Number(parsed.originality ?? 7);
  const overall = (bm + pf + cc + mc + or) / 5;
  return {
    brand_dna_match: bm,
    platform_fit: pf,
    cta_clarity: cc,
    message_clarity: mc,
    originality: or,
    overall: Math.round(overall * 10) / 10,
    needs_revision: overall < 7.0,
    revision_instruction: parsed.revision_instruction ?? '',
  };
}

export async function runCollaborativePipeline(params: {
  analysisPrompt: string;
  creativePrompt: (analysisOutput: string) => string;
  reviewPrompt: (analysisOutput: string, creativeOutput: string) => string;
  temperature?: { analysis?: number; creative?: number; review?: number };
  maxTokens?: { analysis?: number; creative?: number; review?: number };
  usageContext?: UsageContext;
}): Promise<CollaborativePipelineResult> {
  const available = getAvailableProviders();
  if (available.length === 0) {
    throw new Error('No AI provider configured.');
  }

  const stages: CollaborativeStage[] = [];
  const startTotal = Date.now();

  // --- Etapa 1: Analysis (Gemini preferred) ---
  const analystProvider = getFallbackProvider('gemini');
  const t1 = Date.now();
  const analysisResult = await callProvider(analystProvider, {
    prompt: params.analysisPrompt,
    temperature: params.temperature?.analysis ?? 0.3,
    maxTokens: params.maxTokens?.analysis ?? 1200,
  });
  const d1 = Date.now() - t1;
  stages.push({
    provider: analystProvider,
    role: 'analyst',
    model: `${analystProvider}:${analysisResult.model}`,
    duration_ms: d1,
  });
  fireAndForgetLog(params.usageContext, analystProvider, analysisResult, d1);

  const analysisOutput = analysisResult.text;

  let analysisJson: Record<string, any> | null = null;
  try {
    const trimmed = analysisOutput.trim();
    const jsonStart = trimmed.indexOf('{');
    const jsonEnd = trimmed.lastIndexOf('}');
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      analysisJson = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1));
    }
  } catch {
    // Analysis output is text, not JSON — still usable
  }

  // --- Etapa 2 + 3: Creative (OpenAI) → Review (Claude) com quality loop ---
  const creatorProvider = getFallbackProvider('openai');
  const editorProvider = getFallbackProvider('claude');

  const MAX_CYCLES = 2;
  let cycleCount = 0;
  let creativeOutput = '';
  let finalOutput = '';
  let qualityScore: QualityScore | null = null;
  let revisionInstruction = '';

  while (cycleCount <= MAX_CYCLES) {
    // Etapa 2: Creative
    const creativePromptText = cycleCount === 0
      ? params.creativePrompt(analysisOutput)
      : `${params.creativePrompt(analysisOutput)}\n\nINSTRUÇÃO DE MELHORIA (revisão ${cycleCount}): ${revisionInstruction}\n\nReescreva o copy aplicando esta instrução específica.`;

    const t2 = Date.now();
    const creativeResult = await callProvider(creatorProvider, {
      prompt: creativePromptText,
      temperature: params.temperature?.creative ?? 0.7,
      maxTokens: params.maxTokens?.creative ?? 2000,
    });
    const d2 = Date.now() - t2;
    stages.push({
      provider: creatorProvider,
      role: 'creator',
      model: `${creatorProvider}:${creativeResult.model}`,
      duration_ms: d2,
    });
    fireAndForgetLog(params.usageContext, creatorProvider, creativeResult, d2);
    creativeOutput = creativeResult.text;

    // Etapa 3: Editorial Review com scoring JSON
    const baseReviewPrompt = params.reviewPrompt(analysisOutput, creativeOutput);
    const scoringInstruction = `

---
Após revisar, retorne APENAS o seguinte JSON (sem qualquer texto antes ou depois):
{
  "revised_copy": "<TODAS as opcoes revisadas no formato OPCAO 1: ... OPCAO 2: ... — copie o texto limpo de cada campo sem comentarios editoriais, justificativas ou notas de melhoria>",
  "brand_dna_match": <0-10>,
  "platform_fit": <0-10>,
  "cta_clarity": <0-10>,
  "message_clarity": <0-10>,
  "originality": <0-10>,
  "needs_revision": <true se média dos 5 scores < 7.0, senão false>,
  "revision_instruction": "<instrução específica e acionável para melhorar o copy — obrigatório se needs_revision for true, senão string vazia>"
}`;

    const t3 = Date.now();
    const reviewResult = await callProvider(editorProvider, {
      prompt: baseReviewPrompt + scoringInstruction,
      temperature: params.temperature?.review ?? 0.4,
      maxTokens: params.maxTokens?.review ?? 2500,
    });
    const d3 = Date.now() - t3;
    stages.push({
      provider: editorProvider,
      role: 'editor',
      model: `${editorProvider}:${reviewResult.model}`,
      duration_ms: d3,
    });
    fireAndForgetLog(params.usageContext, editorProvider, reviewResult, d3);

    // Parsear JSON de qualidade
    const parsed = safeParseJson(reviewResult.text);
    if (parsed) {
      qualityScore = buildQualityScore(parsed);
      finalOutput = parsed.revised_copy ?? reviewResult.text;
    } else {
      // Claude não retornou JSON — aceitar texto direto
      finalOutput = reviewResult.text;
      qualityScore = null;
    }

    // Decidir se precisa de mais um ciclo
    if (!qualityScore || !qualityScore.needs_revision || cycleCount >= MAX_CYCLES) {
      break;
    }

    revisionInstruction = qualityScore.revision_instruction;
    cycleCount++;
  }

  const providers = [...new Set(stages.map((s) => s.provider))].join('+');

  return {
    output: finalOutput,
    model: `collaborative:${providers}`,
    stages,
    analysis_json: analysisJson,
    creative_raw: creativeOutput,
    editorial_notes: qualityScore ? `Score: ${qualityScore.overall}/10 | Ciclos: ${cycleCount}` : '',
    total_duration_ms: Date.now() - startTotal,
    quality_score: qualityScore,
    cycle_count: cycleCount,
  };
}

export const CopyOrchestrator = {
  orchestrate,
  generateWithProvider,
  runCollaborativePipeline,
  getRoutingInfo,
  getAvailableProvidersInfo,
};
