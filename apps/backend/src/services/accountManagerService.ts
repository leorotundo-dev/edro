/**
 * accountManagerService.ts
 *
 * AI Account Manager — generates proactive alerts and recommended actions
 * for each client by synthesizing all available signals:
 *
 *   • client_health_scores (trend + score)
 *   • copy_roi_scores      (top copy performance)
 *   • client_learning_rules (behavioral patterns)
 *   • ai_opportunities     (pending strategic opportunities)
 *   • format_performance_metrics (last 30d engagement)
 *   • invoices             (payment risk)
 *   • edro_briefings       (activity drop)
 *
 * Claude generates structured JSON: [{ alert_type, priority, title, body, recommended_action }]
 *
 * Called:
 *   POST /clients/:clientId/account-manager/compute  (on-demand)
 *   GET  /clients/:clientId/account-manager/alerts   (cached)
 *   Daily job: accountManagerWorker (runs each client once per day)
 */

import { query } from '../db/db';
import { ClaudeService } from './ai/claudeService';

export type AlertType =
  | 'churn_risk'
  | 'upsell'
  | 'expand_services'
  | 'positive_momentum'
  | 'payment_risk'
  | 'engagement_drop'
  | 'opportunity';

export interface AccountManagerAlert {
  id: string;
  alert_type: AlertType;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  title: string;
  body: string;
  recommended_action: string;
  health_score: number | null;
  health_trend: string | null;
  roi_score: number | null;
  signals: Record<string, any>;
  status: 'active' | 'dismissed' | 'actioned';
  computed_at: string;
}

