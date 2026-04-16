import { query } from '../db';
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

export type ClientMemoryGovernanceConflict = {
  severity: 'medium' | 'high';
  reason: string;
  primary: {
    fingerprint: string;
    fact_type: ClientMemoryFactRow['fact_type'];
    title: string;
  };
  conflicting: {
    fingerprint: string;
    fact_type: ClientMemoryFactRow['fact_type'];
    title: string;
  };
};

export type ClientMemoryConflictRow = {
  conflict_key: string;
  severity: 'medium' | 'high';
  reason: string;
  status: 'active' | 'resolved';
  detected_at: string | null;
  resolved_at: string | null;
  primary: {
    fingerprint: string;
    fact_type: ClientMemoryFactRow['fact_type'];
    title: string;
  };
  conflicting: {
    fingerprint: string;
    fact_type: ClientMemoryFactRow['fact_type'];
    title: string;
  };
  metadata: Record<string, any>;
};

type GovernancePressure = 'low' | 'medium' | 'high';

function isMissingConflictTableError(error: unknown) {
  const candidate = error as { code?: string; message?: string };
  return candidate?.code === '42P01' || /client_memory_fact_conflicts/i.test(String(candidate?.message || ''));
}

function isMissingResolutionTableError(error: unknown) {
  const candidate = error as { code?: string; message?: string };
  return candidate?.code === '42P01' || /client_memory_resolution_log/i.test(String(candidate?.message || ''));
}

function buildConflictKey(primaryFingerprint: string, conflictingFingerprint: string) {
  return [primaryFingerprint, conflictingFingerprint].sort().join('::');
}

