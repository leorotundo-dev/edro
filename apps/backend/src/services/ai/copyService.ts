import { env } from '../../env';
import { CopyOrchestrator, TaskType, CopyProvider, UsageContext, VariationQualityScore, generateWithProvider } from './copyOrchestrator';

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
  usageContext?: UsageContext;
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

function parseCollaborativeOptions(output: string): string[] {
  const blocks = output
    .split(/OPCA[OÃ]O\s+\d+[:.\-]?\s*/i)
    .map((block) => block.trim())
    .filter((block) => block.length > 20);
  if (blocks.length >= 2) return blocks;

  const fallback = output
    .split(/\n{3,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 20);
  if (fallback.length >= 2) return fallback;

  const trimmed = output.trim();
  return trimmed ? [trimmed] : [];
}

const buildValidationPrompt = (params: { prompt: string; creativeOutput: string }) => [
  'Você é um revisor técnico de copy.',
  'Valide o texto abaixo preservando o formato OPCAO N com Arte-Titulo, Arte-Corpo, Legenda e CTA.',
  'Retorne APENAS JSON válido (sem blocos de código):',
  '{',
  '  "score_geral": 0.0,',
  '  "checklist": {',
  '    "clareza": true,',
  '    "alinhamento_objetivo": true,',
  '    "tom_de_voz": true,',
  '    "cta_presente": true',
  '  },',
  '  "copys": [',
  '    { "headline": "...", "corpo": "...", "legenda": "...", "cta": "..." }',
  '  ],',
  '  "formatted_text": "OPCAO 1:\\nArte - Titulo: ...\\nArte - Corpo: ...\\nLegenda: ...\\nCTA: ...\\n\\nOPCAO 2:\\n..."',
  '}',
  '',
  'COPYS PARA VALIDAR:',
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
    }, params.usageContext);

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
  }, params.usageContext);

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
export async function generateCopyWithValidation(params: GenerateParams & { usageContext?: UsageContext }): Promise<CopyPipelineResult> {
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
  }, params.usageContext);

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
    }, params.usageContext);

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
export async function generatePremiumCopy(params: GenerateParams & { usageContext?: UsageContext }): Promise<CopyPipelineResult> {
  // Etapa 1: Geração premium (Claude)
  const copyResult = await CopyOrchestrator.orchestrate('institutional_copy', {
    prompt: params.prompt,
    systemPrompt: params.systemPrompt,
    temperature: params.temperature ?? 0.5,
    maxTokens: params.maxTokens ?? 2000,
  }, params.usageContext);

  // Etapa 2: Revisão estratégica (Claude)
  try {
    const reviewResult = await CopyOrchestrator.orchestrate('final_review', {
      prompt: buildValidationPrompt({
        prompt: params.prompt,
        creativeOutput: copyResult.output,
      }),
      temperature: 0.2,
      maxTokens: 1500,
    }, params.usageContext);

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
  usageContext?: UsageContext;
}): Promise<CopyPipelineResult> {
  // ── AGENTE 1: ESTRATEGISTA (Gemini) ─────────────────────────────────────
  // Chain of Thought forçado: o estrategista declara explicitamente a estratégia
  // psicológica ANTES de gerar os ganchos criativos. A intenção biológica precede
  // a gramática — técnica de Engenharia de Decisão Digital 2026.
  const analysisPrompt = [
    'Você é o Estrategista-Chefe de uma agência de publicidade de alta performance.',
    'Sua função: analisar o briefing e o perfil do cliente e declarar PRIMEIRO a estratégia psicológica que guiará a geração de copy — só então defina os ganchos e direções criativas.',
    '',
    'CHAIN OF THOUGHT OBRIGATÓRIO: preencha os campos nesta ordem:',
    '1. psychological_strategy — declare em 1-2 frases qual gatilho dominante você aplicará e por que.',
    '   Ex: "Vou usar Aversão a Perda pois o objetivo é conversão e o público enfrenta risco de perder oportunidade de mercado. O Pacing validará a frustração atual; o Leading apresentará a solução como inevitável."',
    '2. dominant_trigger — classifique: "loss_aversion", "specificity" ou "curiosity".',
    '3. tone_approach — como o Terceiro Tom será expresso: voz de especialista para par, qual vulnerabilidade controlada aplicar se houver, qual espelhamento de linguagem do público.',
    '4. Preencha os demais campos criativos JÁ orientados pela estratégia declarada acima.',
    '',
    'Retorne APENAS um JSON válido com a estrutura:',
    '{',
    '  "psychological_strategy": "declaração da estratégia psicológica e racional do gatilho escolhido",',
    '  "dominant_trigger": "loss_aversion | specificity | curiosity",',
    '  "tone_approach": "como o Terceiro Tom será expresso e qual espelhamento de linguagem aplicar",',
    '  "target_audience": "descrição do público ideal para esta peça",',
    '  "ideal_tone": "tom recomendado baseado na marca e formato",',
    '  "key_hooks": ["3 a 5 ganchos criativos orientados pelo gatilho dominante declarado"],',
    '  "cultural_references": ["referências culturais ou de momento oportunas"],',
    '  "mandatory_elements": ["elementos que devem aparecer obrigatoriamente"],',
    '  "restrictions": ["o que evitar, termos proibidos, vetos de baixa proficiência aplicáveis"],',
    '  "platform_best_practices": "melhores práticas para o formato/plataforma considerando o gatilho dominante",',
    '  "creative_direction": "direção criativa em 2-3 frases já incorporando a estratégia psicológica declarada"',
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
    'Você é um redator criativo de agência de publicidade premiada.',
    `Crie ${params.count} variações de copy usando as DIRETRIZES DO ESTRATEGISTA abaixo.`,
    '',
    'FORMATO OBRIGATÓRIO — use EXATAMENTE este modelo:',
    'OPCAO 1:',
    'Arte - Titulo: [headline curto e impactante para o creative/arte, até 8 palavras]',
    'Arte - Corpo: [texto curto que aparece na peça criativa, 1 a 2 frases]',
    'Legenda: [caption completo para postar nas redes sociais. Estilo conversacional, 3 a 5 parágrafos. Inclua hashtags relevantes ao final.]',
    'CTA: [chamada para ação]',
    '',
    'OPCAO 2:',
    '(mesmo formato acima)',
    '',
    'NÃO use JSON, NÃO use blocos de código, NÃO use markdown. Apenas texto simples.',
    '',
    'DIRETRIZES DO ESTRATEGISTA:',
    analysisOutput,
    '',
    'BRIEFING ORIGINAL:',
    params.prompt,
    params.instructions ? `\nINSTRUÇÕES EXTRAS: ${params.instructions}` : '',
  ].filter(Boolean).join('\n');

  // ── AGENTE 3: AUDITOR/CRITICO (Claude) ──────────────────────────────────
  // Dois passos obrigatórios: AUDITORIA DE VETO primeiro, revisão criativa depois.
  // Implementa o Chain of Thought critico descrito na Engenharia de Decisao 2026.
  const buildReviewPrompt = (analysisOutput: string, creativeOutput: string) => [
    'Você é o Auditor-Chefe de uma agência de comunicação de alto nível.',
    'Sua função tem DOIS PASSOS OBRIGATÓRIOS — execute nesta ordem:',
    '',
    '══ PASSO 1 — AUDITORIA DE VETO (execute ANTES de qualquer revisao criativa) ══',
    'Leia cada opção e elimine TODOS os seguintes problemas antes de continuar:',
    '□ ABERTURA CLICHÊ: "No mundo de hoje", "Em um cenário de constantes mudanças", "Descubra como", "Em tempos como esses" → reescreva a abertura com substância imediata.',
    '□ ADJETIVO QUALITATIVO SEM DADO: "incrível", "revolucionário", "melhor", "eficiente", "ágil" sem métrica → substitua por evidência numérica ou fato concreto.',
    '□ VOZ PASSIVA: "foi entregue", "e realizado", "pode ser usado" → converta para voz ativa e assertiva.',
    '□ CONCLUSAO OBVIA: "Concluindo...", "Em resumo...", "Portanto...", "Como pudemos ver..." → elimine ou substitua por um novo insight.',
    '□ PERFEIÇÃO ABSOLUTA: se a peça não tiver nenhum elemento de vulnerabilidade controlada ou aprendizado humano quando pertinente ao contexto, adicione um (Pratfall Effect: 2.4x mais confiança).',
    '□ NUMERO REDONDO: se houver numeros genericos como "mais de 10%" ou "muito" → especifique com dado preciso quando possivel.',
    '',
    '══ PASSO 2 — REVISAO CRIATIVA ══',
    'Após a auditoria de veto, revise e melhore CADA opção considerando:',
    '- Estratégia psicológica declarada pelo Estrategista (consulte DIRETRIZES abaixo)',
    '- Tom da marca e adequação ao público-alvo',
    '- Compliance (termos proibidos, menções obrigatórias)',
    '- Forca e clareza do CTA',
    '- Adequação ao formato/plataforma',
    '- Originalidade e impacto criativo',
    '',
    'REGRAS ABSOLUTAS:',
    '1. Retorne TODAS as opções recebidas — nunca elimine, junte ou reduza o número de opções.',
    '2. Se uma opção estiver boa (7/10 ou mais), mantenha-a com ajustes mínimos.',
    '3. Se uma opção estiver ruim (abaixo de 7/10), reescreva-a completamente — mas mantenha-a como opção separada.',
    '4. PROIBIDO incluir qualquer comentário editorial, análise, nota de melhoria ou justificativa dentro do texto das opções.',
    '5. Cada campo (Arte - Titulo, Arte - Corpo, Legenda, CTA) deve conter APENAS o texto final da peça, nada mais.',
    '',
    'FORMATO OBRIGATÓRIO — use EXATAMENTE esta estrutura para cada opção:',
    'OPCAO 1:',
    'Arte - Titulo: [headline final, sem comentários]',
    'Arte - Corpo: [texto da peça, sem comentários]',
    'Legenda: [caption final, sem comentários]',
    'CTA: [chamada para ação, sem comentários]',
    '',
    'OPCAO 2:',
    '(mesmo formato)',
    '',
    'NÃO use JSON. NÃO use markdown. NÃO inclua seções como "MELHORIAS APLICADAS", "ANÁLISE", "AUDITORIA", "JUSTIFICATIVA" ou similares no output final.',
    '',
    'DIRETRIZES DO ESTRATEGISTA (incluindo estratégia psicológica declarada):',
    analysisOutput,
    '',
    'COPIES PARA AUDITORIA E REVISAO:',
    creativeOutput,
  ].join('\n');

  try {
    const result = await CopyOrchestrator.runCollaborativePipeline({
      analysisPrompt,
      creativePrompt: buildCreativePrompt,
      reviewPrompt: buildReviewPrompt,
      usageContext: params.usageContext,
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
        quality_score: result.quality_score ?? null,
        cycle_count: result.cycle_count ?? 0,
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
      usageContext: params.usageContext,
    });
  }
}

