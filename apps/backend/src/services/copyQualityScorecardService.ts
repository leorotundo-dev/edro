import { query } from '../db';
import { getClientPreferences } from './learningLoopService';

export type ClientCopyQualityScorecard = {
  client_id: string;
  generated_at: string;
  window_days: number;
  summary: {
    approval_rate: number;
    rejection_rate: number;
    approved_after_edit_rate: number;
    avg_regeneration_count: number;
    critic_gate_avg: number | null;
    critic_revision_rate: number;
    critic_samples: number;
    ab_tests_completed: number;
    linked_post_samples: number;
    learning_maturity: 'bootstrapping' | 'learning' | 'calibrated' | 'expert';
    overall_state: 'strong' | 'watch' | 'fragile';
  };
  leaderboard: {
    top_formats: Array<{ format: string; score: number; sample_size: number }>;
    top_angles: Array<{ angle: string; score: number; sample_size: number }>;
    top_platforms: Array<{ platform: string; score: number; sample_size: number }>;
    top_winning_formats: Array<{ format: string; wins: number }>;
  };
  policy_signals: {
    boost: string[];
    avoid: string[];
    liked_patterns: Array<{ text: string; count: number }>;
    disliked_patterns: Array<{ text: string; count: number }>;
    regeneration_patterns: string[];
  };
};

function round(value: number | null | undefined, digits = 3) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Number(value.toFixed(digits));
}

function normalizeState(params: {
  approvalRate: number;
  criticGateAvg: number | null;
  criticRevisionRate: number;
}) {
  if ((params.criticGateAvg ?? 0) >= 8.2 && params.approvalRate >= 0.65 && params.criticRevisionRate <= 0.35) return 'strong' as const;
  if ((params.criticGateAvg ?? 0) < 7.3 || params.approvalRate < 0.45 || params.criticRevisionRate >= 0.55) return 'fragile' as const;
  return 'watch' as const;
}

function classifyMaturity(total: number) {
  if (total < 20) return 'bootstrapping' as const;
  if (total < 100) return 'learning' as const;
  if (total < 500) return 'calibrated' as const;
  return 'expert' as const;
}

