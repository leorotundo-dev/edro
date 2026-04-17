type BriefingAskTarget = 'system' | 'internal' | 'client';

type MissingInformationItem = {
  field: string;
  ask_target: BriefingAskTarget;
  reason: string;
};

type FieldSourceMap = Record<string, string | null>;
type FieldConfidenceMap = Record<string, number>;

function clampScore(value: number) {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Number(value.toFixed(2));
}

function isExplicitSource(source: string | null | undefined) {
  const normalized = String(source || '').toLowerCase();
  return normalized.includes('explicit') || normalized.includes('candidate') || normalized.includes('portal');
}

function isInferredSource(source: string | null | undefined) {
  const normalized = String(source || '').toLowerCase();
  return normalized.includes('history') || normalized.includes('topic_map') || normalized.includes('calendar') || normalized.includes('knowledge');
}

function scoreFieldValue(field: string, value: unknown, source: string | null | undefined) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return 0;
  if (field === 'summary') {
    if (normalized.length >= 80) return 0.96;
    if (normalized.length >= 30) return 0.88;
    return 0.68;
  }
  if (field === 'deadline') {
    return isExplicitSource(source) ? 0.94 : isInferredSource(source) ? 0.78 : 0.62;
  }
  if (field === 'client_id') {
    return isExplicitSource(source) ? 0.98 : 0.84;
  }
  if (isExplicitSource(source)) return 0.94;
  if (isInferredSource(source)) return 0.78;
  return 0.66;
}

function buildQuestion(field: string, askTarget: Exclude<BriefingAskTarget, 'system'>, reason: string) {
  const prompts: Record<string, string> = {
    client_id: 'Qual cliente canônico da base deve receber esta demanda?',
    objective: 'Qual é o objetivo principal desta peça ou campanha?',
    platform: 'Em qual canal essa peça precisa sair?',
    format: 'Qual formato final da peça devemos produzir?',
    deadline: 'Existe prazo rígido ou data específica para publicação?',
  };
  return {
    field,
    ask_target: askTarget,
    prompt: prompts[field] || `Completar campo ${field}`,
    reason,
  };
}

export function buildBriefingPacketScores(params: {
  readiness: 'ready' | 'needs_internal_triage' | 'needs_client_input';
  values: Record<string, unknown>;
  fieldSources: FieldSourceMap;
  missingInformation: MissingInformationItem[];
  knowledgeAvailable: boolean;
  historicalSignals: number;
}) {
  const requiredFields = ['client_id', 'summary', 'objective', 'platform', 'format'];
  const fieldConfidence: FieldConfidenceMap = {};

  for (const field of [...requiredFields, 'deadline']) {
    fieldConfidence[field] = clampScore(scoreFieldValue(field, params.values[field], params.fieldSources[field]));
  }

  const completenessScore = clampScore(
    requiredFields.reduce((acc, field) => acc + (fieldConfidence[field] || 0), 0) / requiredFields.length,
  );

  const internalQuestions = params.missingInformation
    .filter((item) => item.ask_target === 'internal')
    .map((item) => buildQuestion(item.field, 'internal', item.reason));
  const clientQuestions = params.missingInformation
    .filter((item) => item.ask_target === 'client')
    .map((item) => buildQuestion(item.field, 'client', item.reason));
  const inferableFields = Object.entries(params.fieldSources)
    .filter(([, source]) => isInferredSource(source))
    .map(([field, source]) => ({ field, source }));

  const autostartReasons: string[] = [];
  let autostartMode: 'blocked' | 'review' | 'auto_run' = 'blocked';

  if (params.readiness === 'ready') {
    autostartReasons.push('briefing_packet_ready');
    if (params.knowledgeAvailable) autostartReasons.push('client_kb_loaded');
    if (params.historicalSignals > 0) autostartReasons.push('historical_context_available');

    if (completenessScore >= 0.88 && params.knowledgeAvailable) {
      autostartMode = 'auto_run';
    } else {
      autostartMode = 'review';
      autostartReasons.push('briefing_ready_but_should_be_reviewed');
    }
  } else {
    autostartReasons.push(params.readiness);
  }

  return {
    field_confidence: fieldConfidence,
    completeness_score: completenessScore,
    internal_questions: internalQuestions,
    client_questions: clientQuestions,
    inferable_fields: inferableFields,
    autostart_recommendation: {
      mode: autostartMode,
      confidence: autostartMode === 'auto_run' ? completenessScore : clampScore(completenessScore * 0.9),
      reasons: autostartReasons,
    },
  };
}
