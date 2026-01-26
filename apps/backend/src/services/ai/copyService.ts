import { env } from '../../env';
import { CopyOrchestrator, TaskType, CopyProvider } from './copyOrchestrator';

export { CopyProvider, TaskType };

type GenerateParams = {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
};

type OrchestratedGenerateParams = GenerateParams & {
  taskType?: TaskType;
  forceProvider?: CopyProvider;
};

type ValidationResult = {
  score_geral: number;
  checklist: {
    clareza: boolean;
    alinhamento_objetivo: boolean;
    tom_de_voz: boolean;
    cta_presente: boolean;
  };
  copys: Array<{
    headline: string;
    corpo: string;
    cta: string;
  }>;
  formatted_text: string;
  melhorias?: string[];
};

type CopyPipelineResult = {
  output: string;
  model: string;
  payload: Record<string, any>;
};

const buildValidationPrompt = (params: { prompt: string; creativeOutput: string }) => [
  'Voce e um revisor tecnico de copy.',
  'Nao reescreva. Apenas valide, organize e padronize o texto recebido.',
  'Se algum item estiver confuso, mantenha o texto e marque no checklist.',
  'Retorne APENAS JSON valido com a estrutura abaixo.',
  '{',
  '  "score_geral": 0.0,',
  '  "checklist": {',
  '    "clareza": true,',
  '    "alinhamento_objetivo": true,',
  '    "tom_de_voz": true,',
  '    "cta_presente": true',
  '  },',
  '  "copys": [',
  '    { "headline": "...", "corpo": "...", "cta": "..." }',
  '  ],',
  '  "formatted_text": "texto formatado para leitura humana"',
  '}',
  '',
  'PROMPT ORIGINAL:',
  params.prompt,
  '',
  'COPYS GERADAS:',
  params.creativeOutput,
].join('\n');

const parseJsonFromText = (text: string): ValidationResult => {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as ValidationResult;
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as ValidationResult;
    }
    throw new Error('Invalid JSON response from validation');
  }
};

/**
 * Gera copy usando o orquestrador inteligente.
 * O orquestrador escolhe automaticamente a melhor IA baseado no tipo de tarefa.
 */
export async function generateCopy(params: OrchestratedGenerateParams): Promise<CopyPipelineResult> {
  const taskType = params.taskType || 'social_post';

  if (params.forceProvider) {
    const result = await CopyOrchestrator.generateWithProvider(params.forceProvider, {
      prompt: params.prompt,
      systemPrompt: params.systemPrompt,
      temperature: params.temperature ?? 0.6,
      maxTokens: params.maxTokens ?? 1500,
    });

    return {
      output: result.output,
      model: result.model,
      payload: {
        provider: result.provider,
        tier: result.tier,
        taskType: result.taskType,
        forced: true,
      },
    };
  }

  const result = await CopyOrchestrator.orchestrate(taskType, {
    prompt: params.prompt,
    systemPrompt: params.systemPrompt,
    temperature: params.temperature ?? 0.6,
    maxTokens: params.maxTokens ?? 1500,
  });

  return {
    output: result.output,
    model: result.model,
    payload: {
      provider: result.provider,
      tier: result.tier,
      taskType: result.taskType,
    },
  };
}

/**
 * Pipeline completo: gera copy (criativo) + valida (revisor).
 * Usa orquestrador para escolher as IAs apropriadas para cada etapa.
 */
export async function generateCopyWithValidation(params: GenerateParams): Promise<CopyPipelineResult> {
  const providers = CopyOrchestrator.getAvailableProvidersInfo();

  if (providers.available.length === 0) {
    throw new Error('No AI provider configured. Set at least one API key.');
  }

  // Etapa 1: Geração criativa (tier: creative)
  const creativeResult = await CopyOrchestrator.orchestrate('social_post', {
    prompt: params.prompt,
    systemPrompt: params.systemPrompt,
    temperature: params.temperature ?? 0.6,
    maxTokens: params.maxTokens ?? 1500,
  });

  // Etapa 2: Validação (tier: fast)
  const validationPrompt = buildValidationPrompt({
    prompt: params.prompt,
    creativeOutput: creativeResult.output,
  });

  const validationResult = await CopyOrchestrator.orchestrate('validation', {
    prompt: validationPrompt,
    temperature: 0.2,
    maxTokens: 1500,
  });

  const validation = parseJsonFromText(validationResult.output);
  if (!validation.formatted_text || !Array.isArray(validation.copys)) {
    throw new Error('Validation response missing formatted_text or copys');
  }

  return {
    output: validation.formatted_text,
    model: validationResult.model,
    payload: {
      creative_provider: creativeResult.provider,
      creative_model: creativeResult.model,
      creative_tier: creativeResult.tier,
      creative_output: creativeResult.output,
      review_provider: validationResult.provider,
      review_model: validationResult.model,
      review_tier: validationResult.tier,
      review_json: validation,
      review_raw: validationResult.output,
      formatted_text: validation.formatted_text,
    },
  };
}

/**
 * Pipeline premium: usa Claude para copy institucional/campanhas.
 * Inclui revisão estratégica de alta qualidade.
 */
export async function generatePremiumCopy(params: GenerateParams): Promise<CopyPipelineResult> {
  // Etapa 1: Geração premium (Claude)
  const copyResult = await CopyOrchestrator.orchestrate('institutional_copy', {
    prompt: params.prompt,
    systemPrompt: params.systemPrompt,
    temperature: params.temperature ?? 0.5,
    maxTokens: params.maxTokens ?? 2000,
  });

  // Etapa 2: Revisão estratégica (Claude)
  const reviewResult = await CopyOrchestrator.orchestrate('final_review', {
    prompt: buildValidationPrompt({
      prompt: params.prompt,
      creativeOutput: copyResult.output,
    }),
    temperature: 0.2,
    maxTokens: 1500,
  });

  const validation = parseJsonFromText(reviewResult.output);

  return {
    output: validation.formatted_text || copyResult.output,
    model: copyResult.model,
    payload: {
      creative_provider: copyResult.provider,
      creative_model: copyResult.model,
      creative_tier: copyResult.tier,
      creative_output: copyResult.output,
      review_provider: reviewResult.provider,
      review_model: reviewResult.model,
      review_tier: reviewResult.tier,
      review_json: validation,
      formatted_text: validation.formatted_text,
      premium: true,
    },
  };
}

/**
 * Retorna informações sobre os providers disponíveis e roteamento.
 */
export function getOrchestratorInfo() {
  return {
    providers: CopyOrchestrator.getAvailableProvidersInfo(),
    routing: CopyOrchestrator.getRoutingInfo(),
  };
}