// ── Collect all signals for a client ──────────────────────────────────────────
async function collectSignals(tenantId: string, clientId: string) {
  const [
    { rows: [healthRow] },
    { rows: roiRows },
    { rows: learningRows },
    { rows: opportunityRows },
    { rows: [perfRow] },
    { rows: [activityRow] },
    { rows: [invoiceRow] },
    { rows: [clientRow] },
  ] = await Promise.all([
    // Latest health score + trend
    query(
      `SELECT score, trend, factors FROM client_health_scores
       WHERE client_id = $1 ORDER BY period_date DESC LIMIT 1`,
      [clientId],
    ).catch(() => ({ rows: [null] })),

    // Top 3 copy ROI scores
    query(
      `SELECT roi_score, roi_label, platform, fogg_composite, avg_ctr, avg_roas, summary
       FROM copy_roi_scores WHERE client_id = $1
       ORDER BY roi_score DESC NULLS LAST LIMIT 3`,
      [clientId],
    ).catch(() => ({ rows: [] })),

    // Latest learning rules (top 5)
    query(
      `SELECT rule_type, rule_text FROM client_learning_rules
       WHERE tenant_id = $1 AND client_id = $2
       ORDER BY created_at DESC LIMIT 5`,
      [tenantId, clientId],
    ).catch(() => ({ rows: [] })),

    // Active AI opportunities (top 5 by priority)
    query(
      `SELECT title, description, priority, suggested_action, source
       FROM ai_opportunities
       WHERE client_id = $1::uuid AND status NOT IN ('dismissed','actioned')
         AND (expires_at IS NULL OR expires_at > now())
       ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END
       LIMIT 5`,
      [clientId],
    ).catch(() => ({ rows: [] })),

    // Last 30d engagement summary
    query(
      `SELECT
         COALESCE(SUM(fpm.impressions), 0) AS total_impressions,
         COALESCE(SUM(fpm.clicks), 0)      AS total_clicks,
         COALESCE(SUM(fpm.spend_brl), 0)   AS total_spend,
         COALESCE(AVG(fpm.roas), 0)        AS avg_roas
       FROM format_performance_metrics fpm
       JOIN campaign_formats cf ON cf.id = fpm.campaign_format_id
       JOIN campaigns camp ON camp.id = cf.campaign_id
       WHERE fpm.client_id = $1 AND fpm.measurement_date >= now() - interval '30 days'`,
      [clientId],
    ).catch(() => ({ rows: [null] })),

    // Briefing activity (last 30d vs prev 30d)
    query(
      `SELECT
         COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days')::int AS recent_30d,
         COUNT(*) FILTER (WHERE created_at >= now() - interval '60 days'
                            AND created_at < now() - interval '30 days')::int AS prev_30d
       FROM edro_briefings
       WHERE (main_client_id = $1 OR client_id = $1)`,
      [clientId],
    ).catch(() => ({ rows: [null] })),

    // Unpaid invoices
    query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'overdue')::int AS overdue_count,
         COALESCE(SUM(total_brl) FILTER (WHERE status = 'overdue'), 0)::numeric AS overdue_amount
       FROM invoices WHERE client_id = $1`,
      [clientId],
    ).catch(() => ({ rows: [null] })),

    // Client name + segment
    query(
      `SELECT name, segment_primary FROM clients WHERE id = $1`,
      [clientId],
    ).catch(() => ({ rows: [null] })),
  ]);

  return {
    client: { name: clientRow?.name || clientId, segment: clientRow?.segment_primary || '' },
    health: healthRow ? {
      score: Number(healthRow.score),
      trend: healthRow.trend,
      factors: healthRow.factors || {},
    } : null,
    topRoi: roiRows.map((r: any) => ({
      score: Number(r.roi_score), label: r.roi_label, platform: r.platform,
      fogg: Number(r.fogg_composite), ctr: r.avg_ctr, roas: r.avg_roas, summary: r.summary,
    })),
    learningRules: learningRows.map((r: any) => ({ type: r.rule_type, text: r.rule_text })),
    opportunities: opportunityRows.map((r: any) => ({
      title: r.title, priority: r.priority, action: r.suggested_action, source: r.source,
    })),
    performance: perfRow ? {
      impressions: Number(perfRow.total_impressions),
      clicks: Number(perfRow.total_clicks),
      spend_brl: Number(perfRow.total_spend),
      roas: Number(perfRow.avg_roas),
    } : null,
    activity: activityRow ? {
      recent_30d: Number(activityRow.recent_30d),
      prev_30d: Number(activityRow.prev_30d),
      drop_pct: activityRow.prev_30d > 0
        ? Math.round(((activityRow.prev_30d - activityRow.recent_30d) / activityRow.prev_30d) * 100)
        : 0,
    } : null,
    invoice: invoiceRow ? {
      overdue_count: Number(invoiceRow.overdue_count),
      overdue_amount: Number(invoiceRow.overdue_amount),
    } : null,
  };
}

// ── Ask Claude to generate alerts ──────────────────────────────────────────────
async function generateAlerts(signals: Awaited<ReturnType<typeof collectSignals>>): Promise<Array<{
  alert_type: AlertType;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  title: string;
  body: string;
  recommended_action: string;
}>> {
  const healthLine  = signals.health
    ? `Score de saúde: ${signals.health.score}/100 (tendência: ${signals.health.trend})`
    : 'Sem dados de health score';
  const roiLine     = signals.topRoi.length
    ? `Melhor ROI: ${signals.topRoi[0].score}/100 na ${signals.topRoi[0].platform}`
    : 'Sem dados de ROI de copy';
  const actLine     = signals.activity
    ? `Briefings: ${signals.activity.recent_30d} nos últimos 30d vs ${signals.activity.prev_30d} no período anterior (queda: ${signals.activity.drop_pct}%)`
    : '';
  const invoiceLine = signals.invoice?.overdue_count > 0
    ? `ATENÇÃO: ${signals.invoice.overdue_count} fatura(s) em atraso — R$ ${signals.invoice.overdue_amount.toFixed(2)}`
    : 'Pagamentos em dia';
  const oppLine     = signals.opportunities.length
    ? signals.opportunities.slice(0, 3).map((o) => `• [${o.priority}] ${o.title}`).join('\n')
    : 'Sem oportunidades ativas';
  const rulesLine   = signals.learningRules.length
    ? signals.learningRules.slice(0, 3).map((r) => `• ${r.text}`).join('\n')
    : '';

  const prompt = `Você é o Account Manager de IA da agência Edro. Analise os dados abaixo do cliente "${signals.client.name}" (${signals.client.segment}) e gere alertas proativos com ações recomendadas.

DADOS DO CLIENTE:
${healthLine}
${roiLine}
${actLine}
${invoiceLine}

Oportunidades estratégicas ativas:
${oppLine}

Padrões identificados pelo LearningEngine:
${rulesLine}

INSTRUÇÕES:
Gere entre 1 e 4 alertas priorizados. Cada alerta deve ter:
- alert_type: um de [churn_risk, upsell, expand_services, positive_momentum, payment_risk, engagement_drop, opportunity]
- priority: um de [urgent, high, medium, low]
- title: título curto e específico (máx 60 chars)
- body: contexto em 1-2 frases (máx 200 chars)
- recommended_action: ação concreta e específica para o account manager fazer HOJE (máx 120 chars)

Retorne APENAS um JSON válido:
[
  {
    "alert_type": "...",
    "priority": "...",
    "title": "...",
    "body": "...",
    "recommended_action": "..."
  }
]

Seja direto e acionável. Não repita alertas óbvios se os dados forem positivos.`;

  try {
    const res = await ClaudeService.generateCompletion({ prompt, maxTokens: 600, temperature: 0.3 });
    const json = res.text.match(/\[[\s\S]*\]/)?.[0] || '[]';
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((a: any) => a.alert_type && a.priority && a.title && a.recommended_action)
      .slice(0, 5);
  } catch {
    return [];
  }
}

// ── Main: compute + persist alerts for a client ────────────────────────────────
export async function computeClientAlerts(
  tenantId: string,
  clientId: string,
): Promise<AccountManagerAlert[]> {
  const signals = await collectSignals(tenantId, clientId);
  const alerts  = await generateAlerts(signals);

  if (!alerts.length) return [];

  // Expire previous active alerts for this client before inserting new ones
  await query(
    `UPDATE account_manager_alerts
     SET status = 'dismissed', dismissed_at = now()
     WHERE tenant_id = $1 AND client_id = $2 AND status = 'active'`,
    [tenantId, clientId],
  );

  const results: AccountManagerAlert[] = [];
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString(); // 7 days

  for (const alert of alerts) {
    const { rows: [row] } = await query<AccountManagerAlert>(
      `INSERT INTO account_manager_alerts (
         tenant_id, client_id, alert_type, priority, title, body, recommended_action,
         health_score, health_trend, roi_score, signals, expires_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        tenantId, clientId, alert.alert_type, alert.priority,
        alert.title, alert.body, alert.recommended_action,
        signals.health?.score ?? null, signals.health?.trend ?? null,
        signals.topRoi[0]?.score ?? null,
        JSON.stringify({
          activity: signals.activity,
          invoice:  signals.invoice,
          perf:     signals.performance,
          opportunities_count: signals.opportunities.length,
        }),
        expiresAt,
      ],
    );
    results.push(row);
  }

  return results;
}

