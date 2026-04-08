import type { ClientLivingMemory } from './clientLivingMemoryService';
import type { ReporteiSemanticSummary } from './reporteiSemanticService';

type ConflictSeverity = 'none' | 'low' | 'medium' | 'high';

export type BriefingConflict = {
  type: 'directive' | 'decision' | 'objection' | 'commitment' | 'memory_governance';
  severity: Exclude<ConflictSeverity, 'none'>;
  message: string;
};

type MemoryGovernanceInput = {
  summary: {
    stale_facts?: number;
    stale_directives?: number;
    stale_commitments?: number;
    active_conflicts?: number;
    governance_pressure?: 'low' | 'medium' | 'high';
  };
};

export type BriefingDiagnostics = {
  gaps: string[];
  tensions: string[];
  recommendations: string[];
  conflicts: BriefingConflict[];
  severity: ConflictSeverity;
  requires_confirmation: boolean;
  recommended_resolution: string | null;
  block: string;
  quantitative_summary?: {
    integrations: number;
    families: string[];
    top_metrics: string[];
  } | null;
};

const DATE_HINTS = [
  'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo',
];

function normalize(value: string) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function buildBriefingText(briefing: {
  title?: string | null;
  objective?: string | null;
  context?: string | null;
  payload?: Record<string, any> | null;
}) {
  const payload = briefing.payload || {};
  return [
    briefing.title,
    briefing.objective,
    briefing.context,
    payload.notes,
    payload.additional_notes,
    payload.target_audience,
    payload.cta,
    payload.references,
    payload.key_message,
  ].filter(Boolean).join('\n');
}

function hasDateSignal(text: string) {
  const normalized = normalize(text);
  return /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/.test(normalized)
    || /\b\d{4}-\d{2}-\d{2}\b/.test(normalized)
    || DATE_HINTS.some((token) => normalized.includes(token));
}

function findDirectiveConflicts(text: string, livingMemory: ClientLivingMemory) {
  const normalized = normalize(text);
  return livingMemory.directives
    .filter((directive) => directive.directive_type === 'avoid')
    .map((directive) => directive.directive)
    .filter((directive) => {
      const tokens = normalize(directive).split(/[^a-z0-9]+/).filter((token) => token.length >= 5);
      return tokens.some((token) => normalized.includes(token));
    });
}

function extractSignalTokens(text: string) {
  return Array.from(
    new Set(
      normalize(text)
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 5)
        .filter((token) => !['cliente', 'briefing', 'reuniao', 'email', 'whatsapp', 'copy', 'texto', 'tom'].includes(token)),
    ),
  );
}

function hasMeaningfulOverlap(briefingText: string, referenceText: string) {
  const normalizedBriefing = normalize(briefingText);
  const tokens = extractSignalTokens(referenceText);
  if (!tokens.length) return false;
  const overlap = tokens.filter((token) => normalizedBriefing.includes(token));
  return overlap.length >= Math.min(2, tokens.length);
}

function resolveConflictSeverity(conflicts: BriefingConflict[]): ConflictSeverity {
  if (conflicts.some((item) => item.severity === 'high')) return 'high';
  if (conflicts.some((item) => item.severity === 'medium')) return 'medium';
  if (conflicts.some((item) => item.severity === 'low')) return 'low';
  return 'none';
}

function resolveRecommendedResolution(conflicts: BriefingConflict[]) {
  if (!conflicts.length) return null;
  if (conflicts.some((item) => item.type === 'memory_governance' && item.severity === 'high')) {
    return 'Revisar e limpar a memória viva do cliente antes de criar, porque há conflito interno ou pressão alta de governança.';
  }
  if (conflicts.some((item) => item.type === 'directive' && item.severity === 'high')) {
    return 'Revisar o briefing para remover o conflito com restrições ativas do cliente antes de criar.';
  }
  if (conflicts.some((item) => item.type === 'decision')) {
    return 'Alinhar o briefing às decisões recentes já registradas para o cliente antes de seguir.';
  }
  if (conflicts.some((item) => item.type === 'objection')) {
    return 'Explicitar no briefing como as objeções e sensibilidades recentes serão respeitadas.';
  }
  if (conflicts.some((item) => item.type === 'commitment')) {
    return 'Conferir prazo, CTA e timing do briefing com os compromissos pendentes do cliente.';
  }
  return 'Revisar o briefing com base na memória viva antes de continuar.';
}

