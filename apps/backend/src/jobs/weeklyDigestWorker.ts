/**
 * Weekly Digest Worker
 *
 * Roda às segundas-feiras entre 08:00–09:00 BRT (11:00–12:00 UTC), 1×/semana.
 * Envia para todos os admin/account_manager do tenant um email com:
 *   - Resumo da semana da IA (briefings gerados, fadigas detectadas, oportunidades)
 *   - Clientes em risco (churn alerts ativos)
 *   - Concorrentes atualizados
 *   - Simulações rodadas + acurácia
 */

import { query } from '../db';
import { sendEmail } from '../services/emailService';

let lastRunWeek = '';

// ── HTML helpers ──────────────────────────────────────────────────────────────

const ROW = (label: string, value: string | number, color = '#111') =>
  `<tr><td style="padding:6px 12px;color:#666;font-size:13px;">${label}</td>
       <td style="padding:6px 12px;color:${color};font-weight:600;font-size:14px;">${value}</td></tr>`;

const SECTION = (title: string, icon: string, rows: string) =>
  `<div style="margin:24px 0;">
     <div style="font-size:15px;font-weight:700;color:#111;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #f0f0f0;">
       ${icon} ${title}
     </div>
     <table style="width:100%;border-collapse:collapse;">${rows}</table>
   </div>`;

const BRIEFING_ROW = (title: string, source: string, clientName: string, createdAt: string) => {
  const sourceLabel = source === 'fatigue_substitution' ? '⚡ Fadiga detectada' : '🎯 Oportunidade';
  const date = new Date(createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `<tr style="border-bottom:1px solid #f0f0f0;">
    <td style="padding:8px 12px;">
      <div style="font-size:13px;font-weight:600;color:#111;">${title}</div>
      <div style="font-size:12px;color:#666;margin-top:2px;">${clientName} · ${date}</div>
    </td>
    <td style="padding:8px 12px;font-size:11px;color:#888;white-space:nowrap;">${sourceLabel}</td>
  </tr>`;
};

function buildHtml(data: DigestData, webBase: string): string {
  const weekLabel = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });

  const briefingRows = data.auto_briefings.length > 0
    ? data.auto_briefings.map(b => BRIEFING_ROW(b.title, b.source, b.client_name ?? '—', b.created_at)).join('')
    : `<tr><td colspan="2" style="padding:12px;color:#aaa;font-size:13px;text-align:center;">Nenhum briefing gerado automaticamente esta semana.</td></tr>`;

  const churnRows = data.churn_alerts.length > 0
    ? data.churn_alerts.map(a => ROW(a.client_name, a.title, '#E85219')).join('')
    : ROW('Situação', '✅ Nenhum risco ativo', '#13DEB9');

  const opportunityRows = data.opportunities.length > 0
    ? data.opportunities.map(o => ROW(`${o.title.slice(0, 50)}…`, `${o.confidence}% conf.`, '#5D87FF')).join('')
    : ROW('Situação', 'Nenhuma oportunidade nova', '#aaa');

  const simRows = ROW('Simulações na semana', data.simulation_stats.simulations_this_week ?? 0)
    + ROW('Acurácia média histórica',
        data.simulation_stats.avg_accuracy_pct != null
          ? `${data.simulation_stats.avg_accuracy_pct}%`
          : 'Dados insuficientes');

  const competitorRows = ROW('Concorrentes monitorados', data.competitor_stats.total_profiles ?? 0)
    + ROW('Analisados esta semana', data.competitor_stats.analyzed_this_week ?? 0);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#5D87FF 0%,#A855F7 100%);padding:32px 32px 24px;">
      <div style="color:#fff;font-size:22px;font-weight:700;">Edro Intelligence</div>
      <div style="color:rgba(255,255,255,0.8);font-size:14px;margin-top:4px;">Resumo semanal · ${weekLabel}</div>
    </div>

    <div style="padding:24px 32px;">

      <!-- Summary pills -->
      <div style="display:flex;gap:12px;margin-bottom:8px;flex-wrap:wrap;">
        <div style="background:#f0f4ff;border-radius:8px;padding:12px 18px;flex:1;min-width:100px;">
          <div style="font-size:24px;font-weight:700;color:#5D87FF;">${data.auto_briefings.length}</div>
          <div style="font-size:12px;color:#888;margin-top:2px;">Briefings gerados</div>
        </div>
        <div style="background:#fff8e1;border-radius:8px;padding:12px 18px;flex:1;min-width:100px;">
          <div style="font-size:24px;font-weight:700;color:#F8A800;">${data.fatigue_count}</div>
          <div style="font-size:12px;color:#888;margin-top:2px;">Fadigas detectadas</div>
        </div>
        <div style="background:#f0fff8;border-radius:8px;padding:12px 18px;flex:1;min-width:100px;">
          <div style="font-size:24px;font-weight:700;color:#13DEB9;">${data.opportunities.length}</div>
          <div style="font-size:12px;color:#888;margin-top:2px;">Oportunidades</div>
        </div>
        <div style="background:#fdf4ff;border-radius:8px;padding:12px 18px;flex:1;min-width:100px;">
          <div style="font-size:24px;font-weight:700;color:#A855F7;">${data.churn_alerts.length}</div>
          <div style="font-size:12px;color:#888;margin-top:2px;">Riscos de churn</div>
        </div>
      </div>

      <!-- Briefings section -->
      ${SECTION('Briefings Gerados Automaticamente', '🤖', briefingRows)}

      <!-- Churn section -->
      ${SECTION('Clientes em Risco', '🚨', churnRows)}

      <!-- Opportunities -->
      ${SECTION('Oportunidades Detectadas', '🎯', opportunityRows)}

      <!-- Simulator stats -->
      ${SECTION('Simulador de Sucesso', '✨', simRows)}

      <!-- Competitors -->
      ${SECTION('Inteligência Competitiva', '🔍', competitorRows)}

    </div>

    <!-- CTA -->
    <div style="padding:24px 32px;background:#f9f9f9;text-align:center;border-top:1px solid #f0f0f0;">
      <a href="${webBase}/admin/intelligence"
         style="display:inline-block;background:#5D87FF;color:#fff;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;">
        Ver painel de inteligência
      </a>
      <div style="margin-top:16px;font-size:11px;color:#bbb;">
        Edro Intelligence · ${new Date().getFullYear()}
      </div>
    </div>

  </div>
