import { query } from '../db';

export type PreferenceContext = {
  editorial: {
    approved_sources: Array<{ domain: string; approval_rate: number }>;
    approved_categories: Array<{ category: string; approval_rate: number }>;
    rejected_categories: Array<{ category: string; rejection_count: number }>;
    cooldown_topics: string[];
    preferred_approaches: string[];
    preferred_platforms: string[];
    ideal_timing_days: number;
    approval_rate_30d: number;
  };
  creative: {
    good_copy_examples: string[];
    bad_copy_examples: string[];
    common_rejection_tags: string[];
    preferred_tone: string | null;
    preferred_length: 'short' | 'medium' | 'long' | null;
    platform_patterns: Array<{ platform: string; approval_rate: number; avg_length: number }>;
    approval_rate_30d: number;
  };
  total_feedback_count: number;
  learning_maturity: 'bootstrapping' | 'learning' | 'calibrated' | 'expert';
};

type FeedbackPayload = {
  feedback_type: 'pauta' | 'copy';
  action: 'approved' | 'rejected' | 'approved_after_edit';
  rejection_tags?: string[];
  rejection_reason?: string;
  regeneration_instruction?: string;
  regeneration_count?: number;
  pauta_id?: string;
  pauta_source_type?: string;
  pauta_source_domain?: string;
  pauta_topic_category?: string;
  pauta_approach?: string;
  pauta_platforms?: string[];
  pauta_timing_days?: number;
  pauta_ai_score?: number;
  copy_briefing_id?: string;
  copy_rejected_text?: string;
  copy_approved_text?: string;
  copy_platform?: string;
  copy_format?: string;
  copy_pipeline?: string;
  copy_task_type?: string;
  copy_tone?: string;
  created_by?: string;
  persona_id?: string | null;
  momento_consciencia?: string | null;
  amd?: string | null;
  amd_achieved?: string | null;
};

const classifyMaturity = (
  total: number
): PreferenceContext['learning_maturity'] => {
  if (total < 20) return 'bootstrapping';
  if (total < 100) return 'learning';
  if (total < 500) return 'calibrated';
  return 'expert';
};

const toApprovalRate = (approved: number, total: number) => {
  if (!total) return 0;
  return Number((approved / total).toFixed(3));
};

const toPreferredLength = (avgLength: number | null) => {
  if (avgLength == null) return null;
  if (avgLength < 180) return 'short' as const;
  if (avgLength < 420) return 'medium' as const;
  return 'long' as const;
};

export async function recordPreferenceFeedback(params: {
  tenantId: string;
  clientId: string;
  payload: FeedbackPayload;
}) {
  const p = params.payload;
  const { rows } = await query<any>(
    `
    INSERT INTO preference_feedback (
      tenant_id, client_id, feedback_type, action,
      rejection_tags, rejection_reason, regeneration_instruction, regeneration_count,
      pauta_id, pauta_source_type, pauta_source_domain, pauta_topic_category, pauta_approach, pauta_platforms, pauta_timing_days, pauta_ai_score,
      copy_briefing_id, copy_rejected_text, copy_approved_text, copy_platform, copy_format, copy_pipeline, copy_task_type, copy_tone,
      created_by,
      persona_id, momento_consciencia, amd, amd_achieved
    )
    VALUES (
      $1,$2,$3,$4,
      $5,$6,$7,$8,
      $9,$10,$11,$12,$13,$14,$15,$16,
      $17,$18,$19,$20,$21,$22,$23,$24,
      $25,
      $26,$27,$28,$29
    )
    RETURNING *
    `,
    [
      params.tenantId,
      params.clientId,
      p.feedback_type,
      p.action,
      p.rejection_tags ?? null,
      p.rejection_reason ?? null,
      p.regeneration_instruction ?? null,
      p.regeneration_count ?? 0,
      p.pauta_id ?? null,
      p.pauta_source_type ?? null,
      p.pauta_source_domain ?? null,
      p.pauta_topic_category ?? null,
      p.pauta_approach ?? null,
      p.pauta_platforms ?? null,
      p.pauta_timing_days ?? null,
      p.pauta_ai_score ?? null,
      p.copy_briefing_id ?? null,
      p.copy_rejected_text ?? null,
      p.copy_approved_text ?? null,
      p.copy_platform ?? null,
      p.copy_format ?? null,
      p.copy_pipeline ?? null,
      p.copy_task_type ?? null,
      p.copy_tone ?? null,
      p.created_by ?? null,
      p.persona_id ?? null,
      p.momento_consciencia ?? null,
      p.amd ?? null,
      p.amd_achieved ?? null,
    ]
  );
  return rows[0] ?? null;
}