export function buildBriefingDiagnostics(params: {
  briefing: {
    title?: string | null;
    objective?: string | null;
    context?: string | null;
    platform?: string | null;
    format?: string | null;
    payload?: Record<string, any> | null;
  };
  livingMemory: ClientLivingMemory;
  memoryGovernance?: MemoryGovernanceInput | null;
  reporteiSummary?: ReporteiSemanticSummary | null;
}): BriefingDiagnostics {
  const { briefing, livingMemory, memoryGovernance, reporteiSummary } = params;
  const payload = briefing.payload || {};
  const briefingText = buildBriefingText(briefing);
  const normalizedText = normalize(briefingText);
  const quantitativeFamilies = reporteiSummary?.family_summary?.map((item) => item.family) ?? [];
  const quantitativeTopMetrics = reporteiSummary?.top_metrics?.slice(0, 4).map((item) => item.reference_key) ?? [];

  const gaps: string[] = [];
  const tensions: string[] = [];
  const recommendations: string[] = [];
  const conflicts: BriefingConflict[] = [];

  if (!String(briefing.objective || '').trim()) {
    gaps.push('Objetivo do briefing pouco explicito ou ausente.');
  }
  if (!String(briefing.platform || payload.platform || '').trim()) {
    gaps.push('Plataforma nao esta explicitada.');
  }
  if (!String(briefing.format || payload.format || payload.creative_format || '').trim()) {
    gaps.push('Formato da entrega nao esta explicitado.');
  }
  if (!String(payload.target_audience || payload.persona_id || '').trim()) {
    gaps.push('Publico-alvo ou persona nao estao claros.');
  }
  if (!String(payload.cta || '').trim()) {
    gaps.push('CTA ou proxima acao desejada nao estao claros.');
  }
  if (reporteiSummary?.integrations && !String(briefing.platform || payload.platform || '').trim()) {
    gaps.push('Briefing nao explicita plataforma apesar de haver sinais quantitativos recentes do Reportei para orientar a decisão.');
  }
  if (!hasDateSignal(briefingText) && livingMemory.pendingActions.length > 0) {
    gaps.push('Briefing nao menciona data, prazo ou marco temporal apesar de haver compromissos pendentes no contexto do cliente.');
  }
  if (briefingText.replace(/\s+/g, ' ').trim().length < 180 && livingMemory.evidence.length > 0) {
    gaps.push('Briefing curto para o volume de contexto implicito ja presente na memoria viva do cliente.');
  }
  if (quantitativeFamilies.includes('conversion') && !String(payload.cta || '').trim()) {
    gaps.push('Há sinais quantitativos de conversão/tráfego no Reportei, mas o briefing não deixa claro qual ação o conteúdo deve perseguir.');
  }

  const directiveConflicts = findDirectiveConflicts(briefingText, livingMemory);
  const decisionSignals = livingMemory.evidence.filter((item) => item.semantic_type === 'decision');
  const objectionSignals = livingMemory.evidence.filter((item) => item.semantic_type === 'objection');
  if (directiveConflicts.length > 0) {
    tensions.push(`O texto do briefing encosta em diretivas de evitar do cliente: ${directiveConflicts.join(' | ')}`);
    directiveConflicts.slice(0, 2).forEach((directive) => {
      conflicts.push({
        type: 'directive',
        severity: 'high',
        message: `O briefing conflita com a restrição ativa do cliente: ${directive}`,
      });
    });
  }
  if (!hasDateSignal(briefingText) && livingMemory.evidence.some((item) => item.score >= 2.5)) {
    tensions.push('Ha evidencias recentes relevantes na memoria viva que nao aparecem explicitamente no briefing.');
  }
  if (reporteiSummary?.integrations && quantitativeFamilies.length && briefingText.replace(/\s+/g, ' ').trim().length < 240) {
    tensions.push(`O briefing não traduz os sinais quantitativos recentes do Reportei (${quantitativeFamilies.join(', ')}) em decisão criativa explícita.`);
  }
  if (decisionSignals.length > 0 && briefingText.replace(/\s+/g, ' ').trim().length < 220) {
    tensions.push('Ha decisoes recentes do cliente registradas na memoria viva que o briefing nao explicita com clareza.');
  }
  if (objectionSignals.length > 0 && !/obje[cç][aã]o|restri[cç][aã]o|cuidado|evitar|nao|não/.test(normalizedText)) {
    tensions.push('Ha objeções ou sensibilidades recentes do cliente que nao aparecem explicitamente no briefing.');
  }
  if ((memoryGovernance?.summary.active_conflicts || 0) > 0) {
    tensions.push('A memória viva do cliente tem conflitos internos ativos; confiar cegamente no contexto acumulado pode gerar desalinhamento.');
    conflicts.push({
      type: 'memory_governance',
      severity: memoryGovernance?.summary.governance_pressure === 'high' ? 'high' : 'medium',
      message: `A memória viva do cliente contém ${memoryGovernance?.summary.active_conflicts} conflito(s) ativo(s) e precisa revisão antes da criação.`,
    });
  }
  if ((memoryGovernance?.summary.stale_directives || 0) > 0) {
    tensions.push('Existem diretivas antigas ainda ativas na memória viva que podem contaminar a interpretação do briefing.');
  }
  if ((memoryGovernance?.summary.stale_commitments || 0) > 0) {
    tensions.push('Existem compromissos antigos ou vencidos ainda ativos na memória viva do cliente.');
  }
  decisionSignals
    .filter((item) => !hasMeaningfulOverlap(briefingText, `${item.title || ''} ${item.excerpt}`))
    .slice(0, 2)
    .forEach((item) => {
      conflicts.push({
        type: 'decision',
        severity: 'medium',
        message: `Decisão recente não refletida no briefing: ${item.title || item.excerpt}`,
      });
    });
  objectionSignals
    .filter((item) => !hasMeaningfulOverlap(briefingText, `${item.title || ''} ${item.excerpt}`))
    .slice(0, 2)
    .forEach((item) => {
      conflicts.push({
        type: 'objection',
        severity: 'medium',
        message: `Objeção ou sensibilidade recente não contemplada no briefing: ${item.title || item.excerpt}`,
      });
    });
  if (!hasDateSignal(briefingText) && livingMemory.pendingActions.some((item) => item.deadline)) {
    conflicts.push({
      type: 'commitment',
      severity: 'medium',
      message: 'O briefing ignora prazos ativos do cliente mesmo havendo compromissos pendentes com data.',
    });
  }

  if (livingMemory.pendingActions.length > 0) {
    recommendations.push('Antes de escrever, alinhar a copy aos compromissos pendentes e datas vivas do cliente.');
  }
  if (reporteiSummary?.integrations) {
    recommendations.push('Cruzar o briefing com os sinais quantitativos recentes do Reportei para calibrar plataforma, gancho, formato e CTA.');
  }
  if (quantitativeFamilies.includes('engagement') || quantitativeFamilies.includes('reach')) {
    recommendations.push('Usar os sinais de alcance e engajamento do Reportei para priorizar o tipo de hook e o grau de explicação da peça.');
  }
  if (quantitativeFamilies.includes('traffic') || quantitativeFamilies.includes('conversion')) {
    recommendations.push('Se a peça precisa gerar ação, amarrar CTA e destino aos sinais de tráfego/conversão mais fortes do Reportei.');
  }
  if (livingMemory.directives.length > 0) {
    recommendations.push('Respeitar as diretivas ativas do cliente como restricoes de primeira ordem, mesmo quando o briefing nao mencionar isso.');
  }
  if (livingMemory.evidence.length > 0) {
    recommendations.push('Usar as evidencias recentes para interpretar contexto implicito, tom e timing da mensagem.');
  }
  if (decisionSignals.length > 0) {
    recommendations.push('Tratar as decisões recentes do cliente como contexto válido, mesmo quando o briefing não as repetir literalmente.');
  }
  if (objectionSignals.length > 0) {
    recommendations.push('Evitar conflito com objeções e sensibilidades já expressas pelo cliente em conversas recentes.');
  }
  if ((memoryGovernance?.summary.stale_facts || 0) > 0) {
    recommendations.push('Antes de confiar totalmente no contexto acumulado, revisar fatos envelhecidos ou em conflito na memória viva do cliente.');
  }

  const severity = resolveConflictSeverity(conflicts);
  const requiresConfirmation = severity === 'high' || conflicts.filter((item) => item.severity === 'medium').length >= 2;
  const recommendedResolution = resolveRecommendedResolution(conflicts);
  const quantitativeSummary = reporteiSummary?.integrations
    ? {
        integrations: reporteiSummary.integrations,
        families: quantitativeFamilies,
        top_metrics: quantitativeTopMetrics,
      }
    : null;

  const lines: string[] = [];
  if (gaps.length || tensions.length || recommendations.length || conflicts.length) {
    lines.push('DIAGNOSTICO DO BRIEFING:');
    if (gaps.length) lines.push(`- Lacunas: ${gaps.join(' | ')}`);
    if (tensions.length) lines.push(`- Tensoes: ${tensions.join(' | ')}`);
    if (conflicts.length) lines.push(`- Conflitos: ${conflicts.map((item) => item.message).join(' | ')}`);
    if (memoryGovernance?.summary.governance_pressure && memoryGovernance.summary.governance_pressure !== 'low') {
      lines.push(`- Governança da memória: pressão ${memoryGovernance.summary.governance_pressure}, fatos envelhecidos ${memoryGovernance.summary.stale_facts || 0}, conflitos internos ${memoryGovernance.summary.active_conflicts || 0}`);
    }
    if (quantitativeSummary?.families.length) {
      lines.push(`- Reportei: integrações ${quantitativeSummary.integrations}, famílias ${quantitativeSummary.families.join(', ')}, métricas-chave ${quantitativeSummary.top_metrics.join(' | ')}`);
    }
    if (recommendations.length) lines.push(`- Recomendacoes: ${recommendations.join(' | ')}`);
    if (requiresConfirmation) {
      lines.push(`- Gate: conflito ${severity}. Pedir confirmação explícita antes de criar.`);
    } else if (severity !== 'none') {
      lines.push(`- Gate: conflito ${severity}. Seguir com cautela e explicitar a compensação.`);
    }
  }

  return {
    gaps,
    tensions,
    recommendations,
    conflicts,
    severity,
    requires_confirmation: requiresConfirmation,
    recommended_resolution: recommendedResolution,
    block: lines.join('\n'),
    quantitative_summary: quantitativeSummary,
  };
}
