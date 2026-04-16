import { normalizeRole } from '../auth/rbac';
import type { ClientKnowledgeBaseSnapshot } from './clientKnowledgeBaseService';
import type { JarvisClientState } from './jarvisDecisionEngine';
import type { JarvisIntent, JarvisRoutingDecision } from './jarvisPolicyService';

export type JarvisTaskType =
  | 'meeting_followup'
  | 'briefing_creation'
  | 'risk_triage'
  | 'relationship_reply'
  | 'status_check'
  | 'scheduling'
  | 'research'
  | 'system_repair'
  | 'content_generation'
  | 'generic';

export type JarvisActorProfile =
  | 'founder'
  | 'atendimento'
  | 'operacao'
  | 'social'
  | 'closer'
  | 'manager'
  | 'general';

export type JarvisConfidenceBand = 'low' | 'medium' | 'high';
export type JarvisConfidenceMode = 'respond' | 'act' | 'confirm' | 'escalate';

export type JarvisConfidenceAssessment = {
  score: number;
  band: JarvisConfidenceBand;
  mode: JarvisConfidenceMode;
  reasons: string[];
};

export type JarvisActionPolicyLearning = {
  task_type: string | null;
  actor_profile: string | null;
  preferred_mode: JarvisConfidenceMode | null;
  preferred_style: JarvisExecutionPolicy['style'] | null;
  mode_signals: Array<{
    mode: JarvisConfidenceMode;
    sample_count: number;
    learning_score: number;
    avg_outcome_score: number;
  }>;
  style_signals: Array<{
    style: JarvisExecutionPolicy['style'];
    sample_count: number;
    learning_score: number;
    avg_outcome_score: number;
  }>;
};

export type JarvisToolPolicyLearning = {
  task_type: string | null;
  actor_profile: string | null;
  preferred_tools: Array<{
    tool_name: string;
    sample_count: number;
    learning_score: number;
    avg_outcome_score: number;
  }>;
  penalized_tools: Array<{
    tool_name: string;
    sample_count: number;
    learning_score: number;
    avg_outcome_score: number;
  }>;
  total_scored_tools: number;
};

export type JarvisExecutionPolicy = {
  actorProfile: JarvisActorProfile;
  taskType: JarvisTaskType;
  confidence: JarvisConfidenceAssessment;
  style: 'executive' | 'operational' | 'commercial' | 'social' | 'service' | 'general';
  requiresExplicitConfirmation: boolean;
  shouldPreferShortAnswer: boolean;
  sandboxOnly: boolean;
};

export type JarvisActionGateDecision = {
  allow: boolean;
  requiresConfirmation: boolean;
  reason: string | null;
};

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function includesAny(text: string, needles: string[]) {
  return needles.some((needle) => text.includes(needle));
}

function normalizeText(parts: Array<unknown>) {
  return parts
    .map((item) => String(item || '').toLowerCase())
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ' ');
}

export function detectJarvisTaskType(params: {
  message: string;
  intent: JarvisIntent;
  pageData?: Record<string, unknown> | null;
}): JarvisTaskType {
  const pageDataText = params.pageData ? JSON.stringify(params.pageData) : '';
  const haystack = normalizeText([params.message, pageDataText]);

  if (includesAny(haystack, ['reuniao', 'meeting', 'ata', 'follow-up', 'follow up'])) return 'meeting_followup';
  if (includesAny(haystack, ['briefing', 'pauta', 'campanha', 'copy', 'legenda'])) return params.intent === 'creative_execution' ? 'content_generation' : 'briefing_creation';
  if (includesAny(haystack, ['risco', 'atras', 'bloque', 'urgenc', 'critico', 'critico'])) return 'risk_triage';
  if (includesAny(haystack, ['cliente respondeu', 'responder cliente', 'whatsapp', 'mensagem', 'followup comercial', 'follow up comercial'])) return 'relationship_reply';
  if (includesAny(haystack, ['agenda', 'agendar', 'remarcar', 'calendar', 'calendario'])) return 'scheduling';
  if (includesAny(haystack, ['pesquise', 'pesquisar', 'buscar', 'investigar', 'levantamento'])) return 'research';
  if (includesAny(haystack, ['reparo', 'repair', 'corrigir sistema', 'fila', 'webhook', 'watch'])) return 'system_repair';
  if (includesAny(haystack, ['status', 'como esta', 'como está', 'resumo', 'situacao', 'situação'])) return 'status_check';
  if (params.intent === 'creative_execution') return 'content_generation';
  return 'generic';
}