export async function getClientPreferenceContext(
  clientId: string,
  tenantId: string,
  filter?: { platform?: string; format?: string }
): Promise<PreferenceContext> {
  const [editorial, creative, totalRows] = await Promise.all([
    loadEditorialPreferences(clientId, tenantId),
    loadCreativePreferences(clientId, tenantId, filter),
    query<{ count: string }>(
      `SELECT COUNT(*)::text as count
       FROM preference_feedback
       WHERE client_id=$1 AND tenant_id=$2`,
      [clientId, tenantId]
    ),
  ]);

  const total = Number(totalRows.rows[0]?.count || 0);
  return {
    editorial,
    creative,
    total_feedback_count: total,
    learning_maturity: classifyMaturity(total),
  };
}

async function loadEditorialPreferences(
  clientId: string,
  tenantId: string
): Promise<PreferenceContext['editorial']> {
  const [sources, categories, cooldown, timing, approval30d, approaches, platforms] = await Promise.all([
    query<{
      domain: string | null;
      approved: string;
      total: string;
    }>(
      `
      SELECT
        pauta_source_domain as domain,
        COUNT(*) FILTER (WHERE action='approved')::text as approved,
        COUNT(*)::text as total
      FROM preference_feedback
      WHERE tenant_id=$1 AND client_id=$2
        AND feedback_type='pauta'
        AND pauta_source_domain IS NOT NULL
        AND created_at > NOW() - INTERVAL '90 days'
      GROUP BY pauta_source_domain
      HAVING COUNT(*) >= 2
      ORDER BY COUNT(*) DESC
      LIMIT 10
      `,
      [tenantId, clientId]
    ),
    query<{
      category: string | null;
      approved: string;
      total: string;
      rejected: string;
    }>(
      `
      SELECT
        pauta_topic_category as category,
        COUNT(*) FILTER (WHERE action='approved')::text as approved,
        COUNT(*) FILTER (WHERE action='rejected')::text as rejected,
        COUNT(*)::text as total
      FROM preference_feedback
      WHERE tenant_id=$1 AND client_id=$2
        AND feedback_type='pauta'
        AND pauta_topic_category IS NOT NULL
        AND created_at > NOW() - INTERVAL '90 days'
      GROUP BY pauta_topic_category
      ORDER BY COUNT(*) DESC
      `,
      [tenantId, clientId]
    ),
    query<{ category: string | null }>(
      `
      SELECT DISTINCT pauta_topic_category as category
      FROM preference_feedback
      WHERE tenant_id=$1 AND client_id=$2
        AND feedback_type='pauta'
        AND action='rejected'
        AND pauta_topic_category IS NOT NULL
        AND created_at > NOW() - INTERVAL '14 days'
      `,
      [tenantId, clientId]
    ),
    query<{ avg_days: number | null }>(
      `
      SELECT AVG(pauta_timing_days)::float as avg_days
      FROM preference_feedback
      WHERE tenant_id=$1 AND client_id=$2
        AND feedback_type='pauta'
        AND action='approved'
        AND pauta_timing_days IS NOT NULL
      `,
      [tenantId, clientId]
    ),
    query<{ approved: string; total: string }>(
      `
      SELECT
        COUNT(*) FILTER (WHERE action='approved')::text as approved,
        COUNT(*)::text as total
      FROM preference_feedback
      WHERE tenant_id=$1 AND client_id=$2
        AND feedback_type='pauta'
        AND created_at > NOW() - INTERVAL '30 days'
      `,
      [tenantId, clientId]
    ),
    query<{ approach: string; total: string }>(
      `
      SELECT pauta_approach as approach, COUNT(*)::text as total
      FROM preference_feedback
      WHERE tenant_id=$1 AND client_id=$2
        AND feedback_type='pauta'
        AND action='approved'
        AND pauta_approach IS NOT NULL
        AND created_at > NOW() - INTERVAL '90 days'
      GROUP BY pauta_approach
      ORDER BY COUNT(*) DESC
      LIMIT 5
      `,
      [tenantId, clientId]
    ),
    query<{ platform: string }>(
      `
      SELECT DISTINCT unnest(pauta_platforms) as platform
      FROM preference_feedback
      WHERE tenant_id=$1 AND client_id=$2
        AND feedback_type='pauta'
        AND action='approved'
        AND pauta_platforms IS NOT NULL
      LIMIT 8
      `,
      [tenantId, clientId]
    ),
  ]);

  const approved30 = Number(approval30d.rows[0]?.approved || 0);
  const total30 = Number(approval30d.rows[0]?.total || 0);

  return {
    approved_sources: sources.rows
      .filter((row) => row.domain)
      .map((row) => ({
        domain: String(row.domain),
        approval_rate: toApprovalRate(Number(row.approved || 0), Number(row.total || 0)),
      })),
    approved_categories: categories.rows
      .filter((row) => row.category)
      .map((row) => ({
        category: String(row.category),
        approval_rate: toApprovalRate(Number(row.approved || 0), Number(row.total || 0)),
      }))
      .sort((a, b) => b.approval_rate - a.approval_rate)
      .slice(0, 10),
    rejected_categories: categories.rows
      .filter((row) => row.category && Number(row.rejected || 0) > 0)
      .map((row) => ({
        category: String(row.category),
        rejection_count: Number(row.rejected || 0),
      }))
      .sort((a, b) => b.rejection_count - a.rejection_count)
      .slice(0, 10),
    cooldown_topics: cooldown.rows
      .map((row) => String(row.category || '').trim())
      .filter(Boolean),
    preferred_approaches: approaches.rows
      .map((row) => String(row.approach || '').trim())
      .filter(Boolean),
    preferred_platforms: platforms.rows
      .map((row) => String(row.platform || '').trim())
      .filter(Boolean),
    ideal_timing_days: Math.max(1, Math.round(Number(timing.rows[0]?.avg_days || 3))),
    approval_rate_30d: toApprovalRate(approved30, total30),
  };
}

