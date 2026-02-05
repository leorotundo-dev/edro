import { env } from '../../env';
import { OpenAIService } from './openaiService';
import { GeminiService } from './geminiService';
import { ClaudeService } from './claudeService';

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

function getFallbackProvider(preferred: CopyProvider): CopyProvider {
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
): Promise<string> {
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

export async function orchestrate(
  taskType: TaskType,
  params: CompletionParams
): Promise<OrchestrationResult> {
  const routing = TASK_ROUTING[taskType];
  const provider = getFallbackProvider(routing.provider);
  const model = PROVIDER_MODELS[provider];

  const output = await callProvider(provider, params);

  return {
    output,
    provider,
    model: `${provider}:${model}`,
    tier: routing.tier,
    taskType,
  };
}

export async function generateWithProvider(
  provider: CopyProvider,
  params: CompletionParams
): Promise<OrchestrationResult> {
  const actualProvider = getFallbackProvider(provider);
  const model = PROVIDER_MODELS[actualProvider];

  const output = await callProvider(actualProvider, params);

  return {
    output,
    provider: actualProvider,
    model: `${actualProvider}:${model}`,
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

export type CollaborativePipelineResult = {
  output: string;
  model: string;
  stages: CollaborativeStage[];
  analysis_json: Record<string, any> | null;
  creative_raw: string;
  editorial_notes: string;
  total_duration_ms: number;
};

export async function runCollaborativePipeline(params: {
  analysisPrompt: string;
  creativePrompt: (analysisOutput: string) => string;
  reviewPrompt: (analysisOutput: string, creativeOutput: string) => string;
  temperature?: { analysis?: number; creative?: number; review?: number };
  maxTokens?: { analysis?: number; creative?: number; review?: number };
}): Promise<CollaborativePipelineResult> {
  const available = getAvailableProviders();
  if (available.length === 0) {
    throw new Error('No AI provider configured.');
  }

  const stages: CollaborativeStage[] = [];
  const startTotal = Date.now();

  // --- Etapa 1: Analysis (Gemini preferred) ---
  const analystProvider = getFallbackProvider('gemini');
  const analystModel = PROVIDER_MODELS[analystProvider];
  const t1 = Date.now();
  const analysisOutput = await callProvider(analystProvider, {
    prompt: params.analysisPrompt,
    temperature: params.temperature?.analysis ?? 0.3,
    maxTokens: params.maxTokens?.analysis ?? 1200,
  });
  stages.push({
    provider: analystProvider,
    role: 'analyst',
    model: `${analystProvider}:${analystModel}`,
    duration_ms: Date.now() - t1,
  });

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

  // --- Etapa 2: Creative (OpenAI preferred) ---
  const creatorProvider = getFallbackProvider('openai');
  const creatorModel = PROVIDER_MODELS[creatorProvider];
  const t2 = Date.now();
  const creativeOutput = await callProvider(creatorProvider, {
    prompt: params.creativePrompt(analysisOutput),
    temperature: params.temperature?.creative ?? 0.7,
    maxTokens: params.maxTokens?.creative ?? 2000,
  });
  stages.push({
    provider: creatorProvider,
    role: 'creator',
    model: `${creatorProvider}:${creatorModel}`,
    duration_ms: Date.now() - t2,
  });

  // --- Etapa 3: Editorial Review (Claude preferred) ---
  const editorProvider = getFallbackProvider('claude');
  const editorModel = PROVIDER_MODELS[editorProvider];
  const t3 = Date.now();
  const reviewOutput = await callProvider(editorProvider, {
    prompt: params.reviewPrompt(analysisOutput, creativeOutput),
    temperature: params.temperature?.review ?? 0.4,
    maxTokens: params.maxTokens?.review ?? 2500,
  });
  stages.push({
    provider: editorProvider,
    role: 'editor',
    model: `${editorProvider}:${editorModel}`,
    duration_ms: Date.now() - t3,
  });

  const providers = stages.map((s) => s.provider).join('+');

  return {
    output: reviewOutput,
    model: `collaborative:${providers}`,
    stages,
    analysis_json: analysisJson,
    creative_raw: creativeOutput,
    editorial_notes: '',
    total_duration_ms: Date.now() - startTotal,
  };
}

export const CopyOrchestrator = {
  orchestrate,
  generateWithProvider,
  runCollaborativePipeline,
  getRoutingInfo,
  getAvailableProvidersInfo,
};
