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
  contextPage?: string | null;
  message: string;
};

export async function evaluateJarvisCase(base: { tenantId: string; clientId: string }, item: JarvisEvalCase) {
  const tenantId = item.tenantId || base.tenantId;
  const clientId = item.clientId || base.clientId;
  const intent = detectJarvisIntent(item.message, item.contextPage || undefined, undefined);
  const decision = buildJarvisRoutingDecision(intent);
  const taskType = detectJarvisTaskType({ message: item.message, intent });
  const actorProfile = resolveJarvisActorProfile({ role: item.role || null, contextPage: item.contextPage || null, message: item.message });
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
