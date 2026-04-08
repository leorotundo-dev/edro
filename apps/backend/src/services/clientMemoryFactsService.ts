import crypto from 'crypto';
import { query } from '../db';

type SyncDirectiveInput = {
  directive_type: 'boost' | 'avoid';
  directive: string;
  source: string;
  source_id?: string | null;
  created_at: string | null;
};

type SyncEvidenceInput = {
  source_type: string;
  source_id?: string | null;
  title: string | null;
  excerpt: string;
  occurred_at: string | null;
  score: number;
};

type SyncCommitmentInput = {
  action_id?: string | null;
  title: string;
  description: string | null;
  responsible: string | null;
  deadline: string | null;
  priority: string | null;
  meeting_title: string | null;
};

export type ClientMemoryFactRow = {
  fact_type: 'directive' | 'evidence' | 'commitment';
  status: 'active' | 'inactive' | 'resolved' | 'archived';
  source_type: string | null;
  source_id: string | null;
  title: string;
  summary: string | null;
  fact_text: string;
  related_at: string | null;
  deadline: string | null;
  priority: string | null;
  confidence_score: number;
  metadata: Record<string, any>;
};

type ClientMemoryFactType = ClientMemoryFactRow['fact_type'];

function fingerprint(parts: Array<string | null | undefined>) {
  return crypto
    .createHash('sha256')
    .update(parts.map((part) => String(part || '')).join('||'))
    .digest('hex');
}

function isMissingTableError(error: unknown) {
  const candidate = error as { code?: string; message?: string };
  return candidate?.code === '42P01' || /client_memory_facts/i.test(String(candidate?.message || ''));
}

async function upsertFact(tenantId: string, clientId: string, fact: ClientMemoryFactRow & { fingerprint: string }) {
  await query(
    `INSERT INTO client_memory_facts (
       tenant_id, client_id, fact_type, status, fingerprint,
       source_type, source_id, title, summary, fact_text,
       related_at, deadline, priority, confidence_score, metadata
     )
     VALUES (
       $1, $2, $3, $4, $5,
       $6, $7, $8, $9, $10,
       $11::timestamptz, $12::date, $13, $14, $15::jsonb
     )
     ON CONFLICT (tenant_id, client_id, fingerprint)
     DO UPDATE SET
       fact_type = EXCLUDED.fact_type,
       status = EXCLUDED.status,
       source_type = EXCLUDED.source_type,
       source_id = EXCLUDED.source_id,
       title = EXCLUDED.title,
       summary = EXCLUDED.summary,
       fact_text = EXCLUDED.fact_text,
       related_at = EXCLUDED.related_at,
       deadline = EXCLUDED.deadline,
       priority = EXCLUDED.priority,
       confidence_score = EXCLUDED.confidence_score,
       metadata = EXCLUDED.metadata,
       updated_at = now()`,
    [
      tenantId,
      clientId,
      fact.fact_type,
      fact.status,
      fact.fingerprint,
      fact.source_type,
      fact.source_id,
      fact.title,
      fact.summary,
      fact.fact_text,
      fact.related_at,
      fact.deadline,
      fact.priority,
      fact.confidence_score,
      JSON.stringify(fact.metadata || {}),
    ],
  );
}

async function deactivateMissingFacts(params: {
  tenantId: string;
  clientId: string;
  factType: ClientMemoryFactRow['fact_type'];
  keepFingerprints: string[];
  nextStatus: ClientMemoryFactRow['status'];
}) {
  if (params.keepFingerprints.length > 0) {
    await query(
      `UPDATE client_memory_facts
          SET status = $4,
              updated_at = now()
        WHERE tenant_id = $1
          AND client_id = $2
          AND fact_type = $3
          AND status = 'active'
          AND COALESCE(metadata->>'origin', '') = 'auto_materialized'
          AND NOT (fingerprint = ANY($5::text[]))`,
      [params.tenantId, params.clientId, params.factType, params.nextStatus, params.keepFingerprints],
    );
    return;
  }

  await query(
    `UPDATE client_memory_facts
        SET status = $4,
            updated_at = now()
      WHERE tenant_id = $1
        AND client_id = $2
        AND fact_type = $3
        AND status = 'active'
        AND COALESCE(metadata->>'origin', '') = 'auto_materialized'`,
    [params.tenantId, params.clientId, params.factType, params.nextStatus],
  );
}