export type ClientMemoryGovernanceAnalysis = {
  summary: {
    active_facts: number;
    archive_candidates: number;
    replace_candidates: number;
    high_severity: number;
    stale_facts: number;
    stale_directives: number;
    stale_commitments: number;
    active_conflicts: number;
    governance_pressure: GovernancePressure;
  };
  suggestions: ClientMemoryGovernanceSuggestion[];
  conflicts: ClientMemoryGovernanceConflict[];
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

function agingBand(ageDays: number) {
  if (ageDays <= 30) return 'fresh';
  if (ageDays <= 120) return 'aging';
  return 'stale';
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
}): Promise<ClientMemoryGovernanceAnalysis> {
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
        stale_facts: 0,
        stale_directives: 0,
        stale_commitments: 0,
        active_conflicts: 0,
        governance_pressure: 'low',
      },
      suggestions: [] as ClientMemoryGovernanceSuggestion[],
      conflicts: [] as ClientMemoryGovernanceConflict[],
    };
  }

  const suggestions = new Map<string, ClientMemoryGovernanceSuggestion>();
  const conflicts = new Map<string, ClientMemoryGovernanceConflict>();
  const factsByRecency = [...facts].sort((a, b) => ageDaysFromFact(a) - ageDaysFromFact(b));
  const staleFacts = facts.filter((fact) => agingBand(ageDaysFromFact(fact)) === 'stale');

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

      const conflictKey = [newerFingerprint, olderFingerprint].sort().join('::');
      conflicts.set(conflictKey, {
        severity: 'high',
        reason: 'Duas diretivas semanticamente equivalentes apontam em direções opostas dentro da memória viva.',
        primary: {
          fingerprint: newerFingerprint,
          fact_type: newer.fact_type,
          title: newer.title,
        },
        conflicting: {
          fingerprint: olderFingerprint,
          fact_type: older.fact_type,
          title: older.title,
        },
      });

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

  const commitments = factsByRecency.filter((fact) => fact.fact_type === 'commitment');
  for (let index = 0; index < commitments.length; index += 1) {
    const primary = commitments[index];
    const primaryFingerprint = String(primary.fingerprint || '');
    if (!primaryFingerprint) continue;
    for (let inner = index + 1; inner < commitments.length; inner += 1) {
      const conflicting = commitments[inner];
      const conflictingFingerprint = String(conflicting.fingerprint || '');
      if (!conflictingFingerprint) continue;

      const overlap = overlapRatio(primary.title, conflicting.title) || overlapRatio(primary.fact_text, conflicting.fact_text);
      if (overlap < 0.65) continue;
      if (!primary.deadline || !conflicting.deadline || primary.deadline === conflicting.deadline) continue;

      const primaryDeadline = new Date(primary.deadline).getTime();
      const conflictingDeadline = new Date(conflicting.deadline).getTime();
      if (Number.isNaN(primaryDeadline) || Number.isNaN(conflictingDeadline)) continue;

      const deltaDays = Math.abs(primaryDeadline - conflictingDeadline) / 86400000;
      if (deltaDays < 7) continue;

      const conflictKey = [primaryFingerprint, conflictingFingerprint].sort().join('::');
      conflicts.set(conflictKey, {
        severity: deltaDays >= 21 ? 'high' : 'medium',
        reason: `Dois compromissos ativos parecem falar da mesma entrega, mas com prazos divergentes (${primary.deadline} vs ${conflicting.deadline}).`,
        primary: {
          fingerprint: primaryFingerprint,
          fact_type: primary.fact_type,
          title: primary.title,
        },
        conflicting: {
          fingerprint: conflictingFingerprint,
          fact_type: conflicting.fact_type,
          title: conflicting.title,
        },
      });
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

  const orderedConflicts = Array.from(conflicts.values())
    .sort((a, b) => (a.severity === 'high' ? 1 : 0) === (b.severity === 'high' ? 1 : 0) ? 0 : a.severity === 'high' ? -1 : 1)
    .slice(0, 8);

  const staleDirectives = staleFacts.filter((fact) => fact.fact_type === 'directive').length;
  const staleCommitments = staleFacts.filter((fact) => fact.fact_type === 'commitment').length;
  const highSeverityCount = ordered.filter((item) => item.severity === 'high').length + orderedConflicts.filter((item) => item.severity === 'high').length;
  const governancePressure: GovernancePressure =
    highSeverityCount >= 2 || orderedConflicts.length >= 2 ? 'high'
    : ordered.length >= 3 || orderedConflicts.length >= 1 ? 'medium'
    : 'low';

  return {
    summary: {
      active_facts: facts.length,
      archive_candidates: ordered.filter((item) => item.action === 'archive').length,
      replace_candidates: ordered.filter((item) => item.action === 'replace').length,
      high_severity: highSeverityCount,
      stale_facts: staleFacts.length,
      stale_directives: staleDirectives,
      stale_commitments: staleCommitments,
      active_conflicts: orderedConflicts.length,
      governance_pressure: governancePressure,
    },
    suggestions: ordered,
    conflicts: orderedConflicts,
  };
}

export async function syncClientMemoryGovernanceState(params: {
  tenantId: string;
  clientId: string;
  daysBack?: number;
  limit?: number;
}): Promise<ClientMemoryGovernanceAnalysis> {
  const analysis = await analyzeClientMemoryGovernance(params);

  try {
    const activeConflictKeys = analysis.conflicts.map((item) =>
      buildConflictKey(item.primary.fingerprint, item.conflicting.fingerprint),
    );

    for (const conflict of analysis.conflicts) {
      const conflictKey = buildConflictKey(conflict.primary.fingerprint, conflict.conflicting.fingerprint);
      await query(
        `INSERT INTO client_memory_fact_conflicts (
           tenant_id, client_id, conflict_key, primary_fingerprint, conflicting_fingerprint,
           severity, reason, status, resolved_at, metadata
         )
         VALUES (
           $1, $2, $3, $4, $5,
           $6, $7, 'active', NULL, $8::jsonb
         )
         ON CONFLICT (tenant_id, client_id, conflict_key)
         DO UPDATE SET
           primary_fingerprint = EXCLUDED.primary_fingerprint,
           conflicting_fingerprint = EXCLUDED.conflicting_fingerprint,
           severity = EXCLUDED.severity,
           reason = EXCLUDED.reason,
           status = 'active',
           resolved_at = NULL,
           metadata = EXCLUDED.metadata,
           detected_at = now()`,
        [
          params.tenantId,
          params.clientId,
          conflictKey,
          conflict.primary.fingerprint,
          conflict.conflicting.fingerprint,
          conflict.severity,
          conflict.reason,
          JSON.stringify({
            primary: conflict.primary,
            conflicting: conflict.conflicting,
          }),
        ],
      );
    }

    if (activeConflictKeys.length > 0) {
      await query(
        `UPDATE client_memory_fact_conflicts
            SET status = 'resolved',
                resolved_at = now()
          WHERE tenant_id = $1
            AND client_id = $2
            AND status = 'active'
            AND NOT (conflict_key = ANY($3::text[]))`,
        [params.tenantId, params.clientId, activeConflictKeys],
      );
    } else {
      await query(
        `UPDATE client_memory_fact_conflicts
            SET status = 'resolved',
                resolved_at = now()
          WHERE tenant_id = $1
            AND client_id = $2
            AND status = 'active'`,
        [params.tenantId, params.clientId],
      );
    }
  } catch (error) {
    if (!isMissingConflictTableError(error)) throw error;
  }

  return analysis;
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
    expiresAt: new Date().toISOString(),
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

export async function listClientMemoryConflicts(params: {
  tenantId: string;
  clientId: string;
  status?: 'active' | 'resolved';
  limit?: number;
}) {
  try {
    const { rows } = await query<any>(
      `SELECT conflict_key,
              severity,
              reason,
              status,
              detected_at::text,
              resolved_at::text,
              metadata
         FROM client_memory_fact_conflicts
        WHERE tenant_id = $1
          AND client_id = $2
          AND ($3::text IS NULL OR status = $3)
        ORDER BY detected_at DESC
        LIMIT $4`,
      [params.tenantId, params.clientId, params.status || null, Math.min(params.limit ?? 20, 50)],
    );
    return rows.map((row) => ({
      conflict_key: row.conflict_key,
      severity: row.severity,
      reason: row.reason,
      status: row.status,
      detected_at: row.detected_at || null,
      resolved_at: row.resolved_at || null,
      primary: row.metadata?.primary || { fingerprint: '', fact_type: 'evidence', title: '' },
      conflicting: row.metadata?.conflicting || { fingerprint: '', fact_type: 'evidence', title: '' },
      metadata: row.metadata || {},
    })) satisfies ClientMemoryConflictRow[];
  } catch (error) {
    if (isMissingConflictTableError(error)) return [];
    throw error;
  }
}

async function logClientMemoryResolution(params: {
  tenantId: string;
  clientId: string;
  conflictKey?: string | null;
  fingerprint?: string | null;
  action: string;
  actorId?: string | null;
  actorEmail?: string | null;
  note?: string | null;
  payload?: Record<string, any>;
}) {
  try {
    await query(
      `INSERT INTO client_memory_resolution_log (
         tenant_id, client_id, conflict_key, fingerprint, action, actor_id, actor_email, note, payload
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
      [
        params.tenantId,
        params.clientId,
        params.conflictKey || null,
        params.fingerprint || null,
        params.action,
        params.actorId || null,
        params.actorEmail || null,
        params.note || null,
        JSON.stringify(params.payload || {}),
      ],
    );
  } catch (error) {
    if (!isMissingResolutionTableError(error)) throw error;
  }
}

export async function resolveClientMemoryConflict(params: {
  tenantId: string;
  clientId: string;
  conflictKey: string;
  resolution: 'keep_primary' | 'keep_conflicting' | 'archive_both' | 'dismiss';
  note?: string | null;
  confirmedBy?: string | null;
  actorId?: string | null;
  actorEmail?: string | null;
}) {
  const conflicts = await listClientMemoryConflicts({
    tenantId: params.tenantId,
    clientId: params.clientId,
    status: 'active',
    limit: 100,
  });
  const conflict = conflicts.find((item) => item.conflict_key === params.conflictKey);
  if (!conflict) throw new Error('Conflito não encontrado.');

  const affected: Array<{ fingerprint: string; status: string | null }> = [];
  if (params.resolution === 'keep_primary') {
    const updated = await updateClientMemoryFactStatus({
      tenantId: params.tenantId,
      clientId: params.clientId,
      fingerprint: conflict.conflicting.fingerprint,
      nextStatus: 'archived',
      expiresAt: new Date().toISOString(),
      sourceNote: params.note || 'resolução humana: manter fato primário',
      confirmedBy: params.confirmedBy || null,
      supersededByFingerprint: conflict.primary.fingerprint,
    });
    affected.push({ fingerprint: conflict.conflicting.fingerprint, status: updated?.status || null });
  } else if (params.resolution === 'keep_conflicting') {
    const updated = await updateClientMemoryFactStatus({
      tenantId: params.tenantId,
      clientId: params.clientId,
      fingerprint: conflict.primary.fingerprint,
      nextStatus: 'archived',
      expiresAt: new Date().toISOString(),
      sourceNote: params.note || 'resolução humana: manter fato conflitante',
      confirmedBy: params.confirmedBy || null,
      supersededByFingerprint: conflict.conflicting.fingerprint,
    });
    affected.push({ fingerprint: conflict.primary.fingerprint, status: updated?.status || null });
  } else if (params.resolution === 'archive_both') {
    for (const fingerprint of [conflict.primary.fingerprint, conflict.conflicting.fingerprint]) {
      const updated = await updateClientMemoryFactStatus({
        tenantId: params.tenantId,
        clientId: params.clientId,
        fingerprint,
        nextStatus: 'archived',
        expiresAt: new Date().toISOString(),
        sourceNote: params.note || 'resolução humana: arquivar ambos os fatos em conflito',
        confirmedBy: params.confirmedBy || null,
      });
      affected.push({ fingerprint, status: updated?.status || null });
    }
  }

  try {
    await query(
      `UPDATE client_memory_fact_conflicts
          SET status = 'resolved',
              resolved_at = now(),
              metadata = COALESCE(metadata, '{}'::jsonb) || $4::jsonb
        WHERE tenant_id = $1
          AND client_id = $2
          AND conflict_key = $3`,
      [
        params.tenantId,
        params.clientId,
        params.conflictKey,
        JSON.stringify({
          human_resolution: params.resolution,
          note: params.note || null,
          confirmed_by: params.confirmedBy || null,
          resolved_at: new Date().toISOString(),
        }),
      ],
    );
  } catch (error) {
    if (!isMissingConflictTableError(error)) throw error;
  }

  await logClientMemoryResolution({
    tenantId: params.tenantId,
    clientId: params.clientId,
    conflictKey: params.conflictKey,
    action: `resolve_conflict:${params.resolution}`,
    actorId: params.actorId || null,
    actorEmail: params.actorEmail || null,
    note: params.note || null,
    payload: {
      conflict,
      affected,
    },
  });

  return {
    conflict_key: params.conflictKey,
    resolution: params.resolution,
    affected,
  };
}
