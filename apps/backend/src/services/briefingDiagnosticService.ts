import type { ClientLivingMemory } from './clientLivingMemoryService';

export type BriefingDiagnostics = {
  gaps: string[];
  tensions: string[];
  recommendations: string[];
  block: string;
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
}): BriefingDiagnostics {
  const { briefing, livingMemory } = params;
  const payload = briefing.payload || {};
  const briefingText = buildBriefingText(briefing);
  const normalizedText = normalize(briefingText);

  const gaps: string[] = [];
  const tensions: string[] = [];
  const recommendations: string[] = [];

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
  if (!hasDateSignal(briefingText) && livingMemory.pendingActions.length > 0) {
    gaps.push('Briefing nao menciona data, prazo ou marco temporal apesar de haver compromissos pendentes no contexto do cliente.');
  }
  if (briefingText.replace(/\s+/g, ' ').trim().length < 180 && livingMemory.evidence.length > 0) {
    gaps.push('Briefing curto para o volume de contexto implicito ja presente na memoria viva do cliente.');
  }

  const directiveConflicts = findDirectiveConflicts(briefingText, livingMemory);
  if (directiveConflicts.length > 0) {
    tensions.push(`O texto do briefing encosta em diretivas de evitar do cliente: ${directiveConflicts.join(' | ')}`);
  }
  if (!hasDateSignal(briefingText) && livingMemory.evidence.some((item) => item.score >= 2.5)) {
    tensions.push('Ha evidencias recentes relevantes na memoria viva que nao aparecem explicitamente no briefing.');
  }

  if (livingMemory.pendingActions.length > 0) {
    recommendations.push('Antes de escrever, alinhar a copy aos compromissos pendentes e datas vivas do cliente.');
  }
  if (livingMemory.directives.length > 0) {
    recommendations.push('Respeitar as diretivas ativas do cliente como restricoes de primeira ordem, mesmo quando o briefing nao mencionar isso.');
  }
  if (livingMemory.evidence.length > 0) {
    recommendations.push('Usar as evidencias recentes para interpretar contexto implicito, tom e timing da mensagem.');
  }

  const lines: string[] = [];
  if (gaps.length || tensions.length || recommendations.length) {
    lines.push('DIAGNOSTICO DO BRIEFING:');
    if (gaps.length) lines.push(`- Lacunas: ${gaps.join(' | ')}`);
    if (tensions.length) lines.push(`- Tensoes: ${tensions.join(' | ')}`);
    if (recommendations.length) lines.push(`- Recomendacoes: ${recommendations.join(' | ')}`);
  }

  return {
    gaps,
    tensions,
    recommendations,
    block: lines.join('\n'),
  };
}
