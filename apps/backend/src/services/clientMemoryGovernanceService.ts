import {
  getClientMemoryFactByFingerprint,
  listClientMemoryFacts,
  recordClientMemoryFact,
  updateClientMemoryFactStatus,
  type ClientMemoryFactRow,
} from './clientMemoryFactsService';

export type ClientMemoryGovernanceSuggestion = {
  action: 'archive' | 'replace';
  severity: 'low' | 'medium' | 'high';
  reason: string;
  staleness_score: number;
  target: {
    fingerprint: string;
    fact_type: ClientMemoryFactRow['fact_type'];
    title: string;
    source_type: string | null;
    age_days: number;
    deadline: string | null;
    directive_type: 'boost' | 'avoid' | null;
  };
  replacement?: {
    fingerprint: string;
    fact_type: ClientMemoryFactRow['fact_type'];
    title: string;
    source_type: string | null;
    directive_type: 'boost' | 'avoid' | null;
  } | null;
};

function normalize(value: string) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: string) {
  return normalize(value)
    .split(' ')
    .filter((token) => token.length >= 4)
    .filter((token) => !['cliente', 'briefing', 'email', 'reuniao', 'whatsapp', 'copy'].includes(token));
}

function ageDaysFromFact(fact: ClientMemoryFactRow) {
  const pivot = fact.related_at || fact.deadline || fact.updated_at || null;
  if (!pivot) return 999;
  const timestamp = new Date(pivot).getTime();
  if (Number.isNaN(timestamp)) return 999;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
}

function overlapRatio(a: string, b: string) {
  const aTokens = tokenize(a);
  const bTokens = tokenize(b);
  if (!aTokens.length || !bTokens.length) return 0;
  const bSet = new Set(bTokens);
  const shared = aTokens.filter((token) => bSet.has(token)).length;
  return shared / Math.min(aTokens.length, bTokens.length);
}

function directiveTypeOf(fact: ClientMemoryFactRow) {
  return fact.metadata?.directive_type === 'avoid' ? 'avoid' : fact.fact_type === 'directive' ? 'boost' : null;
}

function buildSuggestionFromFact(params: {
  action: 'archive' | 'replace';
  severity: 'low' | 'medium' | 'high';
  reason: string;
  stalenessScore: number;
  target: ClientMemoryFactRow;
  replacement?: ClientMemoryFactRow | null;
}) {
  const ageDays = ageDaysFromFact(params.target);
  return {
    action: params.action,
    severity: params.severity,
    reason: params.reason,
    staleness_score: params.stalenessScore,
    target: {
      fingerprint: String(params.target.fingerprint || ''),
      fact_type: params.target.fact_type,
      title: params.target.title,
      source_type: params.target.source_type || null,
      age_days: ageDays,
      deadline: params.target.deadline || null,
      directive_type: directiveTypeOf(params.target),
    },
    replacement: params.replacement
      ? {
          fingerprint: String(params.replacement.fingerprint || ''),
          fact_type: params.replacement.fact_type,
          title: params.replacement.title,
          source_type: params.replacement.source_type || null,
          directive_type: directiveTypeOf(params.replacement),
        }
      : null,
  } satisfies ClientMemoryGovernanceSuggestion;
}

