import { query } from '../db';
import { recordClientMemoryFact } from './clientMemoryFactsService';

type OutcomeRecord = {
  outcome_type: string;
  source_type: string;
  source_id: string | null;
  title: string;
  summary: string | null;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  metadata: Record<string, any>;
};

function normalizeOutcomes(input: {
  toolResults?: Array<{ toolName: string; data: any; success: boolean; metadata?: any }>;
  artifacts?: Array<Record<string, any>>;
}) {
  const items: OutcomeRecord[] = [];
  for (const artifact of input.artifacts || []) {
    if (artifact.background_job_id) {
      items.push({
        outcome_type: 'workflow',
        source_type: 'workflow',
        source_id: String(artifact.background_job_id),
        title: String(artifact.title || artifact.type || 'workflow do Jarvis'),
        summary: String(artifact.message || artifact.workflow_status || artifact.type || ''),
        status: String(artifact.job_status || '').toLowerCase() === 'failed' ? 'failed' : 'pending',
        metadata: artifact,
      });
    }
    if (artifact.briefing_id) {
      items.push({
        outcome_type: 'briefing',
        source_type: 'briefing',
        source_id: String(artifact.briefing_id),
        title: String(artifact.title || 'briefing criado pelo Jarvis'),
        summary: String(artifact.message || artifact.preview || ''),
        status: 'completed',
        metadata: artifact,
      });
    }
    if (artifact.job_id) {
      items.push({
        outcome_type: 'job',
        source_type: 'job',
        source_id: String(artifact.job_id),
        title: String(artifact.title || 'job operacional criado pelo Jarvis'),
        summary: String(artifact.message || artifact.job_status || ''),
        status: ['done', 'completed'].includes(String(artifact.job_status || '').toLowerCase()) ? 'completed' : 'pending',
        metadata: artifact,
      });
    }
    if (artifact.meeting_id) {
      items.push({
        outcome_type: 'meeting',
        source_type: 'meeting',
        source_id: String(artifact.meeting_id),
        title: String(artifact.title || 'reunião agendada pelo Jarvis'),
        summary: String(artifact.message || ''),
        status: 'pending',
        metadata: artifact,
      });
    }
  }
  for (const item of input.toolResults || []) {
    if (!item.success) continue;
    items.push({
      outcome_type: `tool:${item.toolName}`,
      source_type: 'tool',
      source_id: item.toolName,
      title: `Ferramenta ${item.toolName} executada`,
      summary: String(item.data?.message || item.data?.preview || ''),
      status: 'completed',
      metadata: { toolName: item.toolName },
    });
  }
  return Array.from(new Map(items.map((item) => [`${item.outcome_type}:${item.source_type}:${item.source_id || ''}`, item])).values());
}

async function syncOutcomeStatus(row: any) {
  if (row.status !== 'pending' || !row.source_id) return row;
  let nextStatus = row.status;
  if (row.source_type === 'job') {
    const res = await query<{ status: string }>(`SELECT status FROM jobs WHERE tenant_id = $1 AND id = $2::uuid LIMIT 1`, [row.tenant_id, row.source_id]).catch(() => ({ rows: [] }));
    const status = String(res.rows[0]?.status || '').toLowerCase();
    if (['done', 'completed'].includes(status)) nextStatus = 'completed';
    if (['cancelled', 'archived'].includes(status)) nextStatus = 'cancelled';
  } else if (row.source_type === 'briefing') {
    const res = await query<{ status: string }>(`SELECT status FROM edro_briefings WHERE tenant_id = $1 AND id = $2::uuid LIMIT 1`, [row.tenant_id, row.source_id]).catch(() => ({ rows: [] }));
    const status = String(res.rows[0]?.status || '').toLowerCase();
    if (['approved', 'completed', 'published'].includes(status)) nextStatus = 'completed';
    if (['cancelled', 'archived'].includes(status)) nextStatus = 'cancelled';
  } else if (row.source_type === 'meeting') {
    const res = await query<{ status: string }>(`SELECT status FROM meetings WHERE tenant_id = $1 AND id = $2::uuid LIMIT 1`, [row.tenant_id, row.source_id]).catch(() => ({ rows: [] }));
    const status = String(res.rows[0]?.status || '').toLowerCase();
    if (['completed', 'recorded', 'analyzed'].includes(status)) nextStatus = 'completed';
    if (status === 'failed') nextStatus = 'failed';
  } else if (row.source_type === 'workflow') {
    const res = await query<{ status: string }>(`SELECT status FROM job_queue WHERE id = $1::uuid LIMIT 1`, [row.source_id]).catch(() => ({ rows: [] }));
    const status = String(res.rows[0]?.status || '').toLowerCase();
    if (['done', 'completed'].includes(status)) nextStatus = 'completed';
    if (['failed', 'dead_letter'].includes(status)) nextStatus = 'failed';
    if (status === 'cancelled') nextStatus = 'cancelled';
  }
  if (nextStatus !== row.status) {
    await query(
      `UPDATE jarvis_outcome_memory
          SET status = $4, updated_at = now(), resolved_at = CASE WHEN $4 = 'pending' THEN NULL ELSE now() END
        WHERE tenant_id = $1 AND client_id = $2 AND id = $3::uuid`,
      [row.tenant_id, row.client_id, row.id, nextStatus],
    ).catch(() => {});
    row.status = nextStatus;
  }
  return row;
}