export function resolveJarvisActorProfile(params: {
  role?: string | null;
  pageData?: Record<string, unknown> | null;
  contextPage?: string | null;
  message?: string | null;
}): JarvisActorProfile {
  const override = typeof params.pageData?.jarvis_actor_profile === 'string'
    ? String(params.pageData.jarvis_actor_profile).trim().toLowerCase()
    : '';

  if (['founder', 'atendimento', 'operacao', 'social', 'closer', 'manager'].includes(override)) {
    return override as JarvisActorProfile;
  }

  const role = normalizeRole(params.role);
  switch (role) {
    case 'admin':
      return 'founder';
    case 'manager':
      return inferJarvisActorProfile('manager', params.contextPage, params.message);
    case 'reviewer':
      return 'atendimento';
    case 'staff':
      return inferJarvisActorProfile('operacao', params.contextPage, params.message);
    default:
      return inferJarvisActorProfile('general', params.contextPage, params.message);
  }
}

function inferJarvisActorProfile(
  fallback: JarvisActorProfile,
  contextPage?: string | null,
  message?: string | null,
): JarvisActorProfile {
  const haystack = normalizeText([contextPage, message]);
  if (includesAny(haystack, ['/admin/operacoes', '/operations', 'operacao', 'operacional', 'job', 'prazo', 'fila'])) {
    return fallback === 'founder' ? 'founder' : 'operacao';
  }
  if (includesAny(haystack, ['/studio', 'copy', 'legenda', 'criativo', 'carrossel', 'headline', 'cta'])) {
    return fallback === 'founder' || fallback === 'manager' ? fallback : 'social';
  }
  if (includesAny(haystack, ['comercial', 'proposta', 'fechar', 'closer', 'lead', 'follow up comercial'])) {
    return fallback === 'founder' ? 'founder' : 'closer';
  }
  if (includesAny(haystack, ['/clients/', 'cliente respondeu', 'relacionamento', 'whatsapp', 'atendimento'])) {
    return fallback === 'founder' || fallback === 'manager' ? fallback : 'atendimento';
  }
  return fallback;
}

