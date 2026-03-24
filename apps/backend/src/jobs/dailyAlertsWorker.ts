/**
 * dailyAlertsWorker.ts
 *
 * Runs every minute but only executes:
 *   - Bottleneck Alerts: daily at 09:00 (± 4 min window)
 *   - Proof of Value:    monthly on day 1 at 09:00
 *
 * Integrated into jobsRunner.startJobsRunner()
 */

import { query } from '../db';
import { sendEmail } from '../services/emailService';
import { OpenAIService, type OpenAiMonitorContext } from '../services/ai/openaiService';
import { getFallbackProvider, type CopyProvider } from '../services/ai/copyOrchestrator';
import { GeminiService } from '../services/ai/geminiService';
import { ClaudeService } from '../services/ai/claudeService';
import { tavilySearch, isTavilyConfigured } from '../services/tavilyService';
import { logTavilyUsage } from '../services/ai/aiUsageLogger';

// ── State ────────────────────────────────────────────────────────────────────

let lastBottleneckRunDate = ''; // 'YYYY-MM-DD'
let lastPovRunMonth = '';       // 'YYYY-MM'

// ── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function nowHour() {
  return new Date().getHours();
}

function thisMonthStr() {
  return new Date().toISOString().slice(0, 7);
}

function isDayOne() {
  return new Date().getDate() === 1;
}

async function runAi(
  preferred: CopyProvider,
  prompt: string,
  maxTokens = 600,
  monitor?: OpenAiMonitorContext,
): Promise<string> {
  const provider = getFallbackProvider(preferred);
  const params = { prompt, temperature: 0.4, maxTokens, monitor };
  switch (provider) {
    case 'gemini':  return (await GeminiService.generateCompletion(params)).text;
    case 'openai':  return (await OpenAIService.generateCompletion(params)).text;
    case 'claude':  return (await ClaudeService.generateCompletion(params)).text;
    default: return '';
  }
}

// ── Email templates ──────────────────────────────────────────────────────────

