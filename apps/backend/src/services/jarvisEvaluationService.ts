import { query } from '../db';
import { buildClientKnowledgeBase } from './clientKnowledgeBaseService';
import { buildClientState } from './jarvisDecisionEngine';
import {
  buildJarvisExecutionPolicy,
  buildJarvisExecutionPromptBlock,
  buildJarvisToolPolicyPromptBlock,
  detectJarvisTaskType,
  resolveJarvisActorProfile,
  assessJarvisConfidence,
} from './jarvisExecutionService';
import { buildJarvisRoutingDecision, detectJarvisIntent } from './jarvisPolicyService';
import { getJarvisActionPolicySignals, getJarvisToolPolicySignals, listRecentJarvisEpisodes } from './jarvisOutcomeService';

export type JarvisEvalCase = {
  label?: string;
  tenantId?: string;
  clientId?: string;
  role?: string | null;
  actorProfileOverride?: 'founder' | 'atendimento' | 'operacao' | 'social' | 'closer' | 'manager' | 'general' | null;
  contextPage?: string | null;
  message: string;
  source?: 'manual' | 'history';
  traceId?: string | null;
  baselineConfidence?: number | null;
  baselineReward?: number | null;
  baselineStatus?: string | null;
};

type JarvisHistoryTraceRow = {
  trace_id: string;
  route: string;
  task_type: string;
  actor_profile: string;
  message_excerpt: string;
  confidence_score: string | null;
  reward_score: string | null;
  final_status: string | null;
  created_at: string;
};

function isActorProfile(value: string | null | undefined): value is NonNullable<JarvisEvalCase['actorProfileOverride']> {
  return ['founder', 'atendimento', 'operacao', 'social', 'closer', 'manager', 'general'].includes(String(value || '').toLowerCase());
}

function inferHistoryContextPage(route: string, taskType: string) {
  if (taskType === 'meeting_followup' || taskType === 'scheduling') return '/meetings';
  if (taskType === 'content_generation' || route === 'planning') return '/planning';
  if (taskType === 'risk_triage' || taskType === 'status_check' || taskType === 'system_repair') return '/operations';
  if (taskType === 'relationship_reply') return '/clients';
  return route === 'planning' ? '/planning' : '/jarvis';
}

export async function buildJarvisHistorySuite(params: {
  tenantId: string;
  clientId: string;
  daysBack?: number;
  limit?: number;
  mix?: 'balanced' | 'failure_focus' | 'recent';
}) {
  const daysBack = Math.min(Math.max(params.daysBack ?? 90, 7), 365);
  const limit = Math.min(Math.max(params.limit ?? 8, 4), 20);
  const mix = params.mix ?? 'balanced';

  const { rows } = await query<JarvisHistoryTraceRow>(
    `SELECT
       jdt.id::text AS trace_id,
       jdt.route,
       jdt.task_type,
       jdt.actor_profile,
       jdt.message_excerpt,
       jdt.confidence_score::text,
       ROUND(COALESCE(
         MAX(ooe.reward_score),
         AVG(
           CASE oom.status
             WHEN 'completed' THEN 1.0
             WHEN 'pending' THEN 0.2
             WHEN 'failed' THEN -0.9
             WHEN 'cancelled' THEN -0.55
             ELSE 0
           END
         ),
         0
       )::numeric, 3)::text AS reward_score,
       MAX(oom.status) FILTER (WHERE oom.status IS NOT NULL) AS final_status,
       jdt.created_at::text
     FROM jarvis_decision_traces jdt
     LEFT JOIN jarvis_outcome_memory oom ON oom.trace_id = jdt.id
     LEFT JOIN jarvis_outcome_events ooe ON ooe.outcome_id = oom.id
     WHERE jdt.tenant_id = $1
       AND jdt.client_id = $2
       AND jdt.created_at > NOW() - make_interval(days => $3)
       AND COALESCE(NULLIF(TRIM(jdt.message_excerpt), ''), '') <> ''
     GROUP BY jdt.id, jdt.route, jdt.task_type, jdt.actor_profile, jdt.message_excerpt, jdt.confidence_score, jdt.created_at
     ORDER BY jdt.created_at DESC
     LIMIT 120`,
    [params.tenantId, params.clientId, daysBack],
  );

  const normalized = rows.map((row) => ({
    ...row,
    reward: Number(row.reward_score || 0),
    confidence: Number(row.confidence_score || 0),
  }));

  const uniqueByMessage = Array.from(
    new Map(normalized.map((row) => [row.message_excerpt.trim().toLowerCase(), row])).values(),
  );

  let selected = [] as typeof uniqueByMessage;
  if (mix === 'recent') {
    selected = uniqueByMessage.slice(0, limit);
  } else if (mix === 'failure_focus') {
    const risk = [...uniqueByMessage].sort((a, b) => (a.reward - b.reward) || (a.confidence - b.confidence));
    selected = risk.slice(0, limit);
  } else {
    const negativeTarget = Math.ceil(limit / 2);
    const negatives = uniqueByMessage
      .filter((row) => row.reward < 0 || row.final_status === 'failed' || row.final_status === 'cancelled')
      .sort((a, b) => (a.reward - b.reward) || (a.confidence - b.confidence))
      .slice(0, negativeTarget);
    const positive = uniqueByMessage
      .filter((row) => !negatives.some((picked) => picked.trace_id === row.trace_id))
      .sort((a, b) => (b.reward - a.reward) || (b.confidence - a.confidence))
      .slice(0, Math.max(0, limit - negatives.length));
    selected = [...negatives, ...positive];
  }

  return selected.slice(0, limit).map<JarvisEvalCase>((row) => ({
    label: `[history] ${row.task_type} | ${row.message_excerpt.slice(0, 52)}`,
    message: row.message_excerpt,
    actorProfileOverride: isActorProfile(row.actor_profile) ? row.actor_profile : null,
    contextPage: inferHistoryContextPage(row.route, row.task_type),
    source: 'history',
    traceId: row.trace_id,
    baselineConfidence: row.confidence,
    baselineReward: row.reward,
    baselineStatus: row.final_status,
  }));
}