</body>
</html>`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface DigestData {
  auto_briefings: { title: string; source: string; client_name: string | null; created_at: string }[];
  fatigue_count: number;
  opportunities: { title: string; confidence: number }[];
  churn_alerts: { client_name: string; title: string }[];
  simulation_stats: { simulations_this_week: number; avg_accuracy_pct: number | null };
  competitor_stats: { total_profiles: number; analyzed_this_week: number };
}

// ── Collect digest data per tenant ────────────────────────────────────────────

async function collectDigestData(tenantId: string): Promise<DigestData> {
  const [briefingsRes, oppRes, churnRes, simRes, compRes] = await Promise.all([
    query<any>(
      `SELECT b.title, b.source, cl.name AS client_name, b.created_at
       FROM edro_briefings b
       LEFT JOIN clients cl ON cl.id::text = b.main_client_id::text
       WHERE b.source IN ('auto_opportunity', 'fatigue_substitution')
         AND b.created_at >= NOW() - INTERVAL '7 days'
         AND (cl.tenant_id = $1 OR cl.id IS NULL)
       ORDER BY b.created_at DESC
       LIMIT 20`,
      [tenantId],
    ).catch(() => ({ rows: [] as any[] })),
    query<any>(
      `SELECT o.title, o.confidence
       FROM ai_opportunities o
       WHERE o.tenant_id = $1
         AND o.confidence >= 75
         AND o.created_at >= NOW() - INTERVAL '7 days'
       ORDER BY o.confidence DESC
       LIMIT 10`,
      [tenantId],
    ).catch(() => ({ rows: [] as any[] })),
    query<any>(
      `SELECT cl.name AS client_name, ama.title
       FROM account_manager_alerts ama
       JOIN clients cl ON cl.id = ama.client_id
       WHERE ama.tenant_id = $1
         AND ama.alert_type = 'churn_risk'
         AND ama.status = 'active'
       ORDER BY ama.computed_at DESC
       LIMIT 10`,
      [tenantId],
    ).catch(() => ({ rows: [] as any[] })),
    query<any>(
      `SELECT
         COUNT(DISTINCT CASE WHEN sr.created_at >= NOW() - INTERVAL '7 days' THEN sr.id END)::int AS simulations_this_week,
         AVG(so.accuracy_pct)::numeric(5,1) AS avg_accuracy_pct
       FROM simulation_results sr
       LEFT JOIN simulation_outcomes so ON so.simulation_result_id = sr.id
       WHERE sr.tenant_id = $1`,
      [tenantId],
    ).catch(() => ({ rows: [{}] as any[] })),
    query<any>(
      `SELECT
         COUNT(*)::int AS total_profiles,
         COUNT(CASE WHEN last_analyzed_at >= NOW() - INTERVAL '7 days' THEN 1 END)::int AS analyzed_this_week
       FROM competitor_profiles
       WHERE tenant_id = $1 AND is_active = true`,
      [tenantId],
    ).catch(() => ({ rows: [{}] as any[] })),
  ]);

  const fatigueCount = briefingsRes.rows.filter((b: any) => b.source === 'fatigue_substitution').length;

  return {
    auto_briefings:    briefingsRes.rows,
    fatigue_count:     fatigueCount,
    opportunities:     oppRes.rows,
    churn_alerts:      churnRes.rows,
    simulation_stats:  simRes.rows[0] ?? {},
    competitor_stats:  compRes.rows[0] ?? {},
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function runWeeklyDigestOnce(): Promise<void> {
  // Self-throttle: Mondays 08:00–09:00 BRT = 11:00–12:00 UTC
  const now = new Date();
  const weekKey = `${now.toISOString().slice(0, 10)}-${now.getUTCDay()}`;
  if (now.getUTCDay() !== 1) return;           // Monday only
  const utcHour = now.getUTCHours();
  if (utcHour < 11 || utcHour > 11) return;   // 11:00–12:00 UTC
  if (lastRunWeek === weekKey) return;

  lastRunWeek = weekKey;
  console.log('[weeklyDigest] Starting weekly digest...');

  const webBase = process.env.WEB_BASE_URL || 'https://app.edro.digital';

  // Get all tenants with at least one admin/AM
  const tenantsRes = await query<any>(
    `SELECT DISTINCT u.tenant_id,
            MIN(u.email) AS email,
            MIN(u.id)    AS user_id
     FROM users u
     WHERE u.role IN ('admin', 'account_manager')
       AND u.email IS NOT NULL
       AND u.email <> ''
     GROUP BY u.tenant_id`,
  );

  let sent = 0;
  for (const row of tenantsRes.rows) {
    try {
      const data = await collectDigestData(row.tenant_id);
      const html = buildHtml(data, webBase);

      await sendEmail({
        to: row.email,
        subject: `Edro Intelligence — Resumo da semana (${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })})`,
        html,
        text: `Resumo da semana:\n- ${data.auto_briefings.length} briefings gerados\n- ${data.fatigue_count} fadigas detectadas\n- ${data.opportunities.length} oportunidades\n- ${data.churn_alerts.length} riscos de churn\n\nAcesse: ${webBase}/admin/intelligence`,
      });

      sent++;
      console.log(`[weeklyDigest] Sent digest to ${row.email} (tenant=${row.tenant_id})`);
    } catch (err: any) {
      console.error(`[weeklyDigest] Error for tenant=${row.tenant_id}:`, err?.message);
    }
  }

  console.log(`[weeklyDigest] Done: ${sent} digests sent.`);
}