export async function generateAndSelectBestCopy(params: {
  prompt: string;
  knowledgeBlock?: string;
  reporteiHint?: string;
  clientName?: string;
  instructions?: string;
  tenantId: string;
  clientId?: string | null;
  platform?: string | null;
  amd?: string | null;
  triggers?: string[] | null;
  usageContext?: UsageContext;
}): Promise<CopyPipelineResult & {
  simulation_id: string | null;
  winner_index: number;
  winner_resonance: number;
  prediction_confidence_label: string;
  predicted_save_rate: number | null;
  predicted_click_rate: number | null;
  total_variants_tested: number;
}> {
  const collaborative = await generateCollaborativeCopy({
    prompt: params.prompt,
    count: 10,
    knowledgeBlock: params.knowledgeBlock,
    reporteiHint: params.reporteiHint,
    clientName: params.clientName,
    instructions: params.instructions,
    usageContext: params.usageContext,
  });

  const options = parseCollaborativeOptions(collaborative.output);
  const safeOptions = options.length > 0 ? options : [collaborative.output.trim()].filter(Boolean);
  const variantInputs = safeOptions.map((text, index) => ({
    index,
    text,
    amd: params.amd || undefined,
    triggers: params.triggers?.length ? params.triggers : undefined,
  }));

  let winnerIndex = 0;
  let simulationId: string | null = null;
  let winnerResonance = 0;
  let predictionConfidenceLabel = 'Sem dados';
  let predictedSaveRate: number | null = null;
  let predictedClickRate: number | null = null;
  let winnerRiskFlags: unknown[] = [];
  let winnerFatigueDays: number | null = null;
  let winnerTopCluster: string | null = null;
  let allResonanceScores: Array<{ index: number; resonance: number; top_cluster: string }> = [];

  try {
    const { runSimulation } = await import('../campaignSimulator/simulationReport');
    const simReport = await runSimulation({
      tenantId: params.tenantId,
      clientId: params.clientId || undefined,
      platform: params.platform || undefined,
      variants: variantInputs,
    });

    simulationId = simReport.id;
    winnerIndex = simReport.winner_index ?? 0;
    winnerResonance = simReport.winner_resonance ?? 0;
    predictionConfidenceLabel = simReport.prediction_confidence_label ?? 'Sem dados';

    const winnerVariant = simReport.variants?.[winnerIndex];
    predictedSaveRate = winnerVariant?.predicted_save_rate ?? null;
    predictedClickRate = winnerVariant?.predicted_click_rate ?? null;
    winnerRiskFlags = winnerVariant?.risk_flags ?? [];
    winnerFatigueDays = winnerVariant?.fatigue_days ?? null;
    winnerTopCluster = winnerVariant?.top_cluster ?? null;
    allResonanceScores = simReport.variants?.map((variant) => ({
      index: variant.index,
      resonance: variant.aggregate_resonance,
      top_cluster: variant.top_cluster,
    })) ?? [];
  } catch (err: any) {
    console.warn('[generateAndSelectBestCopy] Simulator fallback:', err?.message || err);
    winnerIndex = 0;
  }

  const winnerText = safeOptions[winnerIndex] ?? safeOptions[0] ?? collaborative.output;

  return {
    output: winnerText,
    model: collaborative.model,
    payload: {
      ...(collaborative.payload || {}),
      pipeline: 'smart',
      total_variants_tested: safeOptions.length,
      simulation_id: simulationId,
      winner_index: winnerIndex,
      winner_resonance: winnerResonance,
      prediction_confidence_label: predictionConfidenceLabel,
      predicted_save_rate: predictedSaveRate,
      predicted_click_rate: predictedClickRate,
      winner_risk_flags: winnerRiskFlags,
      winner_fatigue_days: winnerFatigueDays,
      winner_top_cluster: winnerTopCluster,
      all_resonance_scores: allResonanceScores,
    },
    simulation_id: simulationId,
    winner_index: winnerIndex,
    winner_resonance: winnerResonance,
    prediction_confidence_label: predictionConfidenceLabel,
    predicted_save_rate: predictedSaveRate,
    predicted_click_rate: predictedClickRate,
    total_variants_tested: safeOptions.length,
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

// ── Helpers para TAREFA 11 ──────────────────────────────────────────────────

function extractChecklistFromAnalysis(analysisOutput: string): string {
  try {
    const start = analysisOutput.indexOf('{');
    const end = analysisOutput.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const parsed = JSON.parse(analysisOutput.slice(start, end + 1));
      if (Array.isArray(parsed?.approval_checklist)) {
        return parsed.approval_checklist
          .map((item: any) => `- [${item.weight?.toUpperCase() ?? 'HIGH'}] ${item.rule}`)
          .join('\n');
      }
    }
  } catch { /* ignore */ }
  return '- Tom alinhado ao DNA da marca\n- CTA específico e acionável\n- Sem abertura clichê\n- Limite de caracteres respeitado';
}

const buildReviewPromptWithScores = (analysisOutput: string, creativeOutput: string) => `
Você é o editor-chefe de uma agência de comunicação de alto nível.
Avalie cada variação de copy abaixo com rigor editorial.

APPROVAL CHECKLIST (extraído da análise estratégica):
${extractChecklistFromAnalysis(analysisOutput)}

Para CADA variação, retorne um JSON com esta estrutura exata:
{
  "quality_scores": [
    {
      "variation_index": 0,
      "scores": {
        "brand_dna_match": 8.5,
        "platform_fit": 9.0,
        "cta_clarity": 7.0,
        "message_clarity": 8.5,
        "originality": 8.0
      },
      "overall": 8.2,
      "pass": true,
      "issues": []
    }
  ],
  "best_variation_index": 0,
  "needs_revision": false,
  "revision_instructions": null
}

Critério de aprovação (pass=true): overall >= 7.5 E nenhuma dimensão < 6.0.
Se needs_revision=true, inclua "issues" com lista de ações específicas para corrigir.

VARIAÇÕES GERADAS:
${creativeOutput}

DIREÇÃO ESTRATÉGICA:
${analysisOutput}
`;

const buildRevisionPrompt = (bestVariation: string, issues: string[]) => `
Você é um redator criativo revisando sua própria copy com base em feedback específico do editor.
Reescreva a copy abaixo corrigindo TODOS os problemas listados. Mantenha o que está bom.

COPY ATUAL:
${bestVariation}

PROBLEMAS A CORRIGIR (obrigatório resolver todos):
${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

Retorne APENAS a copy revisada no mesmo formato (Arte - Titulo / Arte - Corpo / Legenda / CTA).
Não adicione explicações.
`;

const buildFinalReviewPrompt = (revisedVariation: string, previousScore: VariationQualityScore) => `
Você é o editor-chefe avaliando uma copy revisada que anteriormente teve score ${previousScore.overall.toFixed(1)}/10.

Os problemas identificados anteriormente eram:
${previousScore.issues.map((i) => `- ${i}`).join('\n') || '- Nenhum problema específico identificado'}

Avalie se a versão revisada resolveu os problemas. Retorne JSON:
{
  "quality_scores": [{
    "variation_index": 0,
    "scores": { "brand_dna_match": 0, "platform_fit": 0, "cta_clarity": 0, "message_clarity": 0, "originality": 0 },
    "overall": 0,
    "pass": false,
    "issues": []
  }],
  "best_variation_index": 0,
  "needs_revision": false,
  "revision_instructions": null
}

COPY REVISADA:
${revisedVariation}
`;

/**
 * Pipeline colaborativo com loop de qualidade (TAREFA 11).
 * Gemini analisa → GPT-4 cria → Claude avalia com scores por variação.
 * Se score < 7.5, GPT-4 faz revisão cirúrgica → Claude aprova/reprova.
 * Loop máximo: 2 ciclos.
 */
export async function generateCollaborativeCopyWithLoop(params: {
  prompt: string;
  count: number;
  knowledgeBlock?: string;
  reporteiHint?: string;
  clientName?: string;
  instructions?: string;
  maxLoops?: number;
  usageContext?: UsageContext;
}): Promise<CopyPipelineResult> {
  // Reuse the analysis and creative prompts from generateCollaborativeCopy
  // but use the new review/revision prompts
  const analysisPrompt = [
    'Você é o Estrategista-Chefe de uma agência de publicidade de alta performance.',
    'Analise o briefing e o perfil do cliente. Declare a estratégia psicológica que guiará o copy.',
    '',
    'Retorne APENAS um JSON válido:',
    '{',
    '  "psychological_strategy": "...",',
    '  "dominant_trigger": "loss_aversion | specificity | curiosity",',
    '  "tone_approach": "...",',
    '  "target_audience": "...",',
    '  "ideal_tone": "...",',
    '  "key_hooks": ["..."],',
    '  "cultural_references": ["..."],',
    '  "mandatory_elements": ["..."],',
    '  "restrictions": ["..."],',
    '  "platform_best_practices": "...",',
    '  "creative_direction": "...",',
    '  "approval_checklist": [',
    '    { "id": "tone_check", "rule": "Tom alinhado ao DNA do cliente", "weight": "critical" },',
    '    { "id": "cta_required", "rule": "Copy deve ter CTA específico e acionável", "weight": "high" },',
    '    { "id": "no_cliche", "rule": "Sem abertura clichê ou adjetivo qualitativo sem dado", "weight": "high" },',
    '    { "id": "char_limit", "rule": "Respeitar limite de caracteres do formato", "weight": "medium" }',
    '  ]',
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
    'Você é um redator criativo de agência de publicidade premiada.',
    `Crie ${params.count} variações de copy usando as DIRETRIZES DO ESTRATEGISTA abaixo.`,
    '',
    'FORMATO OBRIGATÓRIO — use EXATAMENTE este modelo:',
    'OPCAO 1:',
    'Arte - Titulo: [headline curto e impactante, até 8 palavras]',
    'Arte - Corpo: [texto curto do criativo, 1 a 2 frases]',
    'Legenda: [caption completo com hashtags, 3 a 5 parágrafos]',
    'CTA: [chamada para ação]',
    '',
    'OPCAO 2:',
    '(mesmo formato acima)',
    '',
    'NÃO use JSON, NÃO use markdown.',
    '',
    'DIRETRIZES DO ESTRATEGISTA:',
    analysisOutput,
    '',
    'BRIEFING ORIGINAL:',
    params.prompt,
    params.instructions ? `\nINSTRUÇÕES EXTRAS: ${params.instructions}` : '',
  ].filter(Boolean).join('\n');

  try {
    const result = await CopyOrchestrator.runCollaborativePipelineWithLoop({
      analysisPrompt,
      creativePrompt: buildCreativePrompt,
      reviewPrompt: buildReviewPromptWithScores,
      revisionPrompt: buildRevisionPrompt,
      finalReviewPrompt: buildFinalReviewPrompt,
      maxLoops: params.maxLoops ?? 2,
      usageContext: params.usageContext,
    });

    return {
      output: result.output,
      model: result.model,
      payload: {
        pipeline: 'collaborative_loop',
        stages: result.stages,
        analysis_json: result.analysis_json,
        creative_raw: result.creative_raw,
        total_duration_ms: result.total_duration_ms,
        quality_score: result.quality_score ?? null,
        quality_scores: result.quality_scores,
        best_variation_index: result.best_variation_index,
        revision_count: result.revision_count,
        revision_history: result.revision_history,
        approval_checklist: result.approval_checklist,
        cycle_count: result.cycle_count ?? 0,
        _pipeline: 'collaborative_loop',
      },
    };
  } catch (error: any) {
    // Fallback to standard collaborative pipeline
    return generateCollaborativeCopy({
      prompt: params.prompt,
      count: params.count,
      knowledgeBlock: params.knowledgeBlock,
      reporteiHint: params.reporteiHint,
      clientName: params.clientName,
      instructions: params.instructions,
      usageContext: params.usageContext,
    });
  }
}

// ── 11.3 Adversarial Mode ─────────────────────────────────────────────────

export type AdversarialCopyResult = {
  synthesis: string;
  versions: { gemini: string; openai: string; claude: string };
  contributions: { gemini: string; openai: string; claude: string };
  payload: {
    pipeline: 'adversarial';
    synthesis: string;
    versions: { gemini: string; openai: string; claude: string };
    contributions: { gemini: string; openai: string; claude: string };
  };
};

function coerceSynthesisToString(val: unknown): string {
  if (typeof val === 'string') return val.trim();
  if (val && typeof val === 'object') {
    const o = val as Record<string, unknown>;
    return [
      o.titulo || o.title || o.headline || o.header || '',
      o.corpo || o.body || o.texto || o.text || '',
      o.cta ? `CTA: ${o.cta}` : '',
      o.hashtags || o.tags || '',
    ].filter(Boolean).join('\n');
  }
  return String(val || '').trim();
}

function parseAdversarialSynthesis(text: string): { synthesis: string; contributions: { gemini: string; openai: string; claude: string } } {
  const fallback = { synthesis: text.trim(), contributions: { gemini: '—', openai: '—', claude: '—' } };
  try {
    const trimmed = text.trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start < 0 || end <= start) return fallback;
    const parsed = JSON.parse(trimmed.slice(start, end + 1));
    return {
      synthesis: coerceSynthesisToString(parsed.synthesis) || fallback.synthesis,
      contributions: {
        gemini: String(parsed.contributions?.gemini || '—'),
        openai: String(parsed.contributions?.openai || '—'),
        claude: String(parsed.contributions?.claude || '—'),
      },
    };
  } catch {
    return fallback;
  }
}