export async function evaluateJarvisCase(base: { tenantId: string; clientId: string }, item: JarvisEvalCase) {
  const tenantId = item.tenantId || base.tenantId;
  const clientId = item.clientId || base.clientId;
  const intent = detectJarvisIntent(item.message, item.contextPage || undefined, undefined);
  const decision = buildJarvisRoutingDecision(intent);
  const taskType = detectJarvisTaskType({ message: item.message, intent });
  const actorProfile = isActorProfile(item.actorProfileOverride)
    ? item.actorProfileOverride
    : resolveJarvisActorProfile({ role: item.role || null, contextPage: item.contextPage || null, message: item.message });
  const [knowledgeBase, clientState, actionPolicy, toolPolicy, recentEpisodes] = await Promise.all([
    buildClientKnowledgeBase({
      tenantId,
      clientId,
      question: item.message,
      daysBack: 60,
      limitDocuments: 6,
      intent: decision.route === 'operations' ? 'ops' : 'relationship',
      taskType,
      actorProfile,
    }),
    buildClientState(tenantId, clientId),
    getJarvisActionPolicySignals({
      tenantId,
      clientId,
      taskType,
      actorProfile,
    }).catch(() => null),
    getJarvisToolPolicySignals({
      tenantId,
      clientId,
      taskType,
      actorProfile,
    }).catch(() => null),
    listRecentJarvisEpisodes({
      tenantId,
      clientId,
      daysBack: 90,
      limit: 4,
    }).catch(() => []),
  ]);
  const confidence = assessJarvisConfidence({
    decision,
    taskType,
    actorProfile,
    knowledgeBase,
    clientState,
    actionPolicy,
  });
  const policy = buildJarvisExecutionPolicy({
    decision,
    taskType,
    actorProfile,
    confidence,
    actionPolicy,
  });

  return {
    label: item.label || item.message.slice(0, 60),
    tenant_id: tenantId,
    client_id: clientId,
    intent,
    route: decision.route,
    task_type: taskType,
    actor_profile: actorProfile,
    source: item.source || 'manual',
    trace_id: item.traceId || null,
    baseline_confidence: item.baselineConfidence ?? null,
    baseline_reward: item.baselineReward ?? null,
    baseline_status: item.baselineStatus ?? null,
    confidence,
    action_policy: actionPolicy,
    tool_policy: toolPolicy,
    governance: knowledgeBase.governance,
    communication_radar: knowledgeBase.radar,
    recent_episodes: recentEpisodes,
    packet_preview: `${buildJarvisExecutionPromptBlock(policy)}${buildJarvisToolPolicyPromptBlock(toolPolicy) ? `\n\n${buildJarvisToolPolicyPromptBlock(toolPolicy)}` : ''}`,
  };
}