function bottleneckEmailHtml(params: {
  clientName: string;
  alerts: { title: string; stage: string; hours: number; severity: string }[];
  panelUrl: string;
}): string {
  const rows = params.alerts.map((a) => {
    const color = a.severity === 'critical' ? '#FA896B' : a.severity === 'high' ? '#ff6600' : '#FFAE1F';
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${a.title}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${a.stage}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center">
        <span style="background:${color};color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold">${a.hours}h</span>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center">
        <span style="color:${color};font-weight:bold;text-transform:uppercase;font-size:11px">${a.severity}</span>
      </td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f9fa;margin:0;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#ff6600,#e65c00);padding:28px 32px">
      <div style="color:#fff;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px">Edro Studio</div>
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">⚠️ Alerta de Gargalos</h1>
      <p style="color:rgba(255,255,255,.85);margin:6px 0 0;font-size:14px">${params.clientName} · ${new Date().toLocaleDateString('pt-BR')}</p>
    </div>
    <div style="padding:28px 32px">
      <p style="color:#374151;font-size:15px;margin:0 0 20px">
        Os seguintes briefings estão parados há mais de 24h e precisam de atenção:
      </p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600">Briefing</th>
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600">Etapa</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;color:#6b7280;font-weight:600">Tempo</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;color:#6b7280;font-weight:600">Nível</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin:24px 0 0;text-align:center">
        <a href="${params.panelUrl}" style="background:#ff6600;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block">
          Ver no Painel →
        </a>
      </div>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #f0f0f0;text-align:center">
      <p style="margin:0;font-size:12px;color:#9ca3af">Edro Studio · Automação de Alertas · <a href="${params.panelUrl}" style="color:#ff6600">edro.studio</a></p>
    </div>
  </div>
</body>
</html>`;
}

function povEmailHtml(params: {
  clientName: string;
  narrative: string;
  stats: { briefings: number; copies: number; hours: number; market_value: number };
  panelUrl: string;
  month: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f9fa;margin:0;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:28px 32px">
      <div style="color:#ff6600;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px">Edro Studio</div>
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">📊 Relatório de Resultados</h1>
      <p style="color:rgba(255,255,255,.7);margin:6px 0 0;font-size:14px">${params.clientName} · ${params.month}</p>
    </div>
    <div style="padding:28px 32px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
        <div style="background:#f9fafb;border-radius:8px;padding:16px;text-align:center">
          <div style="font-size:28px;font-weight:800;color:#0f172a">${params.stats.briefings}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px">Briefings</div>
        </div>
        <div style="background:#f9fafb;border-radius:8px;padding:16px;text-align:center">
          <div style="font-size:28px;font-weight:800;color:#0f172a">${params.stats.copies}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px">Peças Criadas</div>
        </div>
        <div style="background:#f9fafb;border-radius:8px;padding:16px;text-align:center">
          <div style="font-size:28px;font-weight:800;color:#ff6600">${params.stats.hours}h</div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px">Horas Entregues</div>
        </div>
        <div style="background:rgba(19,222,185,.08);border-radius:8px;padding:16px;text-align:center">
          <div style="font-size:20px;font-weight:800;color:#13DEB9">R$ ${params.stats.market_value.toLocaleString('pt-BR')}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px">Valor de Mercado</div>
        </div>
      </div>
      <div style="background:#f9fafb;border-radius:8px;padding:20px;margin-bottom:24px">
        <h3 style="margin:0 0 12px;font-size:15px;color:#0f172a">Resumo do Mês</h3>
        <div style="font-size:14px;color:#374151;line-height:1.7;white-space:pre-wrap">${params.narrative}</div>
      </div>
      <div style="text-align:center">
        <a href="${params.panelUrl}" style="background:#ff6600;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block">
          Ver Relatório Completo →
        </a>
      </div>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #f0f0f0;text-align:center">
      <p style="margin:0;font-size:12px;color:#9ca3af">Edro Studio · Relatório Automático Mensal</p>
    </div>
  </div>
</body>
</html>`;
}

// ── Job: Bottleneck Alerts ───────────────────────────────────────────────────

async function runBottleneckAlertsJob() {
  console.log('[dailyAlerts] running bottleneck alerts job');

  const panelBaseUrl = process.env.APP_URL || process.env.WEB_URL || 'https://edro-production.up.railway.app';

  // Get all tenants with their admin emails
  const { rows: tenants } = await query<{ tenant_id: string; admin_email: string; admin_name: string }>(
    `SELECT tu.tenant_id, u.email AS admin_email, u.name AS admin_name
     FROM tenant_users tu
     JOIN edro_users u ON u.id = tu.user_id
     WHERE tu.role = 'admin'
     GROUP BY tu.tenant_id, u.email, u.name`
  );

  for (const tenant of tenants) {
    // Get all edro clients for this tenant
    const { rows: clients } = await query<{ id: string; name: string }>(
      `SELECT ec.id, ec.name
       FROM edro_clients ec
       WHERE EXISTS (
         SELECT 1 FROM clients c
         WHERE c.tenant_id = $1 AND LOWER(c.name) = LOWER(ec.name)
       )`,
      [tenant.tenant_id]
    );

    for (const client of clients) {
      const { rows: stuck } = await query<{
        title: string; current_stage: string; hours_stuck: number;
      }>(
        `SELECT b.title, s.stage AS current_stage,
           EXTRACT(EPOCH FROM (NOW() - s.updated_at)) / 3600 AS hours_stuck
         FROM edro_briefings b
         JOIN edro_briefing_stages s ON s.briefing_id = b.id AND s.status NOT IN ('done', 'skipped')
         WHERE b.client_id = $1
           AND b.status NOT IN ('done', 'cancelled')
           AND EXTRACT(EPOCH FROM (NOW() - s.updated_at)) / 3600 > 24
         ORDER BY hours_stuck DESC`,
        [client.id]
      );

      if (stuck.length === 0) continue;

      const criticalOrHigh = stuck.filter((s) => s.hours_stuck > 48);
      if (criticalOrHigh.length === 0) continue; // only alert if >48h

      const alerts = stuck.map((s) => ({
        title: s.title,
        stage: s.current_stage,
        hours: Math.round(s.hours_stuck),
        severity: s.hours_stuck > 72 ? 'critical' : s.hours_stuck > 48 ? 'high' : 'warning',
      }));

      const panelUrl = `${panelBaseUrl}/clients/${client.id}/analytics`;

      await sendEmail({
        to: tenant.admin_email,
        subject: `⚠️ ${criticalOrHigh.length} briefing(s) travado(s) em ${client.name}`,
        html: bottleneckEmailHtml({ clientName: client.name, alerts, panelUrl }),
        tenantId: tenant.tenant_id,
      });

      console.log(`[dailyAlerts] sent bottleneck alert for ${client.name} to ${tenant.admin_email} (${alerts.length} alerts)`);
    }
  }
}

// ── Job: Monthly Proof of Value ──────────────────────────────────────────────

async function runMonthlyPovJob() {
  console.log('[dailyAlerts] running monthly proof of value job');

  const panelBaseUrl = process.env.APP_URL || process.env.WEB_URL || 'https://edro-production.up.railway.app';
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const periodFrom = prevMonth.toISOString().slice(0, 10);
  const periodTo = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
  const monthLabel = prevMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Get all tenants with admin email
  const { rows: tenants } = await query<{ tenant_id: string; admin_email: string }>(
    `SELECT tu.tenant_id, u.email AS admin_email
     FROM tenant_users tu
     JOIN edro_users u ON u.id = tu.user_id
     WHERE tu.role = 'admin'
     GROUP BY tu.tenant_id, u.email`
  );

  for (const tenant of tenants) {
    const { rows: clients } = await query<{ id: string; name: string; contact_email: string | null }>(
      `SELECT ec.id, ec.name, c.contact_email
       FROM edro_clients ec
       LEFT JOIN clients c ON LOWER(c.name) = LOWER(ec.name) AND c.tenant_id = $1
       WHERE EXISTS (SELECT 1 FROM clients cc WHERE cc.tenant_id = $1 AND LOWER(cc.name) = LOWER(ec.name))`,
      [tenant.tenant_id]
    );

    for (const client of clients) {
      // Collect metrics
      const [briefingsRes, copiesRes] = await Promise.all([
        query<{ total: string; completed: string }>(
          `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'done') AS completed
           FROM edro_briefings WHERE client_id = $1 AND created_at BETWEEN $2 AND $3`,
          [client.id, periodFrom, periodTo]
        ),
        query<{ total: string }>(
          `SELECT COUNT(cv.*) AS total
           FROM edro_copy_versions cv
           JOIN edro_briefings b ON b.id = cv.briefing_id
           WHERE b.client_id = $1 AND cv.created_at BETWEEN $2 AND $3`,
          [client.id, periodFrom, periodTo]
        ),
      ]);

      const totalBriefings = parseInt(briefingsRes.rows[0]?.total || '0');
      const completedBriefings = parseInt(briefingsRes.rows[0]?.completed || '0');
      const totalCopies = parseInt(copiesRes.rows[0]?.total || '0');

      if (totalBriefings === 0 && totalCopies === 0) continue; // nothing to report

      const estimatedHours = totalCopies * 2.5 + totalBriefings;
      const marketValue = Math.round(estimatedHours * 150);
      const completionRate = totalBriefings > 0 ? Math.round(completedBriefings / totalBriefings * 100) : 0;

      // Contexto setorial via Tavily (não-bloqueante)
      let sectorContext = '';
      if (isTavilyConfigured()) {
        try {
          const secRow = (await query<{ segment_primary: string }>(
            `SELECT segment_primary FROM clients WHERE LOWER(name)=LOWER($1) AND tenant_id=$2 LIMIT 1`,
            [client.name, tenant.tenant_id]
          )).rows[0];
          if (secRow?.segment_primary) {
            const t0 = Date.now();
            const tRes = await tavilySearch(`${secRow.segment_primary} marketing digital resultados ${monthLabel}`, { maxResults: 2, searchDepth: 'basic' });
            logTavilyUsage({ tenant_id: tenant.tenant_id, operation: 'search-basic', unit_count: 1, feature: 'daily_alerts_pov', duration_ms: Date.now() - t0 });
            const top = tRes.results[0];
            if (top?.snippet) sectorContext = ` Contexto setorial: ${top.snippet.slice(0, 200)}`;
          }
        } catch { /* non-blocking */ }
      }

      // Generate narrative with AI
      let narrative = `No mês de ${monthLabel}, entregamos ${totalBriefings} briefings (${completionRate}% de conclusão) e produzimos ${totalCopies} peças criativas, representando aproximadamente ${Math.round(estimatedHours)}h de trabalho.`;
      try {
        const aiNarrative = await runAi('openai',
          `Escreva 3 frases executivas sobre os resultados da agência Edro Studio para ${client.name} em ${monthLabel}: ${totalBriefings} briefings (${completionRate}% conclusão), ${totalCopies} peças produzidas, ~${Math.round(estimatedHours)}h de trabalho.${sectorContext} Tom profissional e orientado a valor. Máximo 120 palavras.`,
          200,
          { tenantId: tenant.tenant_id, feature: 'daily_alerts_pov', metadata: { client_id: client.id } },
        );
        if (aiNarrative.length > 20) narrative = aiNarrative;
      } catch { /* use default narrative */ }

      const recipientEmail = client.contact_email || tenant.admin_email;
      const panelUrl = `${panelBaseUrl}/clients/${client.id}/reports`;

      await sendEmail({
        to: recipientEmail,
        subject: `📊 Resultados de ${monthLabel} — ${client.name}`,
        html: povEmailHtml({
          clientName: client.name,
          narrative,
          stats: { briefings: totalBriefings, copies: totalCopies, hours: Math.round(estimatedHours), market_value: marketValue },
          panelUrl,
          month: monthLabel,
        }),
        tenantId: tenant.tenant_id,
      });

      console.log(`[dailyAlerts] sent PoV for ${client.name} to ${recipientEmail}`);
    }
  }
}

// ── Main tick (called every minute) ─────────────────────────────────────────

export async function runDailyAlertsWorkerOnce() {
  const hour = nowHour();
  const today = todayStr();
  const thisMonth = thisMonthStr();

  // Bottleneck alerts: daily at 09:00–09:09
  if (hour === 9 && lastBottleneckRunDate !== today) {
    lastBottleneckRunDate = today;
    await runBottleneckAlertsJob().catch((err) =>
      console.error('[dailyAlerts] bottleneck job error:', err?.message || err)
    );
  }

  // Monthly Proof of Value: day 1 at 09:00–09:09
  if (hour === 9 && isDayOne() && lastPovRunMonth !== thisMonth) {
    lastPovRunMonth = thisMonth;
    await runMonthlyPovJob().catch((err) =>
      console.error('[dailyAlerts] PoV job error:', err?.message || err)
    );
  }
}
