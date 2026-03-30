/**
 * systemHealth.ts
 *
 * GET /admin/system-health
 *
 * Agrega todos os sistemas de alerta em uma resposta única:
 *  - Gaps de configuração por cliente (sem connector, sem keywords, etc.)
 *  - Conectores com erro (last_sync_ok = false)
 *  - Alertas Jarvis abertos (por prioridade)
 *  - Sinais operacionais abertos
 *  - Quedas de performance recentes
 *
 * Cada item inclui `action_url` apontando para o local exato do fix.
 */

import { FastifyInstance } from 'fastify';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { query } from '../db';

const guards = [authGuard, tenantGuard(), requirePerm('portfolio:read')];

// ── Action URL builders ───────────────────────────────────────────────────────

function clientUrl(id: string, tab = '', sub = '') {
  const base = `/clients/${id}${tab}`;
  return sub ? `${base}?sub=${sub}` : base;
}

const GAP_META: Record<string, { label: string; priority: string; tab: string; sub?: string }> = {
  no_connector_meta:      { label: 'Sem conector Instagram / Meta',      priority: 'high',   tab: '/identidade', sub: 'integracoes' },
  no_connector_reportei:  { label: 'Sem conector Reportei',              priority: 'medium', tab: '/identidade', sub: 'integracoes' },
  no_keywords:            { label: 'Sem keywords de monitoramento',      priority: 'medium', tab: '/social-listening', sub: 'keywords' },
  connector_error_meta:   { label: 'Erro no conector Meta',              priority: 'urgent', tab: '/identidade', sub: 'integracoes' },
  connector_error_reportei: { label: 'Erro no conector Reportei',        priority: 'high',   tab: '/identidade', sub: 'integracoes' },
  connector_stale_meta:   { label: 'Conector Meta sem sync há +72h',     priority: 'high',   tab: '/identidade', sub: 'integracoes' },
};

const ALERT_URLS: Record<string, string> = {
  card_stalled:         '/operacao',
  job_no_briefing:      '/operacao',
  whatsapp_no_reply:    '/operacao?sub=whatsapp',
  meeting_no_card:      '/operacao?sub=reunioes',
  contract_expiring:    '/identidade',
  market_opportunity:   '/radar',
};

// ── Route ─────────────────────────────────────────────────────────────────────