export async function syncClientMemoryFacts(params: {
  tenantId: string;
  clientId: string;
  directives: SyncDirectiveInput[];
  evidence: SyncEvidenceInput[];
  pendingActions: SyncCommitmentInput[];
}) {
  try {
    const directiveFacts = params.directives.map((item) => ({
      fingerprint: fingerprint(['directive', item.directive_type, item.directive]),
      fact_type: 'directive' as const,
      status: 'active' as const,
      source_type: item.source || 'directive',
      source_id: item.source_id || null,
      title: item.directive,
      summary: item.directive,
      fact_text: item.directive,
      related_at: item.created_at || null,
      deadline: null,
      priority: null,
      confidence_score: 0.95,
      metadata: {
        origin: 'auto_materialized',
        directive_type: item.directive_type,
        source: item.source,
      },
    }));

    const evidenceFacts = params.evidence.map((item) => ({
      fingerprint: fingerprint([
        'evidence',
        item.source_type,
        item.source_id,
        item.title,
        item.excerpt,
        item.occurred_at,
      ]),
      fact_type: 'evidence' as const,
      status: 'active' as const,
      source_type: item.source_type,
      source_id: item.source_id || null,
      title: item.title || 'Sem titulo',
      summary: item.excerpt,
      fact_text: `${item.title || 'Sem titulo'}\n${item.excerpt}`,
      related_at: item.occurred_at || null,
      deadline: null,
      priority: null,
      confidence_score: Math.max(0.5, Math.min(0.99, 0.55 + (item.score / 10))),
      metadata: {
        origin: 'auto_materialized',
        source_score: item.score,
      },
    }));

    const commitmentFacts = params.pendingActions.map((item) => ({
      fingerprint: fingerprint([
        'commitment',
        item.action_id,
        item.title,
        item.deadline,
        item.responsible,
      ]),
      fact_type: 'commitment' as const,
      status: 'active' as const,
      source_type: 'meeting_action',
      source_id: item.action_id || null,
      title: item.title,
      summary: item.description || null,
      fact_text: [item.title, item.description, item.meeting_title].filter(Boolean).join('\n'),
      related_at: item.deadline || null,
      deadline: item.deadline || null,
      priority: item.priority || null,
      confidence_score: 0.9,
      metadata: {
        origin: 'auto_materialized',
        responsible: item.responsible || null,
        meeting_title: item.meeting_title || null,
      },
    }));

    const allFacts = [...directiveFacts, ...evidenceFacts, ...commitmentFacts];
    for (const fact of allFacts) {
      await upsertFact(params.tenantId, params.clientId, fact);
    }

    await Promise.all([
      deactivateMissingFacts({
        tenantId: params.tenantId,
        clientId: params.clientId,
        factType: 'directive',
        keepFingerprints: directiveFacts.map((item) => item.fingerprint),
        nextStatus: 'inactive',
      }),
      deactivateMissingFacts({
        tenantId: params.tenantId,
        clientId: params.clientId,
        factType: 'evidence',
        keepFingerprints: evidenceFacts.map((item) => item.fingerprint),
        nextStatus: 'inactive',
      }),
      deactivateMissingFacts({
        tenantId: params.tenantId,
        clientId: params.clientId,
        factType: 'commitment',
        keepFingerprints: commitmentFacts.map((item) => item.fingerprint),
        nextStatus: 'resolved',
      }),
    ]);

    return true;
  } catch (error) {
    if (isMissingTableError(error)) return false;
    throw error;
  }
}

