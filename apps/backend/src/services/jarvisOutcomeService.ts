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

function rewardScoreFromStatus(status: string) {
  switch (String(status || '').toLowerCase()) {
    case 'completed':
      return 1.0;
    case 'pending':
      return 0.25;
    case 'failed':
      return -0.9;
    case 'cancelled':
      return -0.55;
    default:
      return 0;
  }
}

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
  if (row.status && row.status !== 'pending') {
    await recordJarvisOutcomeEvent({
      tenantId: row.tenant_id,
      clientId: row.client_id,
      traceId: row.trace_id || null,
      outcomeId: row.id,
      sourceType: row.source_type,
      sourceId: row.source_id || null,
      outcomeType: row.outcome_type,
      status: row.status,
      title: row.title,
      summary: row.summary,
      metadata: row.metadata || {},
    }).catch(() => {});
    await recordJarvisEpisode({
      tenantId: row.tenant_id,
      clientId: row.client_id,
      traceId: row.trace_id || null,
      conversationId: row.conversation_id || null,
      outcomeId: row.id,
      outcomeType: row.outcome_type,
      sourceType: row.source_type,
      sourceId: row.source_id || null,
      status: row.status,
      title: row.title,
      summary: row.summary,
      metadata: row.metadata || {},
    }).catch(() => {});
  }
  return row;
}

async function recordJarvisOutcomeEvent(params: {
  tenantId: string;
  clientId: string;
  traceId?: string | null;
  outcomeId?: string | null;
  sourceType: string;
  sourceId?: string | null;
  outcomeType: string;
  status: string;
  title: string;
  summary?: string | null;
  metadata?: Record<string, any>;
}) {
  if (!params.outcomeId) return null;
  const eventType = `status:${String(params.status || 'unknown').toLowerCase()}`;
  await query(
    `INSERT INTO jarvis_outcome_events (
       tenant_id, client_id, trace_id, outcome_id, event_type, reward_score, status,
       source_type, source_id, source_key, summary, metadata
     )
     VALUES ($1, $2, $3::uuid, $4::uuid, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
     ON CONFLICT (tenant_id, client_id, outcome_id, event_type, source_key)
     DO UPDATE SET
       reward_score = EXCLUDED.reward_score,
       status = EXCLUDED.status,
       summary = EXCLUDED.summary,
       metadata = EXCLUDED.metadata`,
    [
      params.tenantId,
      params.clientId,
      params.traceId || null,
      params.outcomeId,
      eventType,
      rewardScoreFromStatus(params.status),
      'observed',
      params.sourceType,
      params.sourceId || null,
      params.sourceId || '',
      [params.title, params.summary].filter(Boolean).join(' | '),
      JSON.stringify({
        outcome_type: params.outcomeType,
        title: params.title,
        status: params.status,
        ...(params.metadata || {}),
      }),
    ],
  ).catch(() => null);
  return eventType;
}