// ── Read cached alerts for a client ────────────────────────────────────────────
export async function getClientAlerts(
  tenantId: string,
  clientId: string,
): Promise<AccountManagerAlert[]> {
  const { rows } = await query<AccountManagerAlert>(
    `SELECT id, alert_type, priority, title, body, recommended_action,
            health_score, health_trend, roi_score, signals, status, computed_at
     FROM account_manager_alerts
     WHERE tenant_id = $1 AND client_id = $2 AND status = 'active'
       AND (expires_at IS NULL OR expires_at > now())
     ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
              computed_at DESC
     LIMIT 10`,
    [tenantId, clientId],
  );
  return rows;
}

// ── Action / dismiss an alert ──────────────────────────────────────────────────
export async function updateAlertStatus(
  alertId: string,
  tenantId: string,
  action: 'actioned' | 'dismissed',
  userId?: string,
): Promise<void> {
  await query(
    `UPDATE account_manager_alerts
     SET status = $1,
         actioned_by = $3,
         actioned_at = CASE WHEN $1 = 'actioned' THEN now() ELSE NULL END,
         dismissed_at = CASE WHEN $1 = 'dismissed' THEN now() ELSE NULL END
     WHERE id = $2 AND tenant_id = $4`,
    [action, alertId, userId ?? null, tenantId],
  );
}