export async function recordJarvisOutcomes(params: {
  tenantId: string;
  clientId: string;
  traceId?: string | null;
  conversationId?: string | null;
  toolResults?: Array<{ toolName: string; data: any; success: boolean; metadata?: any }>;
  artifacts?: Array<Record<string, any>>;
}) {
  const items = normalizeOutcomes(params);
  for (const item of items) {
    await query(
      `INSERT INTO jarvis_outcome_memory (
         tenant_id, client_id, trace_id, conversation_id, outcome_type, source_type, source_id, source_key,
         title, summary, status, metadata
       )
       VALUES ($1, $2, $3::uuid, $4::uuid, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
       ON CONFLICT (tenant_id, client_id, outcome_type, source_type, source_key)
       DO UPDATE SET
         trace_id = EXCLUDED.trace_id,
         conversation_id = EXCLUDED.conversation_id,
         title = EXCLUDED.title,
         summary = EXCLUDED.summary,
         status = EXCLUDED.status,
         metadata = EXCLUDED.metadata,
         updated_at = now(),
         resolved_at = CASE WHEN EXCLUDED.status = 'pending' THEN NULL ELSE now() END`,
      [
        params.tenantId,
        params.clientId,
        params.traceId || null,
        params.conversationId || null,
        item.outcome_type,
        item.source_type,
        item.source_id,
        item.source_id || '',
        item.title,
        item.summary,
        item.status,
        JSON.stringify(item.metadata || {}),
      ],
    );

    await recordClientMemoryFact({
      tenantId: params.tenantId,
      clientId: params.clientId,
      factType: item.status === 'pending' ? 'commitment' : 'evidence',
      title: item.title,
      factText: [item.title, item.summary].filter(Boolean).join('\n'),
      summary: item.summary,
      sourceType: 'jarvis_outcome',
      sourceId: item.source_id || item.outcome_type,
      sourceNote: 'resultado operacional registrado automaticamente pelo Jarvis',
      confidenceScore: item.status === 'pending' ? 0.82 : 0.9,
    }).catch(() => {});
  }
  return items;
}

export async function listRecentJarvisOutcomes(params: {
  tenantId: string;
  clientId: string;
  daysBack?: number;
  limit?: number;
}) {
  const { rows } = await query<any>(
    `SELECT *
       FROM jarvis_outcome_memory
      WHERE tenant_id = $1
        AND client_id = $2
        AND created_at > NOW() - make_interval(days => $3)
      ORDER BY created_at DESC
      LIMIT $4`,
    [params.tenantId, params.clientId, Math.min(params.daysBack ?? 45, 180), Math.min(params.limit ?? 8, 20)],
  ).catch(() => ({ rows: [] }));

  const hydrated = [];
  for (const row of rows) hydrated.push(await syncOutcomeStatus(row));
  return hydrated;
}