async function recordJarvisEpisode(params: {
  tenantId: string;
  clientId: string;
  traceId?: string | null;
  conversationId?: string | null;
  outcomeId?: string | null;
  outcomeType: string;
  sourceType: string;
  sourceId?: string | null;
  status: string;
  title: string;
  summary?: string | null;
  metadata?: Record<string, any>;
}) {
  const trace = params.traceId
    ? await query<{ task_type: string | null; actor_profile: string | null }>(
      `SELECT task_type, actor_profile FROM jarvis_decision_traces WHERE id = $1::uuid LIMIT 1`,
      [params.traceId],
    ).catch(() => ({ rows: [] }))
    : { rows: [] as Array<{ task_type: string | null; actor_profile: string | null }> };
  const traceRow = trace.rows[0] || null;
  const episodeKind =
    params.status === 'completed' ? 'success'
      : params.status === 'failed' ? 'failure'
        : params.status === 'cancelled' ? 'cancellation'
          : 'progress';
  const episodeKey = params.traceId
    ? `${params.traceId}:${episodeKind}:${params.sourceType}:${params.sourceId || params.outcomeId || ''}`
    : `${params.outcomeId || params.sourceType}:${episodeKind}`;
  await query(
    `INSERT INTO jarvis_episode_memory (
       tenant_id, client_id, trace_id, conversation_id, episode_key, episode_kind,
       task_type, actor_profile, title, summary, source_ids, metadata
     )
     VALUES ($1, $2, $3::uuid, $4::uuid, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb)
     ON CONFLICT (tenant_id, client_id, episode_key)
     DO UPDATE SET
       title = EXCLUDED.title,
       summary = EXCLUDED.summary,
       source_ids = EXCLUDED.source_ids,
       metadata = EXCLUDED.metadata,
       updated_at = now()`,
    [
      params.tenantId,
      params.clientId,
      params.traceId || null,
      params.conversationId || null,
      episodeKey,
      episodeKind,
      traceRow?.task_type || null,
      traceRow?.actor_profile || null,
      params.title,
      [params.title, params.summary, `status=${params.status}`].filter(Boolean).join(' | '),
      JSON.stringify([params.sourceId || params.outcomeId || params.sourceType].filter(Boolean)),
      JSON.stringify({
        outcome_id: params.outcomeId || null,
        outcome_type: params.outcomeType,
        source_type: params.sourceType,
        source_id: params.sourceId || null,
        status: params.status,
        ...(params.metadata || {}),
      }),
    ],
  ).catch(() => null);
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

export async function listRecentJarvisEpisodes(params: {
  tenantId: string;
  clientId: string;
  daysBack?: number;
  limit?: number;
}) {
  const { rows } = await query<any>(
    `SELECT id,
            episode_kind,
            task_type,
            actor_profile,
            title,
            summary,
            source_ids,
            created_at::text,
            metadata
       FROM jarvis_episode_memory
      WHERE tenant_id = $1
        AND client_id = $2
        AND created_at > NOW() - make_interval(days => $3)
      ORDER BY created_at DESC
      LIMIT $4`,
    [params.tenantId, params.clientId, Math.min(params.daysBack ?? 90, 180), Math.min(params.limit ?? 8, 20)],
  ).catch(() => ({ rows: [] }));

  return rows;
}

export async function listJarvisRetrievalSignals(params: {
  tenantId: string;
  clientId: string;
  taskType?: string | null;
  actorProfile?: string | null;
  daysBack?: number;
  limit?: number;
}) {
  const taskType = String(params.taskType || '').trim();
  const actorProfile = String(params.actorProfile || '').trim();
  const { rows } = await query<{
    fingerprint: string;
    title: string | null;
    fact_type: string | null;
    sample_count: number | string;
    last_seen_at: string | null;
    learning_score: number | string | null;
    avg_outcome_score: number | string | null;
  }>(
    `WITH trace_scores AS (
       SELECT
         jdt.created_at,
         jdt.task_type,
         jdt.actor_profile,
         jdt.confidence_score,
         evidence_item.value AS evidence_item,
         COALESCE(outcomes.outcome_score,
           CASE jdt.confidence_mode
             WHEN 'act' THEN 0.2
             WHEN 'confirm' THEN 0.05
             WHEN 'escalate' THEN -0.15
             ELSE 0
           END
         ) AS outcome_score
       FROM jarvis_decision_traces jdt
       JOIN LATERAL jsonb_array_elements(COALESCE(jdt.evidence, '[]'::jsonb)) evidence_item(value) ON TRUE
       LEFT JOIN LATERAL (
         SELECT AVG(
           CASE
             WHEN ooe.reward_score IS NOT NULL THEN ooe.reward_score
             ELSE CASE oom.status
               WHEN 'completed' THEN 1.0
               WHEN 'pending' THEN 0.25
               WHEN 'failed' THEN -0.9
               WHEN 'cancelled' THEN -0.6
               ELSE 0
             END
           END
         )::numeric AS outcome_score
         FROM jarvis_outcome_memory oom
         LEFT JOIN jarvis_outcome_events ooe
           ON ooe.outcome_id = oom.id
         WHERE oom.trace_id = jdt.id
       ) outcomes ON TRUE
       WHERE jdt.tenant_id = $1
         AND jdt.client_id = $2
         AND jdt.created_at > NOW() - make_interval(days => $5)
         AND COALESCE(evidence_item.value->>'fingerprint', '') <> ''
     )
     SELECT
       evidence_item->>'fingerprint' AS fingerprint,
       MAX(NULLIF(evidence_item->>'title', '')) AS title,
       MAX(NULLIF(evidence_item->>'fact_type', '')) AS fact_type,
       COUNT(*)::int AS sample_count,
       MAX(created_at)::text AS last_seen_at,
       ROUND(SUM(
         outcome_score
         * GREATEST(confidence_score, 0.35)
         * CASE
             WHEN $3 = '' THEN 1
             WHEN task_type = $3 THEN 1.25
             ELSE 0.75
           END
         * CASE
             WHEN $4 = '' THEN 1
             WHEN actor_profile = $4 THEN 1.1
             ELSE 0.9
           END
       )::numeric, 3) AS learning_score,
       ROUND(AVG(outcome_score)::numeric, 3) AS avg_outcome_score
     FROM trace_scores
     GROUP BY evidence_item->>'fingerprint'
     ORDER BY learning_score DESC, sample_count DESC, MAX(created_at) DESC
     LIMIT $6`,
    [
      params.tenantId,
      params.clientId,
      taskType,
      actorProfile,
      Math.min(params.daysBack ?? 90, 180),
      Math.min(params.limit ?? 24, 40),
    ],
  ).catch(() => ({ rows: [] }));

  return rows.map((row) => ({
    fingerprint: row.fingerprint,
    title: row.title || null,
    fact_type: row.fact_type || null,
    sample_count: Number(row.sample_count || 0),
    last_seen_at: row.last_seen_at || null,
    learning_score: Number(row.learning_score || 0),
    avg_outcome_score: Number(row.avg_outcome_score || 0),
  }));
}

export async function getJarvisActionPolicySignals(params: {
  tenantId: string;
  clientId: string;
  taskType?: string | null;
  actorProfile?: string | null;
  daysBack?: number;
}) {
  const taskType = String(params.taskType || '').trim();
  const actorProfile = String(params.actorProfile || '').trim();
  const { rows } = await query<{
    confidence_mode: string;
    policy_style: string;
    sample_count: number | string;
    learning_score: number | string | null;
    avg_outcome_score: number | string | null;
  }>(
    `WITH trace_scores AS (
       SELECT
         jdt.confidence_mode,
         COALESCE(NULLIF(jdt.metadata->>'policy_style', ''), 'general') AS policy_style,
         COALESCE(outcomes.outcome_score,
           CASE jdt.confidence_mode
             WHEN 'act' THEN 0.25
             WHEN 'respond' THEN 0.1
             WHEN 'confirm' THEN 0.02
             WHEN 'escalate' THEN -0.12
             ELSE 0
           END
         ) AS outcome_score
       FROM jarvis_decision_traces jdt
       LEFT JOIN LATERAL (
         SELECT AVG(
           CASE
             WHEN ooe.reward_score IS NOT NULL THEN ooe.reward_score
             ELSE CASE oom.status
               WHEN 'completed' THEN 1.0
               WHEN 'pending' THEN 0.2
               WHEN 'failed' THEN -0.9
               WHEN 'cancelled' THEN -0.55
               ELSE 0
             END
           END
         )::numeric AS outcome_score
         FROM jarvis_outcome_memory oom
         LEFT JOIN jarvis_outcome_events ooe
           ON ooe.outcome_id = oom.id
         WHERE oom.trace_id = jdt.id
       ) outcomes ON TRUE
       WHERE jdt.tenant_id = $1
         AND jdt.client_id = $2
         AND jdt.created_at > NOW() - make_interval(days => $5)
         AND ($3 = '' OR jdt.task_type = $3)
         AND ($4 = '' OR jdt.actor_profile = $4)
     )
     SELECT
       confidence_mode,
       policy_style,
       COUNT(*)::int AS sample_count,
       ROUND(SUM(outcome_score)::numeric, 3) AS learning_score,
       ROUND(AVG(outcome_score)::numeric, 3) AS avg_outcome_score
     FROM trace_scores
     GROUP BY confidence_mode, policy_style
     ORDER BY learning_score DESC, sample_count DESC`,
    [
      params.tenantId,
      params.clientId,
      taskType,
      actorProfile,
      Math.min(params.daysBack ?? 120, 180),
    ],
  ).catch(() => ({ rows: [] }));

  const modes = rows
    .map((row) => ({
      mode: row.confidence_mode as 'respond' | 'act' | 'confirm' | 'escalate',
      sample_count: Number(row.sample_count || 0),
      learning_score: Number(row.learning_score || 0),
      avg_outcome_score: Number(row.avg_outcome_score || 0),
    }))
    .reduce((acc, row) => {
      const current = acc.get(row.mode) || { mode: row.mode, sample_count: 0, learning_score: 0, avg_outcome_score: 0 };
      current.sample_count += row.sample_count;
      current.learning_score += row.learning_score;
      current.avg_outcome_score = current.sample_count
        ? Number((((current.avg_outcome_score * Math.max(current.sample_count - row.sample_count, 0)) + (row.avg_outcome_score * row.sample_count)) / current.sample_count).toFixed(3))
        : row.avg_outcome_score;
      acc.set(row.mode, current);
      return acc;
    }, new Map<string, { mode: 'respond' | 'act' | 'confirm' | 'escalate'; sample_count: number; learning_score: number; avg_outcome_score: number }>());

  const styles = rows
    .map((row) => ({
      style: row.policy_style as 'executive' | 'operational' | 'commercial' | 'social' | 'service' | 'general',
      sample_count: Number(row.sample_count || 0),
      learning_score: Number(row.learning_score || 0),
      avg_outcome_score: Number(row.avg_outcome_score || 0),
    }))
    .reduce((acc, row) => {
      const current = acc.get(row.style) || { style: row.style, sample_count: 0, learning_score: 0, avg_outcome_score: 0 };
      current.sample_count += row.sample_count;
      current.learning_score += row.learning_score;
      current.avg_outcome_score = current.sample_count
        ? Number((((current.avg_outcome_score * Math.max(current.sample_count - row.sample_count, 0)) + (row.avg_outcome_score * row.sample_count)) / current.sample_count).toFixed(3))
        : row.avg_outcome_score;
      acc.set(row.style, current);
      return acc;
    }, new Map<string, { style: 'executive' | 'operational' | 'commercial' | 'social' | 'service' | 'general'; sample_count: number; learning_score: number; avg_outcome_score: number }>());

  const modeList = [...modes.values()].sort((a, b) => b.learning_score - a.learning_score || b.sample_count - a.sample_count);
  const styleList = [...styles.values()].sort((a, b) => b.learning_score - a.learning_score || b.sample_count - a.sample_count);

  return {
    task_type: taskType || null,
    actor_profile: actorProfile || null,
    preferred_mode: modeList[0]?.mode || null,
    preferred_style: styleList[0]?.style || null,
    mode_signals: modeList,
    style_signals: styleList,
  };
}

export async function getJarvisToolPolicySignals(params: {
  tenantId: string;
  clientId: string;
  taskType?: string | null;
  actorProfile?: string | null;
  daysBack?: number;
}) {
  const taskType = String(params.taskType || '').trim();
  const actorProfile = String(params.actorProfile || '').trim();
  const { rows } = await query<{
    tool_name: string;
    sample_count: number | string;
    learning_score: number | string | null;
    avg_outcome_score: number | string | null;
  }>(
    `WITH tool_scores AS (
       SELECT
         NULLIF(tool_item.value->>'toolName', '') AS tool_name,
         COALESCE((tool_item.value->>'success')::boolean, true) AS tool_success,
         COALESCE(outcomes.outcome_score,
           CASE jdt.confidence_mode
             WHEN 'act' THEN 0.25
             WHEN 'respond' THEN 0.08
             WHEN 'confirm' THEN -0.04
             WHEN 'escalate' THEN -0.18
             ELSE 0
           END
         ) AS outcome_score
       FROM jarvis_decision_traces jdt
       JOIN LATERAL jsonb_array_elements(COALESCE(jdt.tool_summary, '[]'::jsonb)) tool_item(value) ON TRUE
       LEFT JOIN LATERAL (
         SELECT AVG(
           CASE
             WHEN ooe.reward_score IS NOT NULL THEN ooe.reward_score
             ELSE CASE oom.status
               WHEN 'completed' THEN 1.0
               WHEN 'pending' THEN 0.2
               WHEN 'failed' THEN -0.9
               WHEN 'cancelled' THEN -0.55
               ELSE 0
             END
           END
         )::numeric AS outcome_score
         FROM jarvis_outcome_memory oom
         LEFT JOIN jarvis_outcome_events ooe
           ON ooe.outcome_id = oom.id
         WHERE oom.trace_id = jdt.id
       ) outcomes ON TRUE
       WHERE jdt.tenant_id = $1
         AND jdt.client_id = $2
         AND jdt.created_at > NOW() - make_interval(days => $5)
         AND ($3 = '' OR jdt.task_type = $3)
         AND ($4 = '' OR jdt.actor_profile = $4)
     )
     SELECT
       tool_name,
       COUNT(*)::int AS sample_count,
       ROUND(SUM(outcome_score * CASE WHEN tool_success THEN 1 ELSE 0.65 END)::numeric, 3) AS learning_score,
       ROUND(AVG(outcome_score)::numeric, 3) AS avg_outcome_score
     FROM tool_scores
     WHERE tool_name IS NOT NULL
     GROUP BY tool_name
     HAVING COUNT(*) >= 2
     ORDER BY learning_score DESC, sample_count DESC
     LIMIT 16`,
    [
      params.tenantId,
      params.clientId,
      taskType,
      actorProfile,
      Math.min(params.daysBack ?? 120, 180),
    ],
  ).catch(() => ({ rows: [] }));

  const normalized = rows.map((row) => ({
    tool_name: row.tool_name,
    sample_count: Number(row.sample_count || 0),
    learning_score: Number(row.learning_score || 0),
    avg_outcome_score: Number(row.avg_outcome_score || 0),
  }));

  return {
    task_type: taskType || null,
    actor_profile: actorProfile || null,
    preferred_tools: normalized.filter((item) => item.learning_score > 0).slice(0, 4),
    penalized_tools: normalized.filter((item) => item.learning_score < 0).sort((a, b) => a.learning_score - b.learning_score).slice(0, 4),
    total_scored_tools: normalized.length,
  };
}

export async function getJarvisCohortRetrievalSignals(params: {
  tenantId: string;
  segmentPrimary?: string | null;
  taskType?: string | null;
  actorProfile?: string | null;
  daysBack?: number;
}) {
  const segmentPrimary = String(params.segmentPrimary || '').trim();
  if (!segmentPrimary) return [];
  const taskType = String(params.taskType || '').trim();
  const actorProfile = String(params.actorProfile || '').trim();
  const { rows } = await query<{
    fact_type: string | null;
    source_type: string | null;
    sample_count: number | string;
    learning_score: number | string | null;
  }>(
    `WITH trace_scores AS (
       SELECT
         NULLIF(evidence_item.value->>'fact_type', '') AS fact_type,
         NULLIF(evidence_item.value->>'source_type', '') AS source_type,
         COALESCE(outcomes.outcome_score,
           CASE jdt.confidence_mode
             WHEN 'act' THEN 0.2
             WHEN 'respond' THEN 0.08
             WHEN 'confirm' THEN -0.02
             WHEN 'escalate' THEN -0.12
             ELSE 0
           END
         ) AS outcome_score
       FROM jarvis_decision_traces jdt
       JOIN clients c
         ON c.id = jdt.client_id
        AND c.tenant_id = jdt.tenant_id
       JOIN LATERAL jsonb_array_elements(COALESCE(jdt.evidence, '[]'::jsonb)) evidence_item(value) ON TRUE
       LEFT JOIN LATERAL (
         SELECT AVG(
           CASE
             WHEN ooe.reward_score IS NOT NULL THEN ooe.reward_score
             ELSE CASE oom.status
               WHEN 'completed' THEN 1.0
               WHEN 'pending' THEN 0.2
               WHEN 'failed' THEN -0.9
               WHEN 'cancelled' THEN -0.55
               ELSE 0
             END
           END
         )::numeric AS outcome_score
         FROM jarvis_outcome_memory oom
         LEFT JOIN jarvis_outcome_events ooe
           ON ooe.outcome_id = oom.id
         WHERE oom.trace_id = jdt.id
       ) outcomes ON TRUE
       WHERE jdt.tenant_id = $1
         AND c.segment_primary = $2
         AND jdt.created_at > NOW() - make_interval(days => $5)
         AND ($3 = '' OR jdt.task_type = $3)
         AND ($4 = '' OR jdt.actor_profile = $4)
     )
     SELECT
       fact_type,
       source_type,
       COUNT(*)::int AS sample_count,
       ROUND(AVG(outcome_score)::numeric, 3) AS learning_score
     FROM trace_scores
     WHERE fact_type IS NOT NULL OR source_type IS NOT NULL
     GROUP BY fact_type, source_type
     HAVING COUNT(*) >= 2
     ORDER BY learning_score DESC, sample_count DESC
     LIMIT 12`,
    [
      params.tenantId,
      segmentPrimary,
      taskType,
      actorProfile,
      Math.min(params.daysBack ?? 120, 180),
    ],
  ).catch(() => ({ rows: [] }));

  return rows.map((row) => ({
    fact_type: row.fact_type || null,
    source_type: row.source_type || null,
    sample_count: Number(row.sample_count || 0),
    learning_score: Number(row.learning_score || 0),
  }));
}