export async function buildClientCopyQualityScorecard(params: {
  tenantId: string;
  clientId: string;
  daysBack?: number;
}): Promise<ClientCopyQualityScorecard> {
  const windowDays = Math.min(params.daysBack ?? 90, 365);

  const [preferences, feedbackStats, criticStats, abStats, winningFormats, regenerationRows] = await Promise.all([
    getClientPreferences({ tenant_id: params.tenantId, client_id: params.clientId }),
    query<{
      total: string;
      approved: string;
      rejected: string;
      approved_after_edit: string;
      avg_regeneration_count: string | null;
    }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE action = 'approved')::text AS approved,
         COUNT(*) FILTER (WHERE action = 'rejected')::text AS rejected,
         COUNT(*) FILTER (WHERE action = 'approved_after_edit')::text AS approved_after_edit,
         AVG(COALESCE(regeneration_count, 0))::text AS avg_regeneration_count
       FROM preference_feedback
       WHERE tenant_id = $1
         AND client_id = $2
         AND feedback_type = 'copy'
         AND created_at > NOW() - make_interval(days => $3)`,
      [params.tenantId, params.clientId, windowDays],
    ),
    query<{
      avg_overall: string | null;
      revision_rate: string | null;
      total_reviewed: string;
    }>(
      `SELECT
         AVG(NULLIF((ecv.payload -> 'critic_gate' ->> 'overall')::numeric, 0))::text AS avg_overall,
         AVG(CASE WHEN COALESCE((ecv.payload -> 'critic_gate' ->> 'revised_applied')::boolean, false) THEN 1 ELSE 0 END)::text AS revision_rate,
         COUNT(*)::text AS total_reviewed
       FROM edro_copy_versions ecv
       JOIN edro_briefings eb ON eb.id = ecv.briefing_id
       WHERE COALESCE(eb.main_client_id::text, eb.client_id::text) = $1
         AND ecv.created_at > NOW() - make_interval(days => $2)
         AND ecv.payload ? 'critic_gate'`,
      [params.clientId, windowDays],
    ),
    query<{ completed: string }>(
      `SELECT COUNT(*)::text AS completed
       FROM copy_ab_tests cat
       JOIN edro_briefings eb ON eb.id = cat.briefing_id
       WHERE COALESCE(eb.main_client_id::text, eb.client_id::text) = $1
         AND cat.status = 'completed'
         AND cat.ended_at > NOW() - make_interval(days => $2)`,
      [params.clientId, windowDays],
    ),
    query<{ format: string | null; wins: string }>(
      `SELECT
         COALESCE(NULLIF(eb.payload ->> 'format', ''), NULLIF(eb.payload ->> 'channels', ''), 'unknown') AS format,
         COUNT(*)::text AS wins
       FROM copy_ab_tests cat
       JOIN edro_briefings eb ON eb.id = cat.briefing_id
       WHERE COALESCE(eb.main_client_id::text, eb.client_id::text) = $1
         AND cat.status = 'completed'
         AND cat.winner_id IS NOT NULL
         AND cat.ended_at > NOW() - make_interval(days => $2)
       GROUP BY 1
       ORDER BY COUNT(*) DESC
       LIMIT 5`,
      [params.clientId, windowDays],
    ),
    query<{ regeneration_instruction: string; count: number }>(
      `SELECT regeneration_instruction, COUNT(*)::int AS count
       FROM preference_feedback
       WHERE tenant_id = $1
         AND client_id = $2
         AND feedback_type = 'copy'
         AND regeneration_instruction IS NOT NULL
         AND created_at > NOW() - make_interval(days => $3)
       GROUP BY regeneration_instruction
       HAVING COUNT(*) >= 2
       ORDER BY count DESC
       LIMIT 5`,
      [params.tenantId, params.clientId, windowDays],
    ),
  ]);

  const prefs = preferences || {
    directives: { boost: [], avoid: [] },
    post_level_performance: { top_formats: [], top_angles: [], linked_posts: 0 },
    reportei_performance: { top_formats: [], top_tags: [], editorial_insights: [] },
    segment_feedback: { liked_patterns: [], disliked_patterns: [] },
  };
  const row = feedbackStats.rows[0] || {
    total: '0',
    approved: '0',
    rejected: '0',
    approved_after_edit: '0',
    avg_regeneration_count: '0',
  };
  const total = Number(row.total || 0);
  const approved = Number(row.approved || 0);
  const rejected = Number(row.rejected || 0);
  const approvedAfterEdit = Number(row.approved_after_edit || 0);
  const approvalRate = total ? approved / total : 0;
  const rejectionRate = total ? rejected / total : 0;
  const approvedAfterEditRate = total ? approvedAfterEdit / total : 0;
  const learningMaturity = classifyMaturity(total);

  const critic = criticStats.rows[0] || {
    avg_overall: null,
    revision_rate: '0',
    total_reviewed: '0',
  };
  const criticGateAvg = critic.avg_overall ? Number(critic.avg_overall) : null;
  const criticRevisionRate = round(Number(critic.revision_rate || 0));
  const criticSamples = Number(critic.total_reviewed || 0);
  const overallState = normalizeState({ approvalRate, criticGateAvg, criticRevisionRate });

  return {
    client_id: params.clientId,
    generated_at: new Date().toISOString(),
    window_days: windowDays,
    summary: {
      approval_rate: round(approvalRate),
      rejection_rate: round(rejectionRate),
      approved_after_edit_rate: round(approvedAfterEditRate),
      avg_regeneration_count: round(Number(row.avg_regeneration_count || 0), 2),
      critic_gate_avg: criticGateAvg != null ? round(criticGateAvg, 2) : null,
      critic_revision_rate: criticRevisionRate,
      critic_samples: criticSamples,
      ab_tests_completed: Number(abStats.rows[0]?.completed || 0),
      linked_post_samples: Number(prefs.post_level_performance?.linked_posts || 0),
      learning_maturity: learningMaturity,
      overall_state: overallState,
    },
    leaderboard: {
      top_formats: (prefs.post_level_performance?.top_formats || []).map((item) => ({
        format: `${item.platform}/${item.format}`,
        score: item.avg_score,
        sample_size: item.sample_size,
      })),
      top_angles: (prefs.post_level_performance?.top_angles || []).map((item) => ({
        angle: item.angle,
        score: item.avg_score,
        sample_size: item.sample_size,
      })),
      top_platforms: (prefs.reportei_performance?.top_formats || []).slice(0, 6).map((item) => ({
        platform: item.platform,
        score: item.score,
        sample_size: 1,
      })),
      top_winning_formats: winningFormats.rows.map((row) => ({
        format: String(row.format || 'unknown'),
        wins: Number(row.wins || 0),
      })),
    },
    policy_signals: {
      boost: prefs.directives?.boost || [],
      avoid: prefs.directives?.avoid || [],
      liked_patterns: prefs.segment_feedback?.liked_patterns || [],
      disliked_patterns: prefs.segment_feedback?.disliked_patterns || [],
      regeneration_patterns: regenerationRows.rows.map((row) => row.regeneration_instruction),
    },
  };
}
