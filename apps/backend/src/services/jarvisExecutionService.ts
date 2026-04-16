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

export type JarvisExecutionPolicy = {
  actorProfile: JarvisActorProfile;
  taskType: JarvisTaskType;
  confidence: JarvisConfidenceAssessment;
  style: 'executive' | 'operational' | 'commercial' | 'social' | 'service' | 'general';
  requiresExplicitConfirmation: boolean;
  shouldPreferShortAnswer: boolean;
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
      return 'manager';
    case 'reviewer':
      return 'atendimento';
    case 'staff':
      return 'operacao';
    default:
      return 'general';
  }
}

export function assessJarvisConfidence(params: {
  decision: JarvisRoutingDecision;
  taskType: JarvisTaskType;
  actorProfile: JarvisActorProfile;
  explicitConfirmation?: boolean;
  knowledgeBase?: Pick<ClientKnowledgeBaseSnapshot, 'evidence' | 'directives' | 'commitments' | 'recent_documents' | 'governance' | 'copy_quality_scorecard' | 'retrieval_learning'> | null;
  clientState?: Pick<JarvisClientState, 'open_alerts' | 'awareness'> | null;
}): JarvisConfidenceAssessment {
  let score = params.decision.route === 'operations' ? 0.62 : 0.58;
  const reasons: string[] = [];
  const governance = params.knowledgeBase?.governance;
  const retrievalLearning = params.knowledgeBase?.retrieval_learning;
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

  if (!reasons.length) reasons.push('Pouca evidência diferenciadora; fallback para modo conservador');

  return { score: Number(score.toFixed(3)), band, mode, reasons: reasons.slice(0, 6) };
}

export function buildJarvisExecutionPolicy(params: {
  decision: JarvisRoutingDecision;
  taskType: JarvisTaskType;
  actorProfile: JarvisActorProfile;
  confidence: JarvisConfidenceAssessment;
}): JarvisExecutionPolicy {
  const style: JarvisExecutionPolicy['style'] = (() => {
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

  const requiresExplicitConfirmation =
    params.confidence.mode === 'confirm'
    || params.confidence.mode === 'escalate'
    || ['system_repair', 'scheduling'].includes(params.taskType);

  return {
    actorProfile: params.actorProfile,
    taskType: params.taskType,
    confidence: params.confidence,
    style,
    requiresExplicitConfirmation,
    shouldPreferShortAnswer: style === 'executive' || style === 'operational',
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

  return parts.join('\n');
}

export function buildJarvisActionGate(params: {
  toolName: string;
  category?: string | null;
  explicitConfirmation?: boolean;
  executionPolicy?: JarvisExecutionPolicy | null;
}) {
  if (!params.executionPolicy || params.explicitConfirmation) {
    return { allow: true, requiresConfirmation: false, reason: null } satisfies JarvisActionGateDecision;
  }

  const category = String(params.category || 'read');
  if (category === 'read') {
    return { allow: true, requiresConfirmation: false, reason: null } satisfies JarvisActionGateDecision;
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