export async function listClientMemoryFacts(params: {
  tenantId: string;
  clientId: string;
  daysBack?: number;
  factTypes?: ClientMemoryFactType[];
  limit?: number;
}) {
  try {
    const factTypes = Array.isArray(params.factTypes) && params.factTypes.length ? params.factTypes : null;
    const { rows } = await query<ClientMemoryFactRow>(
      `SELECT fact_type,
              status,
              source_type,
              source_id,
              title,
              summary,
              fact_text,
              related_at::text,
              deadline::text,
              priority,
              confidence_score::float,
              metadata
         FROM client_memory_facts
        WHERE tenant_id = $1
          AND client_id = $2
          AND status = 'active'
          AND ($4::text[] IS NULL OR fact_type = ANY($4::text[]))
          AND (
            fact_type <> 'evidence'
            OR related_at IS NULL
            OR related_at > NOW() - make_interval(days => $3)
          )
        ORDER BY
          CASE fact_type WHEN 'directive' THEN 0 WHEN 'commitment' THEN 1 ELSE 2 END,
          related_at DESC NULLS LAST,
          updated_at DESC
        LIMIT $5`,
      [
        params.tenantId,
        params.clientId,
        Math.min(params.daysBack ?? 60, 120),
        factTypes,
        Math.min(params.limit ?? 30, 50),
      ],
    );
    return rows;
  } catch (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
}

export async function recordClientMemoryFact(params: {
  tenantId: string;
  clientId: string;
  factType: ClientMemoryFactType;
  title: string;
  factText: string;
  summary?: string | null;
  directiveType?: 'boost' | 'avoid' | null;
  relatedAt?: string | null;
  deadline?: string | null;
  priority?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  sourceNote?: string | null;
  confidenceScore?: number | null;
  confirmedBy?: string | null;
}) {
  const normalizedTitle = String(params.title || '').trim();
  const normalizedFactText = String(params.factText || '').trim();
  if (!normalizedTitle || !normalizedFactText) {
    throw new Error('title e factText são obrigatórios');
  }

  const computedFingerprint = fingerprint([
    'manual',
    params.factType,
    params.directiveType,
    normalizedTitle,
    normalizedFactText,
    params.deadline,
  ]);

  try {
    await upsertFact(params.tenantId, params.clientId, {
      fingerprint: computedFingerprint,
      fact_type: params.factType,
      status: 'active',
      source_type: params.sourceType || 'jarvis_manual',
      source_id: params.sourceId || null,
      title: normalizedTitle,
      summary: params.summary || null,
      fact_text: normalizedFactText,
      related_at: params.relatedAt || null,
      deadline: params.deadline || null,
      priority: params.priority || null,
      confidence_score: Math.max(0.5, Math.min(0.99, params.confidenceScore ?? 0.88)),
      metadata: {
        origin: 'jarvis_writeback',
        directive_type: params.directiveType || null,
        source_note: params.sourceNote || null,
        confirmed_by: params.confirmedBy || null,
      },
    });
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
  }

  if (params.factType === 'directive') {
    await query(
      `INSERT INTO client_directives
         (tenant_id, client_id, source, source_id, directive_type, directive, confirmed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tenant_id, client_id, directive) DO NOTHING`,
      [
        params.tenantId,
        params.clientId,
        params.sourceType || 'jarvis_manual',
        params.sourceId || computedFingerprint,
        params.directiveType || 'boost',
        normalizedTitle,
        params.confirmedBy || null,
      ],
    );
  }

  return {
    fact_type: params.factType,
    title: normalizedTitle,
    fact_text: normalizedFactText,
    fingerprint: computedFingerprint,
    source_type: params.sourceType || 'jarvis_manual',
  };
}

export async function upsertCanonicalClientMemoryFact(params: {
  tenantId: string;
  clientId: string;
  factType: ClientMemoryFactType;
  sourceType: string;
  sourceId: string;
  title: string;
  factText: string;
  summary?: string | null;
  relatedAt?: string | null;
  deadline?: string | null;
  priority?: string | null;
  confidenceScore?: number | null;
  metadata?: Record<string, any>;
}) {
  const normalizedTitle = String(params.title || '').trim();
  const normalizedFactText = String(params.factText || '').trim();
  if (!normalizedTitle || !normalizedFactText) {
    return null;
  }

  const computedFingerprint = fingerprint([
    'canonical',
    params.factType,
    params.sourceType,
    params.sourceId,
    normalizedTitle,
    params.deadline,
  ]);

  try {
    await upsertFact(params.tenantId, params.clientId, {
      fingerprint: computedFingerprint,
      fact_type: params.factType,
      status: 'active',
      source_type: params.sourceType,
      source_id: params.sourceId,
      title: normalizedTitle,
      summary: params.summary || null,
      fact_text: normalizedFactText,
      related_at: params.relatedAt || null,
      deadline: params.deadline || null,
      priority: params.priority || null,
      confidence_score: Math.max(0.5, Math.min(0.99, params.confidenceScore ?? 0.85)),
      metadata: {
        origin: 'canonical_extraction',
        ...(params.metadata || {}),
      },
    });
  } catch (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }

  return {
    fact_type: params.factType,
    title: normalizedTitle,
    source_type: params.sourceType,
    source_id: params.sourceId,
    fingerprint: computedFingerprint,
  };
}
