import { query } from '../db';

type DemandCandidate = {
  status: 'eligible' | 'needs_internal_triage' | 'ignored';
  demandKind: string;
  title: string;
  summary: string;
  clientId: string | null;
  priorityHint: string | null;
  platform: string | null;
  deadline: string | null;
  nextStep: 'briefing_compile' | 'internal_triage' | 'ignore';
  reasons: string[];
};

type DemandSource = {
  type: string;
  id: string;
  occurredAt?: string | null;
};

type DemandQueuePayload = {
  fingerprint: string;
  source: DemandSource;
  summary: {
    title: string;
    description?: string | null;
    objective?: string | null;
    platform?: string | null;
    deadline?: string | null;
  };
};

function normalizeText(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: unknown) {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length >= 4);
}

function overlapRatio(a: string[], b: string[]) {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let overlap = 0;
  setA.forEach((token) => {
    if (setB.has(token)) overlap += 1;
  });
  return overlap / Math.max(setA.size, setB.size);
}

function buildCandidateTokens(input: { title: string; summary: string }) {
  return tokenize(`${input.title} ${input.summary}`);
}

function shouldTreatAsDuplicate(params: {
  current: DemandCandidate;
  currentPayload: DemandQueuePayload;
  existing: DemandCandidate;
  existingPayload: any;
}) {
  if (!params.current.clientId || params.current.clientId !== params.existing.clientId) return false;
  if (params.current.status === 'ignored' || params.existing.status === 'ignored') return false;

  const currentTokens = buildCandidateTokens(params.current);
  const existingTokens = buildCandidateTokens(params.existing);
  const similarity = overlapRatio(currentTokens, existingTokens);
  const sameDeadline =
    String(params.current.deadline || '').trim() &&
    String(params.current.deadline || '').trim() === String(params.existing.deadline || '').trim();
  const samePlatform =
    String(params.current.platform || '').trim() &&
    String(params.current.platform || '').trim().toLowerCase() === String(params.existing.platform || '').trim().toLowerCase();
  const sameKind = String(params.current.demandKind || '').trim() === String(params.existing.demandKind || '').trim();
  const sameTitle = normalizeText(params.current.title) === normalizeText(params.existing.title);

  return sameTitle || (sameKind && sameDeadline && similarity >= 0.4) || (samePlatform && similarity >= 0.68) || similarity >= 0.82;
}

async function appendReconciledSignal(tenantId: string, jobId: string, signal: Record<string, any>) {
  const existing = await query<{ payload: any }>(
    `SELECT payload
       FROM job_queue
      WHERE tenant_id = $1
        AND id = $2
      LIMIT 1`,
    [tenantId, jobId],
  ).catch(() => ({ rows: [] as Array<{ payload: any }> }));
  const payload = existing.rows[0]?.payload || {};
  const current = Array.isArray(payload.reconciled_signals) ? payload.reconciled_signals : [];
  const alreadyThere = current.some((item: any) => String(item?.source_id || '') === String(signal.source_id || ''));
  if (alreadyThere) return;

  await query(
    `UPDATE job_queue
        SET payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb,
            updated_at = NOW()
      WHERE tenant_id = $1
        AND id = $2`,
    [tenantId, jobId, JSON.stringify({ reconciled_signals: [...current, signal] })],
  ).catch(() => {});
}

export async function reconcileDemandCandidate(params: {
  tenantId: string;
  currentJobId: string;
  payload: DemandQueuePayload;
  candidate: DemandCandidate;
}) {
  if (!params.candidate.clientId || params.candidate.nextStep === 'ignore') {
    return {
      mode: 'standalone' as const,
      canonical_job_id: null,
      reason: 'candidate_not_eligible_for_reconciliation',
    };
  }

  const recent = await query<{ id: string; payload: any }>(
    `SELECT id::text AS id, payload
       FROM job_queue
      WHERE tenant_id = $1
        AND type = 'demand_intake'
        AND id <> $2
        AND created_at >= NOW() - INTERVAL '21 days'
        AND status IN ('queued', 'processing', 'done')
      ORDER BY created_at ASC
      LIMIT 25`,
    [params.tenantId, params.currentJobId],
  ).catch(() => ({ rows: [] as Array<{ id: string; payload: any }> }));

  const match = recent.rows.find((row) => {
    const existingCandidate = row.payload?.intake_result?.candidate as DemandCandidate | undefined;
    if (!existingCandidate) return false;
    return shouldTreatAsDuplicate({
      current: params.candidate,
      currentPayload: params.payload,
      existing: existingCandidate,
      existingPayload: row.payload,
    });
  });

  if (!match) {
    return {
      mode: 'standalone' as const,
      canonical_job_id: null,
      reason: 'no_matching_demand_found',
    };
  }

  await appendReconciledSignal(params.tenantId, match.id, {
    source_type: params.payload.source.type,
    source_id: params.payload.source.id,
    title: params.candidate.title,
    summary: params.candidate.summary,
    deadline: params.candidate.deadline,
    platform: params.candidate.platform,
    received_at: new Date().toISOString(),
  });

  return {
    mode: 'duplicate' as const,
    canonical_job_id: match.id,
    reason: 'matched_recent_demand_signal',
  };
}