async function loadCreativePreferences(
  clientId: string,
  tenantId: string,
  filter?: { platform?: string; format?: string }
): Promise<PreferenceContext['creative']> {
  // Quando platform é fornecido, exemplos são isolados por plataforma —
  // copy do Instagram não influencia geração de LinkedIn e vice-versa.
  const [approved, rejected, rejectionTags, toneStats, platformStats, approval30d, avgLengthRows] = await Promise.all([
    filter?.platform
      ? query<{ text: string | null }>(
          `SELECT copy_approved_text as text
           FROM preference_feedback
           WHERE tenant_id=$1 AND client_id=$2
             AND feedback_type='copy' AND action IN ('approved','approved_after_edit')
             AND copy_approved_text IS NOT NULL AND copy_platform=$3
           ORDER BY created_at DESC LIMIT 5`,
          [tenantId, clientId, filter.platform]
        )
      : query<{ text: string | null }>(
          `SELECT copy_approved_text as text
           FROM preference_feedback
           WHERE tenant_id=$1 AND client_id=$2
             AND feedback_type='copy' AND action IN ('approved','approved_after_edit')
             AND copy_approved_text IS NOT NULL
           ORDER BY created_at DESC LIMIT 5`,
          [tenantId, clientId]
        ),
    filter?.platform
      ? query<{ text: string | null }>(
          `SELECT copy_rejected_text as text
           FROM preference_feedback
           WHERE tenant_id=$1 AND client_id=$2
             AND feedback_type='copy' AND action='rejected'
             AND copy_rejected_text IS NOT NULL AND copy_platform=$3
           ORDER BY created_at DESC LIMIT 5`,
          [tenantId, clientId, filter.platform]
        )
      : query<{ text: string | null }>(
          `SELECT copy_rejected_text as text
           FROM preference_feedback
           WHERE tenant_id=$1 AND client_id=$2
             AND feedback_type='copy' AND action='rejected'
             AND copy_rejected_text IS NOT NULL
           ORDER BY created_at DESC LIMIT 5`,
          [tenantId, clientId]
        ),
    query<{ tag: string; total: string }>(
      `
      SELECT unnest(rejection_tags) as tag, COUNT(*)::text as total
      FROM preference_feedback
      WHERE tenant_id=$1 AND client_id=$2
        AND feedback_type='copy'
        AND rejection_tags IS NOT NULL
      GROUP BY tag
      ORDER BY COUNT(*) DESC
      LIMIT 8
      `,
      [tenantId, clientId]
    ),
    query<{ tone: string | null; total: string }>(
      `
      SELECT copy_tone as tone, COUNT(*)::text as total
      FROM preference_feedback
      WHERE tenant_id=$1 AND client_id=$2
        AND feedback_type='copy'
        AND action IN ('approved','approved_after_edit')
        AND copy_tone IS NOT NULL
      GROUP BY copy_tone
      ORDER BY COUNT(*) DESC
      LIMIT 1
      `,
      [tenantId, clientId]
    ),
    query<{ platform: string | null; approved: string; total: string; avg_length: number | null }>(
      `
      SELECT
        copy_platform as platform,
        COUNT(*) FILTER (WHERE action IN ('approved','approved_after_edit'))::text as approved,
        COUNT(*)::text as total,
        AVG(LENGTH(COALESCE(copy_approved_text, copy_rejected_text, '')))::float as avg_length
      FROM preference_feedback
      WHERE tenant_id=$1 AND client_id=$2
        AND feedback_type='copy'
        AND copy_platform IS NOT NULL
      GROUP BY copy_platform
      ORDER BY COUNT(*) DESC
      `,
      [tenantId, clientId]
    ),
    query<{ approved: string; total: string }>(
      `
      SELECT
        COUNT(*) FILTER (WHERE action IN ('approved','approved_after_edit'))::text as approved,
        COUNT(*)::text as total
      FROM preference_feedback
      WHERE tenant_id=$1 AND client_id=$2
        AND feedback_type='copy'
        AND created_at > NOW() - INTERVAL '30 days'
      `,
      [tenantId, clientId]
    ),
    query<{ avg_len: number | null }>(
      `
      SELECT AVG(LENGTH(copy_approved_text))::float as avg_len
      FROM preference_feedback
      WHERE tenant_id=$1 AND client_id=$2
        AND feedback_type='copy'
        AND action IN ('approved','approved_after_edit')
        AND copy_approved_text IS NOT NULL
      `,
      [tenantId, clientId]
    ),
  ]);

  const approved30 = Number(approval30d.rows[0]?.approved || 0);
  const total30 = Number(approval30d.rows[0]?.total || 0);

  return {
    good_copy_examples: approved.rows
      .map((row) => String(row.text || '').trim())
      .filter(Boolean),
    bad_copy_examples: rejected.rows
      .map((row) => String(row.text || '').trim())
      .filter(Boolean),
    common_rejection_tags: rejectionTags.rows
      .map((row) => String(row.tag || '').trim())
      .filter(Boolean),
    preferred_tone: toneStats.rows[0]?.tone ? String(toneStats.rows[0].tone) : null,
    preferred_length: toPreferredLength(avgLengthRows.rows[0]?.avg_len ?? null),
    platform_patterns: platformStats.rows
      .filter((row) => row.platform)
      .map((row) => ({
        platform: String(row.platform),
        approval_rate: toApprovalRate(Number(row.approved || 0), Number(row.total || 0)),
        avg_length: Number(row.avg_length || 0),
      })),
    approval_rate_30d: toApprovalRate(approved30, total30),
  };
}