export async function evaluateJarvisSuite(base: { tenantId: string; clientId: string }, suite: JarvisEvalCase[]) {
  const cases = [];
  for (const item of suite) {
    cases.push(await evaluateJarvisCase(base, item));
  }
  const total = cases.length;
  const avgConfidence = total
    ? cases.reduce((sum, item) => sum + Number(item.confidence?.score || 0), 0) / total
    : 0;
  const modeRate = (mode: string) => total ? cases.filter((item) => item.confidence?.mode === mode).length / total : 0;

  return {
    total_cases: total,
    avg_confidence: Number(avgConfidence.toFixed(3)),
    respond_rate: Number(modeRate('respond').toFixed(3)),
    act_rate: Number(modeRate('act').toFixed(3)),
    confirm_rate: Number(modeRate('confirm').toFixed(3)),
    escalate_rate: Number(modeRate('escalate').toFixed(3)),
    tool_policy_hit_rate: Number((total ? cases.filter((item) => (item.tool_policy?.preferred_tools?.length || 0) > 0).length / total : 0).toFixed(3)),
    cases,
  };
}

export async function buildClientJarvisHistoricalBenchmark(params: {
  tenantId: string;
  clientId: string;
  daysBack?: number;
  limit?: number;
  mix?: 'balanced' | 'failure_focus' | 'recent';
}) {
  const suite = await buildJarvisHistorySuite(params);
  const evaluation = await evaluateJarvisSuite(
    { tenantId: params.tenantId, clientId: params.clientId },
    suite,
  );
  return {
    params: {
      days_back: Math.min(Math.max(params.daysBack ?? 90, 7), 365),
      limit: Math.min(Math.max(params.limit ?? 8, 4), 20),
      mix: params.mix ?? 'balanced',
    },
    suite_size: suite.length,
    suite,
    evaluation,
  };
}