export function assessJarvisConfidence(params: {
  decision: JarvisRoutingDecision;
  taskType: JarvisTaskType;
  actorProfile: JarvisActorProfile;
  explicitConfirmation?: boolean;
  knowledgeBase?: Pick<ClientKnowledgeBaseSnapshot, 'evidence' | 'directives' | 'commitments' | 'recent_documents' | 'governance' | 'copy_quality_scorecard' | 'retrieval_learning'> | null;
  actionPolicy?: JarvisActionPolicyLearning | null;
  clientState?: Pick<JarvisClientState, 'open_alerts' | 'awareness'> | null;
}): JarvisConfidenceAssessment {
  let score = params.decision.route === 'operations' ? 0.62 : 0.58;
  const reasons: string[] = [];
  const governance = params.knowledgeBase?.governance;
  const retrievalLearning = params.knowledgeBase?.retrieval_learning;
  const actionPolicy = params.actionPolicy;
  const state = params.clientState;

  const evidenceCount = Number(params.knowledgeBase?.evidence?.length || 0);
  const directivesCount = Number(params.knowledgeBase?.directives?.length || 0);
  const commitmentsCount = Number(params.knowledgeBase?.commitments?.length || 0);
  const documentsCount = Number(params.knowledgeBase?.recent_documents?.length || 0);

  if (evidenceCount > 0) {
    score += 0.08;
    reasons.push(`Evidência viva disponível (${evidenceCount})`);
  }
  if (directivesCount > 0) {
    score += 0.05;
    reasons.push(`Diretivas ativas (${directivesCount})`);
  }
  if (commitmentsCount > 0) {
    score += 0.05;
    reasons.push(`Compromissos pendentes (${commitmentsCount})`);
  }
  if (documentsCount > 0) {
    score += 0.04;
    reasons.push(`Documentos recentes (${documentsCount})`);
  }
  if (Number(retrievalLearning?.boosted_facts?.length || 0) > 0) {
    const topBoost = Number(retrievalLearning?.boosted_facts?.[0]?.learning_score || 0);
    score += Math.min(0.08, Math.max(0.02, topBoost * 0.04));
    reasons.push(`Retrieval com histórico positivo (${retrievalLearning?.boosted_facts?.length})`);
  }
  if (Number(retrievalLearning?.penalized_facts?.length || 0) > 0) {
    const topPenalty = Math.abs(Number(retrievalLearning?.penalized_facts?.[0]?.learning_score || 0));
    score -= Math.min(0.1, Math.max(0.03, topPenalty * 0.05));
    reasons.push(`Retrieval com sinais de ruído (${retrievalLearning?.penalized_facts?.length})`);
  }
  if (actionPolicy?.preferred_mode && (actionPolicy.mode_signals?.[0]?.sample_count || 0) >= 2) {
    const preferredModeSignal = Number(actionPolicy.mode_signals[0]?.learning_score || 0);
    if (preferredModeSignal > 0.35) {
      score += Math.min(0.06, preferredModeSignal * 0.04);
      reasons.push(`Política favorece modo ${actionPolicy.preferred_mode}`);
    } else if (preferredModeSignal < -0.25) {
      score -= Math.min(0.06, Math.abs(preferredModeSignal) * 0.04);
      reasons.push(`Política recente penaliza modo ${actionPolicy.preferred_mode}`);
    }
  }

  if (governance?.governance_pressure === 'high') {
    score -= 0.16;
    reasons.push('Governança alta pressiona a memória');
  } else if (governance?.governance_pressure === 'medium') {
    score -= 0.08;
    reasons.push('Governança média exige mais cuidado');
  } else {
    score += 0.03;
  }

  if (Number(governance?.active_conflicts || 0) > 0) {
    score -= 0.09;
    reasons.push(`Conflitos ativos (${governance?.active_conflicts})`);
  }
  if (Number(governance?.stale_facts || 0) > 0) {
    score -= 0.05;
    reasons.push(`Fatos envelhecidos (${governance?.stale_facts})`);
  }

  if (state?.open_alerts && state.open_alerts > 3) {
    score -= 0.04;
    reasons.push(`Cliente sob carga operacional (${state.open_alerts} alertas)`);
  }

  if (params.explicitConfirmation) {
    score += 0.12;
    reasons.push('Usuário confirmou explicitamente');
  }

  if (params.taskType === 'system_repair' || params.taskType === 'scheduling') {
    score -= 0.06;
    reasons.push('Tarefa com impacto operacional real');
  }

  if (params.actorProfile === 'founder' || params.actorProfile === 'manager') {
    score += 0.03;
  }

  score = clamp(score);
  const band: JarvisConfidenceBand = score >= 0.78 ? 'high' : score >= 0.58 ? 'medium' : 'low';
  let mode: JarvisConfidenceMode = 'respond';

  if (params.explicitConfirmation) {
    mode = 'act';
  } else if (band === 'high' && ['status_check', 'research', 'generic', 'meeting_followup'].includes(params.taskType)) {
    mode = 'act';
  } else if (band === 'medium') {
    mode = 'confirm';
  } else if (params.decision.route === 'operations' || ['system_repair', 'scheduling', 'risk_triage'].includes(params.taskType)) {
    mode = 'escalate';
  }

  if (!params.explicitConfirmation && actionPolicy?.preferred_mode && (actionPolicy.mode_signals?.[0]?.sample_count || 0) >= 2) {
    const preferredModeSignal = Number(actionPolicy.mode_signals[0]?.learning_score || 0);
    if (preferredModeSignal > 0.45) {
      if (actionPolicy.preferred_mode === 'act' && band !== 'low' && !['system_repair', 'scheduling'].includes(params.taskType)) {
        mode = 'act';
        reasons.push('Política histórica deslocou a decisão para act');
      } else if (actionPolicy.preferred_mode === 'confirm' && mode === 'respond') {
        mode = 'confirm';
        reasons.push('Política histórica deslocou a decisão para confirm');
      } else if (actionPolicy.preferred_mode === 'escalate' && band !== 'high') {
        mode = 'escalate';
        reasons.push('Política histórica deslocou a decisão para escalate');
      }
    }
  }

  if (!reasons.length) reasons.push('Pouca evidência diferenciadora; fallback para modo conservador');

  return { score: Number(score.toFixed(3)), band, mode, reasons: reasons.slice(0, 6) };
}

export function buildJarvisExecutionPolicy(params: {
  decision: JarvisRoutingDecision;
  taskType: JarvisTaskType;
  actorProfile: JarvisActorProfile;
  confidence: JarvisConfidenceAssessment;
  actionPolicy?: JarvisActionPolicyLearning | null;
  sandboxOnly?: boolean;
}): JarvisExecutionPolicy {
  const defaultStyle: JarvisExecutionPolicy['style'] = (() => {
    switch (params.actorProfile) {
      case 'founder':
        return 'executive';
      case 'closer':
        return 'commercial';
      case 'social':
        return 'social';
      case 'atendimento':
        return 'service';
      case 'operacao':
      case 'manager':
        return 'operational';
      default:
        return 'general';
    }
  })();
  const style = params.actionPolicy?.preferred_style
    && (params.actionPolicy.style_signals?.[0]?.sample_count || 0) >= 2
    && Number(params.actionPolicy.style_signals[0]?.learning_score || 0) > 0.25
    ? params.actionPolicy.preferred_style
    : defaultStyle;

  const requiresExplicitConfirmation =
    !params.sandboxOnly && (
      params.confidence.mode === 'confirm'
      || params.confidence.mode === 'escalate'
      || ['system_repair', 'scheduling'].includes(params.taskType)
    );

  return {
    actorProfile: params.actorProfile,
    taskType: params.taskType,
    confidence: params.confidence,
    style,
    requiresExplicitConfirmation,
    shouldPreferShortAnswer: style === 'executive' || style === 'operational',
    sandboxOnly: params.sandboxOnly === true,
  };
}