export function buildPreferencePromptBlock(context: PreferenceContext): string {
  const parts: string[] = [];

  if (context.editorial.approved_categories.length) {
    parts.push(
      `CATEGORIAS APROVADAS: ${context.editorial.approved_categories
        .slice(0, 5)
        .map((item) => `${item.category} (${Math.round(item.approval_rate * 100)}%)`)
        .join(', ')}`
    );
  }

  if (context.editorial.cooldown_topics.length) {
    parts.push(`EVITAR AGORA: ${context.editorial.cooldown_topics.slice(0, 6).join(', ')}`);
  }

  if (context.creative.common_rejection_tags.length) {
    parts.push(`PADROES REJEITADOS: ${context.creative.common_rejection_tags.slice(0, 6).join(', ')}`);
  }

  if (context.creative.good_copy_examples.length) {
    parts.push(
      `EXEMPLO QUE FUNCIONA: "${context.creative.good_copy_examples[0].slice(0, 240)}"`
    );
  }

  if (context.creative.bad_copy_examples.length) {
    parts.push(
      `EXEMPLO A EVITAR: "${context.creative.bad_copy_examples[0].slice(0, 240)}"`
    );
  }

  if (context.creative.preferred_tone) {
    parts.push(`TOM PREFERIDO: ${context.creative.preferred_tone}`);
  }

  if (context.creative.preferred_length) {
    parts.push(`TAMANHO PREFERIDO: ${context.creative.preferred_length}`);
  }

  const bestPlatforms = (context.creative.platform_patterns || [])
    .filter((p) => p.approval_rate >= 0.65 && p.platform)
    .map((p) => `${p.platform} (${Math.round(p.approval_rate * 100)}% aprovacao)`)
    .slice(0, 3)
    .join(', ');
  if (bestPlatforms) {
    parts.push(`PLATAFORMAS COM MELHOR APROVACAO: ${bestPlatforms}`);
  }

  parts.push(`MATURIDADE DE APRENDIZADO: ${context.learning_maturity}`);
  return parts.length ? `\n\nPreferencias editoriais do cliente:\n${parts.join('\n')}` : '';
}