export async function buildClientJarvisQualityScorecard(params: {
  tenantId: string;
  clientId: string;
  daysBack?: number;
}) {
  const daysBack = Math.min(params.daysBack ?? 90, 365);
  const [summaryRes, leaderboardRes, toolLeaderboardRes] = await Promise.all([
    query<{
      total_traces: string;
      avg_confidence: string | null;
      high_confidence_rate: string | null;
      completed_outcomes: string;
      failed_outcomes: string;
      cancelled_outcomes: string;
      delayed_events: string;
      episode_count: string;
    }>(
      `WITH trace_base AS (
         SELECT id, confidence_score, confidence_band
         FROM jarvis_decision_traces
         WHERE tenant_id = $1
           AND client_id = $2
           AND created_at > NOW() - make_interval(days => $3)
       ),
       outcome_base AS (
         SELECT status
         FROM jarvis_outcome_memory
         WHERE tenant_id = $1
           AND client_id = $2
           AND created_at > NOW() - make_interval(days => $3)
       )
       SELECT
         (SELECT COUNT(*)::text FROM trace_base) AS total_traces,
         (SELECT ROUND(AVG(confidence_score)::numeric, 3)::text FROM trace_base) AS avg_confidence,
         (SELECT ROUND(AVG(CASE WHEN confidence_band = 'high' THEN 1 ELSE 0 END)::numeric, 3)::text FROM trace_base) AS high_confidence_rate,
         (SELECT COUNT(*)::text FROM outcome_base WHERE status = 'completed') AS completed_outcomes,
         (SELECT COUNT(*)::text FROM outcome_base WHERE status = 'failed') AS failed_outcomes,
         (SELECT COUNT(*)::text FROM outcome_base WHERE status = 'cancelled') AS cancelled_outcomes,
         (SELECT COUNT(*)::text FROM jarvis_outcome_events WHERE tenant_id = $1 AND client_id = $2 AND created_at > NOW() - make_interval(days => $3)) AS delayed_events,
         (SELECT COUNT(*)::text FROM jarvis_episode_memory WHERE tenant_id = $1 AND client_id = $2 AND created_at > NOW() - make_interval(days => $3)) AS episode_count`,
      [params.tenantId, params.clientId, daysBack],
    ).catch(() => ({ rows: [] })),
    query<{
      task_type: string;
      actor_profile: string;
      confidence_mode: string;
      sample_count: string;
      avg_confidence: string | null;
      avg_reward: string | null;
    }>(
      `SELECT
         jdt.task_type,
         jdt.actor_profile,
         jdt.confidence_mode,
         COUNT(*)::text AS sample_count,
         ROUND(AVG(jdt.confidence_score)::numeric, 3)::text AS avg_confidence,
         ROUND(AVG(
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
         )::numeric, 3)::text AS avg_reward
       FROM jarvis_decision_traces jdt
       LEFT JOIN jarvis_outcome_memory oom ON oom.trace_id = jdt.id
       LEFT JOIN jarvis_outcome_events ooe ON ooe.outcome_id = oom.id
       WHERE jdt.tenant_id = $1
         AND jdt.client_id = $2
         AND jdt.created_at > NOW() - make_interval(days => $3)
       GROUP BY jdt.task_type, jdt.actor_profile, jdt.confidence_mode
       ORDER BY COUNT(*) DESC, AVG(jdt.confidence_score) DESC
       LIMIT 12`,
      [params.tenantId, params.clientId, daysBack],
    ).catch(() => ({ rows: [] })),
    query<{
      tool_name: string;
      sample_count: string;
      avg_reward: string | null;
    }>(
      `SELECT
         NULLIF(tool_item.value->>'toolName', '') AS tool_name,
         COUNT(*)::text AS sample_count,
         ROUND(AVG(
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
         )::numeric, 3)::text AS avg_reward
       FROM jarvis_decision_traces jdt
       JOIN LATERAL jsonb_array_elements(COALESCE(jdt.tool_summary, '[]'::jsonb)) tool_item(value) ON TRUE
       LEFT JOIN jarvis_outcome_memory oom ON oom.trace_id = jdt.id
       LEFT JOIN jarvis_outcome_events ooe ON ooe.outcome_id = oom.id
       WHERE jdt.tenant_id = $1
         AND jdt.client_id = $2
         AND jdt.created_at > NOW() - make_interval(days => $3)
         AND NULLIF(tool_item.value->>'toolName', '') IS NOT NULL
       GROUP BY NULLIF(tool_item.value->>'toolName', '')
       ORDER BY COUNT(*) DESC, AVG(COALESCE(ooe.reward_score, 0)) DESC
       LIMIT 10`,
      [params.tenantId, params.clientId, daysBack],
    ).catch(() => ({ rows: [] })),
  ]);

  const summaryRow = summaryRes.rows[0] || {
    total_traces: '0',
    avg_confidence: '0',
    high_confidence_rate: '0',
    completed_outcomes: '0',
    failed_outcomes: '0',
    cancelled_outcomes: '0',
    delayed_events: '0',
    episode_count: '0',
  };

  return {
    summary: {
      total_traces: Number(summaryRow.total_traces || 0),
      avg_confidence: Number(summaryRow.avg_confidence || 0),
      high_confidence_rate: Number(summaryRow.high_confidence_rate || 0),
      completed_outcomes: Number(summaryRow.completed_outcomes || 0),
      failed_outcomes: Number(summaryRow.failed_outcomes || 0),
      cancelled_outcomes: Number(summaryRow.cancelled_outcomes || 0),
      delayed_events: Number(summaryRow.delayed_events || 0),
      episode_count: Number(summaryRow.episode_count || 0),
    },
    leaderboard: leaderboardRes.rows.map((row) => ({
      task_type: row.task_type,
      actor_profile: row.actor_profile,
      confidence_mode: row.confidence_mode,
      sample_count: Number(row.sample_count || 0),
      avg_confidence: Number(row.avg_confidence || 0),
      avg_reward: Number(row.avg_reward || 0),
    })),
    tool_leaderboard: toolLeaderboardRes.rows.map((row) => ({
      tool_name: row.tool_name,
      sample_count: Number(row.sample_count || 0),
      avg_reward: Number(row.avg_reward || 0),
    })),
  };
}