export function buildJarvisExecutionPromptBlock(policy: JarvisExecutionPolicy) {
  const parts = [
    'EXECUCAO DO JARVIS:',
    `- Perfil interno: ${policy.actorProfile}`,
    `- Tipo de tarefa: ${policy.taskType}`,
    `- Confiança: ${policy.confidence.band} (${policy.confidence.score})`,
    `- Modo: ${policy.confidence.mode}`,
    `- Estilo: ${policy.style}`,
    ...policy.confidence.reasons.map((reason) => `- Sinal: ${reason}`),
  ];

  if (policy.shouldPreferShortAnswer) {
    parts.push('- Responda com síntese executiva, prioridade e próximo passo, sem floreio.');
  }

  if (policy.requiresExplicitConfirmation) {
    parts.push('- Não assuma execução silenciosa de ações reais sem confirmação humana explícita.');
  }
  if (policy.sandboxOnly) {
    parts.push('- MODO SANDBOX: você pode planejar e chamar tools, mas nenhuma ação write/external deve executar de verdade.');
  }

  return parts.join('\n');
}

export function buildJarvisToolPolicyPromptBlock(policy?: JarvisToolPolicyLearning | null) {
  if (!policy) return '';
  const lines: string[] = [];
  if (policy.preferred_tools.length) {
    lines.push(`- Ferramentas com melhor histórico: ${policy.preferred_tools.slice(0, 4).map((item) => `${item.tool_name} (${item.learning_score.toFixed(2)})`).join(' | ')}`);
  }
  if (policy.penalized_tools.length) {
    lines.push(`- Ferramentas a usar com cautela: ${policy.penalized_tools.slice(0, 3).map((item) => `${item.tool_name} (${item.learning_score.toFixed(2)})`).join(' | ')}`);
  }
  if (!lines.length) return '';
  return `POLÍTICA DE FERRAMENTAS:\n${lines.join('\n')}`;
}

export function buildJarvisActionGate(params: {
  toolName: string;
  category?: string | null;
  explicitConfirmation?: boolean;
  executionPolicy?: JarvisExecutionPolicy | null;
  toolPolicy?: JarvisToolPolicyLearning | null;
}) {
  if (!params.executionPolicy || params.explicitConfirmation) {
    return { allow: true, requiresConfirmation: false, reason: null } satisfies JarvisActionGateDecision;
  }

  const category = String(params.category || 'read');
  if (category === 'read') {
    return { allow: true, requiresConfirmation: false, reason: null } satisfies JarvisActionGateDecision;
  }

  const penalizedTool = params.toolPolicy?.penalized_tools?.find((item) => item.tool_name === params.toolName);
  if (penalizedTool && penalizedTool.learning_score <= -0.35) {
    return {
      allow: false,
      requiresConfirmation: true,
      reason: `Política histórica penaliza ${params.toolName} (${penalizedTool.learning_score.toFixed(2)}). Confirme antes de agir.`,
    } satisfies JarvisActionGateDecision;
  }

  if (params.executionPolicy.confidence.mode === 'act') {
    return { allow: true, requiresConfirmation: false, reason: null } satisfies JarvisActionGateDecision;
  }

  if (params.executionPolicy.confidence.mode === 'confirm') {
    return {
      allow: false,
      requiresConfirmation: true,
      reason: `Confiança ${params.executionPolicy.confidence.band}: ${params.toolName} precisa confirmação humana antes de agir.`,
    } satisfies JarvisActionGateDecision;
  }

  if (params.executionPolicy.confidence.mode === 'escalate') {
    return {
      allow: false,
      requiresConfirmation: false,
      reason: `Confiança ${params.executionPolicy.confidence.band}: ${params.toolName} foi bloqueado e precisa escalada humana.`,
    } satisfies JarvisActionGateDecision;
  }

  return {
    allow: false,
    requiresConfirmation: false,
    reason: `Modo ${params.executionPolicy.confidence.mode}: ${params.toolName} não deve executar ação real neste contexto.`,
  } satisfies JarvisActionGateDecision;
}