export async function generateAdversarialCopy(params: {
  prompt: string;
  knowledgeBlock?: string;
  usageContext?: UsageContext;
}): Promise<AdversarialCopyResult> {
  const knowledgeSection = params.knowledgeBlock ? `\n\nBASE DO CLIENTE:\n${params.knowledgeBlock}` : '';

  const [geminiOutput, openaiOutput, claudeOutput] = await Promise.all([
    generateWithProvider('gemini', {
      prompt: `Você é um estrategista de comunicação orientado a dados e tendências culturais.
Crie 1 versão de copy fortemente embasada em dados, tendências atuais e contexto cultural do momento.
Formato: título / corpo / CTA / hashtags.

BRIEFING:
${params.prompt}${knowledgeSection}`,
      temperature: 0.5,
      maxTokens: 600,
    }),
    generateWithProvider('openai', {
      prompt: `Você é um diretor criativo premiado que pensa fora do óbvio.
Crie 1 versão de copy surpreendente, ousada e memorável — quebrando o padrão esperado do segmento.
Formato: título / corpo / CTA / hashtags.

BRIEFING:
${params.prompt}${knowledgeSection}`,
      temperature: 0.85,
      maxTokens: 600,
    }),
    generateWithProvider('claude', {
      prompt: `Você é o guardião da marca de um cliente exigente.
Crie 1 versão de copy 100% alinhada ao DNA da marca, segura, precisa e sem riscos.
Formato: título / corpo / CTA / hashtags.

BRIEFING:
${params.prompt}${knowledgeSection}`,
      temperature: 0.35,
      maxTokens: 600,
    }),
  ]);

  const synthesisOutput = await generateWithProvider('claude', {
    prompt: `Você é o editor-chefe recebendo 3 versões de copy criadas por estrategistas diferentes.
Analise as 3 versões e crie uma SÍNTESE que combine os melhores elementos de cada uma.
Explique brevemente (1 frase por versão) o que foi aproveitado de cada perspectiva.

VERSÃO ESTRATEGISTA (dados e tendências):
${geminiOutput.output}

VERSÃO DIRETOR CRIATIVO (bold e inesperado):
${openaiOutput.output}

VERSÃO GUARDIÃO DA MARCA (alinhamento DNA):
${claudeOutput.output}

Retorne JSON:
{
  "synthesis": "copy final sintetizada (título / corpo / CTA / hashtags)",
  "contributions": {
    "gemini": "o que foi aproveitado desta perspectiva",
    "openai": "o que foi aproveitado desta perspectiva",
    "claude": "o que foi aproveitado desta perspectiva"
  }
}`,
    temperature: 0.3,
    maxTokens: 900,
  });

  const parsed = parseAdversarialSynthesis(synthesisOutput.output);

  return {
    synthesis: parsed.synthesis,
    versions: {
      gemini: geminiOutput.output,
      openai: openaiOutput.output,
      claude: claudeOutput.output,
    },
    contributions: parsed.contributions,
    payload: {
      pipeline: 'adversarial',
      synthesis: parsed.synthesis,
      versions: {
        gemini: geminiOutput.output,
        openai: openaiOutput.output,
        claude: claudeOutput.output,
      },
      contributions: parsed.contributions,
    },
  };
}
