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

  try {
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
  } catch (error: any) {
    return {
      output: creativeResult.output,
      model: creativeResult.model,
      payload: {
        creative_provider: creativeResult.provider,
        creative_model: creativeResult.model,
        creative_tier: creativeResult.tier,
        creative_output: creativeResult.output,
        review_error: error?.message || 'validation_failed',
        fallback: true,
      },
    };
  }
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
  try {
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
  } catch (error: any) {
    return {
      output: copyResult.output,
      model: copyResult.model,
      payload: {
        creative_provider: copyResult.provider,
        creative_model: copyResult.model,
        creative_tier: copyResult.tier,
        creative_output: copyResult.output,
        review_error: error?.message || 'final_review_failed',
        premium: true,
        fallback: true,
      },
    };
  }
}

/**
 * Pipeline colaborativo: Gemini analisa → OpenAI cria → Claude refina.
 * As 3 IAs trabalham em sequência, cada uma no que faz de melhor.
 */
export async function generateCollaborativeCopy(params: {
  prompt: string;
  count: number;
  knowledgeBlock?: string;
  reporteiHint?: string;
  clientName?: string;
  instructions?: string;
}): Promise<CopyPipelineResult> {
  const analysisPrompt = [
    'Voce e um estrategista de comunicacao de uma agencia de publicidade.',
    'Analise o briefing e o perfil do cliente abaixo.',
    'Extraia e retorne APENAS um JSON valido com a estrutura:',
    '{',
    '  "target_audience": "descricao do publico ideal para esta peca",',
    '  "ideal_tone": "tom recomendado baseado na marca e formato",',
    '  "key_hooks": ["3 a 5 ganchos criativos relevantes"],',
    '  "cultural_references": ["referencias culturais ou de momento oportunas"],',
    '  "mandatory_elements": ["elementos que devem aparecer obrigatoriamente"],',
    '  "restrictions": ["o que evitar, termos proibidos"],',
    '  "platform_best_practices": "melhores praticas para o formato/plataforma",',
    '  "creative_direction": "direcao criativa sugerida em 2-3 frases"',
    '}',
    '',
    params.clientName ? `Cliente: ${params.clientName}` : '',
    params.knowledgeBlock ? `\nBASE DO CLIENTE:\n${params.knowledgeBlock}` : '',
    params.reporteiHint || '',
    '',
    'BRIEFING:',
    params.prompt,
  ].filter(Boolean).join('\n');

  const buildCreativePrompt = (analysisOutput: string) => [
    'Voce e um redator criativo de agencia de publicidade premiada.',
    `Crie ${params.count} variacoes de copy usando as DIRETRIZES DO ESTRATEGISTA abaixo.`,
    'Cada variacao deve ter: titulo curto e impactante, corpo persuasivo, CTA claro e hashtags relevantes.',
    'Formato: lista numerada. Separe claramente titulo, corpo, CTA e hashtags.',
    '',
    'DIRETRIZES DO ESTRATEGISTA:',
    analysisOutput,
    '',
    'BRIEFING ORIGINAL:',
    params.prompt,
    params.instructions ? `\nINSTRUCOES EXTRAS: ${params.instructions}` : '',
  ].filter(Boolean).join('\n');

  const buildReviewPrompt = (analysisOutput: string, creativeOutput: string) => [
    'Voce e o editor-chefe de uma agencia de comunicacao de alto nivel.',
    'Revise cada copy abaixo com rigor editorial, considerando:',
    '- Tom da marca e adequacao ao publico-alvo',
    '- Compliance (termos proibidos, mencoes obrigatorias)',
    '- Forca e clareza do CTA',
    '- Adequacao ao formato/plataforma',
    '- Originalidade e impacto criativo',
    '',
    'Para cada copy:',
    '1. De uma nota de 1 a 10',
    '2. Se a nota for menor que 7, REESCREVA com melhorias',
    '3. Se a nota for 7+, mantenha como esta',
    '',
    'Ordene do melhor para o pior.',
    'Retorne no formato lista numerada: titulo, corpo, CTA, hashtags.',
    'No final, adicione uma secao "NOTAS EDITORIAIS:" com observacoes gerais.',
    '',
    'DIRETRIZES DO ESTRATEGISTA:',
    analysisOutput,
    '',
    'COPIES PARA REVISAO:',
    creativeOutput,
  ].join('\n');

  try {
    const result = await CopyOrchestrator.runCollaborativePipeline({
      analysisPrompt,
      creativePrompt: buildCreativePrompt,
      reviewPrompt: buildReviewPrompt,
    });

    return {
      output: result.output,
      model: result.model,
      payload: {
        pipeline: 'collaborative',
        stages: result.stages,
        analysis_json: result.analysis_json,
        creative_raw: result.creative_raw,
        total_duration_ms: result.total_duration_ms,
      },
    };
  } catch (error: any) {
    // Fallback to standard pipeline if collaborative fails
    return generateCopyWithValidation({
      prompt: [
        params.prompt,
        params.knowledgeBlock ? `\nBASE DO CLIENTE:\n${params.knowledgeBlock}` : '',
        params.instructions ? `\nInstrucoes: ${params.instructions}` : '',
      ].filter(Boolean).join('\n'),
    });
  }
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