export async function analyzeClientMemoryGovernance(params: {
  tenantId: string;
  clientId: string;
  daysBack?: number;
  limit?: number;
}) {
  const facts = await listClientMemoryFacts({
    tenantId: params.tenantId,
    clientId: params.clientId,
    daysBack: Math.min(params.daysBack ?? 365, 365),
    limit: Math.min(params.limit ?? 80, 100),
  });

  if (!facts?.length) {
    return {
      summary: {
        active_facts: 0,
        archive_candidates: 0,
        replace_candidates: 0,
        high_severity: 0,
      },
      suggestions: [] as ClientMemoryGovernanceSuggestion[],
    };
  }

  const suggestions = new Map<string, ClientMemoryGovernanceSuggestion>();
  const factsByRecency = [...facts].sort((a, b) => ageDaysFromFact(a) - ageDaysFromFact(b));

  for (const fact of factsByRecency) {
    const fingerprint = String(fact.fingerprint || '');
    if (!fingerprint) continue;
    const ageDays = ageDaysFromFact(fact);

    if (fact.fact_type === 'commitment' && fact.deadline) {
      const due = new Date(fact.deadline).getTime();
      if (!Number.isNaN(due)) {
        const overdueDays = Math.floor((Date.now() - due) / 86400000);
        if (overdueDays > 14) {
          suggestions.set(
            fingerprint,
            buildSuggestionFromFact({
              action: 'archive',
              severity: overdueDays > 45 ? 'high' : 'medium',
              reason: `Compromisso vencido há ${overdueDays} dias ainda ativo na memória viva.`,
              stalenessScore: Math.min(100, 55 + overdueDays),
              target: fact,
            }),
          );
          continue;
        }
      }
    }

    if (fact.fact_type === 'directive' && ageDays > 180) {
      suggestions.set(
        fingerprint,
        buildSuggestionFromFact({
          action: 'archive',
          severity: ageDays > 300 ? 'high' : 'medium',
          reason: `Diretiva sem refresco há ${ageDays} dias. Revisar ou arquivar para evitar contaminação por regra velha.`,
          stalenessScore: Math.min(100, 35 + Math.floor(ageDays / 3)),
          target: fact,
        }),
      );
      continue;
    }

    if (fact.fact_type === 'evidence' && ageDays > 120 && (fact.confidence_score || 0) < 0.82) {
      suggestions.set(
        fingerprint,
        buildSuggestionFromFact({
          action: 'archive',
          severity: 'low',
          reason: `Evidência antiga e de confiança moderada ainda ativa na memória viva.`,
          stalenessScore: Math.min(100, 20 + Math.floor(ageDays / 4)),
          target: fact,
        }),
      );
    }
  }

  const directives = factsByRecency.filter((fact) => fact.fact_type === 'directive');
  for (let index = 0; index < directives.length; index += 1) {
    const newer = directives[index];
    const newerFingerprint = String(newer.fingerprint || '');
    if (!newerFingerprint) continue;
    for (let inner = index + 1; inner < directives.length; inner += 1) {
      const older = directives[inner];
      const olderFingerprint = String(older.fingerprint || '');
      if (!olderFingerprint || suggestions.has(olderFingerprint)) continue;

      const overlap = overlapRatio(newer.title, older.title) || overlapRatio(newer.fact_text, older.fact_text);
      if (overlap < 0.6) continue;

      const newerDirectiveType = directiveTypeOf(newer);
      const olderDirectiveType = directiveTypeOf(older);
      if (!newerDirectiveType || !olderDirectiveType) continue;

      if (newerDirectiveType === olderDirectiveType) {
        suggestions.set(
          olderFingerprint,
          buildSuggestionFromFact({
            action: 'archive',
            severity: 'medium',
            reason: 'Diretiva duplicada ou muito próxima de uma regra mais nova já ativa.',
            stalenessScore: Math.min(100, 50 + ageDaysFromFact(older)),
            target: older,
            replacement: newer,
          }),
        );
        continue;
      }

      suggestions.set(
        olderFingerprint,
        buildSuggestionFromFact({
          action: 'replace',
          severity: 'high',
          reason: 'Diretiva antiga entra em conflito com uma diretiva mais nova e semanticamente equivalente.',
          stalenessScore: Math.min(100, 65 + ageDaysFromFact(older)),
          target: older,
          replacement: newer,
        }),
      );
    }
  }

  const ordered = Array.from(suggestions.values())
    .sort((a, b) => {
      const severityWeight = { high: 3, medium: 2, low: 1 };
      if (severityWeight[b.severity] !== severityWeight[a.severity]) {
        return severityWeight[b.severity] - severityWeight[a.severity];
      }
      return b.staleness_score - a.staleness_score;
    })
    .slice(0, 12);

  return {
    summary: {
      active_facts: facts.length,
      archive_candidates: ordered.filter((item) => item.action === 'archive').length,
      replace_candidates: ordered.filter((item) => item.action === 'replace').length,
      high_severity: ordered.filter((item) => item.severity === 'high').length,
    },
    suggestions: ordered,
  };
}

export async function applyClientMemoryGovernanceAction(params: {
  tenantId: string;
  clientId: string;
  action: 'archive' | 'replace';
  targetFingerprint: string;
  replacementFingerprint?: string | null;
  replacementFact?: {
    factType: ClientMemoryFactRow['fact_type'];
    title: string;
    factText: string;
    summary?: string | null;
    directiveType?: 'boost' | 'avoid' | null;
    relatedAt?: string | null;
    deadline?: string | null;
    priority?: string | null;
  } | null;
  reason?: string | null;
  confirmedBy?: string | null;
}) {
  const target = await getClientMemoryFactByFingerprint({
    tenantId: params.tenantId,
    clientId: params.clientId,
    fingerprint: params.targetFingerprint,
  });
  if (!target) {
    throw new Error('Fato alvo não encontrado.');
  }

  let replacement = params.replacementFingerprint
    ? await getClientMemoryFactByFingerprint({
        tenantId: params.tenantId,
        clientId: params.clientId,
        fingerprint: params.replacementFingerprint,
      })
    : null;

  if (!replacement && params.action === 'replace' && params.replacementFact) {
    const recorded = await recordClientMemoryFact({
      tenantId: params.tenantId,
      clientId: params.clientId,
      factType: params.replacementFact.factType,
      title: params.replacementFact.title,
      factText: params.replacementFact.factText,
      summary: params.replacementFact.summary || null,
      directiveType: params.replacementFact.directiveType || null,
      relatedAt: params.replacementFact.relatedAt || null,
      deadline: params.replacementFact.deadline || null,
      priority: params.replacementFact.priority || null,
      sourceType: 'jarvis_memory_governance',
      sourceNote: params.reason || 'substituição governada pelo Jarvis',
      confirmedBy: params.confirmedBy || null,
    });
    replacement = await getClientMemoryFactByFingerprint({
      tenantId: params.tenantId,
      clientId: params.clientId,
      fingerprint: recorded.fingerprint,
    });
  }

  if (params.action === 'replace' && !replacement) {
    throw new Error('replace exige replacement_fingerprint ou replacementFact.');
  }

  const updated = await updateClientMemoryFactStatus({
    tenantId: params.tenantId,
    clientId: params.clientId,
    fingerprint: params.targetFingerprint,
    nextStatus: 'archived',
    sourceNote: params.reason || (params.action === 'replace' ? 'substituído por fato mais atual' : 'arquivado por governança do Jarvis'),
    confirmedBy: params.confirmedBy || null,
    supersededByFingerprint: replacement?.fingerprint || null,
  });

  return {
    action: params.action,
    target: updated,
    replacement,
  };
}