export default async function systemHealthRoutes(app: FastifyInstance) {
  app.get('/admin/system-health', { preHandler: guards }, async (req: any, reply) => {
    const tenantId: string = req.user.tenant_id;

    const settled = await Promise.allSettled([

      // 1. Gaps de configuração por cliente ativo
      query<{
        client_id: string; client_name: string;
        has_meta: boolean; has_reportei: boolean; has_keywords: boolean;
      }>(
        `SELECT
           c.id             AS client_id,
           c.name           AS client_name,
           EXISTS(
             SELECT 1 FROM connectors cn
             WHERE cn.client_id = c.id::text AND cn.provider = 'meta'
           ) AS has_meta,
           EXISTS(
             SELECT 1 FROM connectors cn
             WHERE cn.client_id = c.id::text AND cn.provider = 'reportei'
           ) AS has_reportei,
           EXISTS(
             SELECT 1 FROM social_listening_keywords sk
             WHERE sk.client_id = c.id AND sk.is_active = true
           ) AS has_keywords
         FROM clients c
         WHERE c.tenant_id = $1 AND c.status = 'active'
         ORDER BY c.name`,
        [tenantId]
      ),

      // 2. Conectores com erro
      query<{
        client_id: string; client_name: string;
        provider: string; last_error: string | null; last_sync_at: string | null;
      }>(
        `SELECT
           cn.client_id,
           c.name           AS client_name,
           cn.provider,
           cn.last_error,
           cn.last_sync_at::text
         FROM connectors cn
         JOIN clients c ON c.id::text = cn.client_id
         WHERE cn.tenant_id = $1
           AND c.status = 'active'
           AND (
             cn.last_sync_ok = false
             OR (
               cn.last_sync_at IS NOT NULL
               AND cn.last_sync_at < NOW() - INTERVAL '72 hours'
               AND cn.provider IN ('meta', 'reportei')
             )
           )
         ORDER BY cn.last_error_at DESC NULLS LAST`,
        [tenantId]
      ),

      // 3. Alertas Jarvis abertos
      query<{
        id: string; client_id: string | null; client_name: string | null;
        alert_type: string; title: string; priority: string; created_at: string;
        source_refs: any;
      }>(
        `SELECT
           ja.id, ja.client_id, c.name AS client_name,
           ja.alert_type, ja.title, ja.priority,
           ja.created_at::text, ja.source_refs
         FROM jarvis_alerts ja
         LEFT JOIN clients c ON c.id::text = ja.client_id
         WHERE ja.tenant_id = $1 AND ja.status = 'open'
         ORDER BY
           CASE ja.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2
                            WHEN 'medium' THEN 3 ELSE 4 END,
           ja.created_at DESC
         LIMIT 50`,
        [tenantId]
      ),

      // 4. Sinais operacionais abertos
      query<{
        id: string; client_id: string | null; client_name: string | null;
        domain: string; signal_type: string; title: string;
        severity: number; summary: string | null; actions: any; created_at: string;
      }>(
        `SELECT
           os.id, os.client_id, c.name AS client_name,
           os.domain, os.signal_type, os.title,
           os.severity, os.summary, os.actions, os.created_at::text
         FROM operational_signals os
         LEFT JOIN clients c ON c.id::text = os.client_id
         WHERE os.tenant_id = $1 AND os.resolved_at IS NULL
         ORDER BY os.severity DESC, os.created_at DESC
         LIMIT 30`,
        [tenantId]
      ),

      // 5. Quedas de performance (últimos 7 dias)
      query<{
        id: string; client_id: string | null; client_name: string | null;
        type: string; title: string; body: string | null; severity: string; created_at: string;
      }>(
        `SELECT
           nl.id, nl.client_id::text, c.name AS client_name,
           nl.type, nl.title, nl.body, nl.severity, nl.created_at::text
         FROM notification_logs nl
         LEFT JOIN clients c ON c.id = nl.client_id::uuid
         WHERE nl.tenant_id = $1
           AND nl.type IN ('perf_drop', 'perf_spike', 'client_risk')
           AND nl.created_at > NOW() - INTERVAL '7 days'
         ORDER BY nl.created_at DESC
         LIMIT 20`,
        [tenantId]
      ),

      // 6. Clientes em saúde crítica (score < 40)
      query<{
        client_id: string; client_name: string; score: number; trend: string;
      }>(
        `SELECT
           chs.client_id, c.name AS client_name, chs.score, chs.trend
         FROM client_health_scores chs
         JOIN clients c ON c.id = chs.client_id::uuid
         WHERE c.tenant_id = $1 AND chs.score < 40
           AND chs.period_date = (
             SELECT MAX(period_date) FROM client_health_scores
             WHERE client_id = chs.client_id
           )
         ORDER BY chs.score ASC`,
        [tenantId]
      ),
    ]);

    // Unwrap settled results — any failed query returns empty rows
    const empty = { rows: [] as any[] };
    const [
      gapRows,
      connectorErrors,
      jarvisAlerts,
      opSignals,
      perfAlerts,
      healthCritical,
    ] = settled.map((r) => r.status === 'fulfilled' ? r.value : empty) as [
      typeof empty, typeof empty, typeof empty, typeof empty, typeof empty, typeof empty
    ];

    // ── Build client_gaps ──────────────────────────────────────────────────────

    const clientGaps: Array<{
      client_id: string; client_name: string;
      gaps: Array<{ type: string; label: string; priority: string; action_url: string }>;
    }> = [];

    for (const row of gapRows.rows) {
      const gaps: Array<{ type: string; label: string; priority: string; action_url: string }> = [];

      if (!row.has_meta) {
        const m = GAP_META.no_connector_meta;
        gaps.push({ type: 'no_connector_meta', label: m.label, priority: m.priority,
          action_url: clientUrl(row.client_id, m.tab, m.sub) });
      }
      if (!row.has_reportei) {
        const m = GAP_META.no_connector_reportei;
        gaps.push({ type: 'no_connector_reportei', label: m.label, priority: m.priority,
          action_url: clientUrl(row.client_id, m.tab, m.sub) });
      }
      if (!row.has_keywords) {
        const m = GAP_META.no_keywords;
        gaps.push({ type: 'no_keywords', label: m.label, priority: m.priority,
          action_url: clientUrl(row.client_id, m.tab, m.sub) });
      }

      if (gaps.length > 0) {
        clientGaps.push({ client_id: row.client_id, client_name: row.client_name, gaps });
      }
    }

    // ── Connector errors with action_url ───────────────────────────────────────

    const connectors = connectorErrors.rows.map((r) => {
      const isStale = !r.last_error && r.last_sync_at;
      const gapKey = isStale
        ? `connector_stale_${r.provider}`
        : `connector_error_${r.provider}`;
      const meta = GAP_META[gapKey] ?? { label: `Erro no conector ${r.provider}`, priority: 'high', tab: '/identidade', sub: 'integracoes' };
      return {
        ...r,
        label: meta.label,
        priority: meta.priority,
        action_url: clientUrl(r.client_id, meta.tab, meta.sub),
      };
    });

    // ── Jarvis alerts with action_url ─────────────────────────────────────────

    const alerts = jarvisAlerts.rows.map((a) => ({
      ...a,
      action_url: a.client_id
        ? clientUrl(a.client_id, ALERT_URLS[a.alert_type] ?? '')
        : null,
    }));

    // ── Summary counts ─────────────────────────────────────────────────────────

    const allItems = [
      ...connectors.map(c => c.priority),
      ...alerts.map(a => a.priority),
      ...opSignals.rows.map(s => s.severity >= 80 ? 'urgent' : s.severity >= 60 ? 'high' : 'medium'),
      ...healthCritical.rows.map(() => 'high'),
    ];

    const summary = {
      urgent: allItems.filter(p => p === 'urgent').length,
      high:   allItems.filter(p => p === 'high').length,
      medium: allItems.filter(p => p === 'medium').length,
      total:  allItems.length,
      client_gap_count: clientGaps.length,
    };

    return reply.send({
      summary,
      client_gaps: clientGaps,
      connector_errors: connectors,
      jarvis_alerts: alerts,
      op_signals: opSignals.rows.map(s => ({
        ...s,
        action_url: s.client_id ? clientUrl(s.client_id, '') : null,
      })),
      perf_alerts: perfAlerts.rows.map(p => ({
        ...p,
        action_url: p.client_id ? clientUrl(p.client_id, '/metricas') : null,
      })),
      health_critical: healthCritical.rows.map(h => ({
        ...h,
        action_url: clientUrl(h.client_id),
      })),
    });
  });
}
