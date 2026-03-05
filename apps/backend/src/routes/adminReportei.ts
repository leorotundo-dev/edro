import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { ReporteiClient } from '../providers/reportei/reporteiClient';
import { getReporteiConnector } from '../providers/reportei/reporteiConnector';
import { query } from '../db';
import { syncAllClientsLearningRules } from '../services/reporteiLearningSync';
import { runPerformanceAlertWorkerOnce } from '../jobs/performanceAlertWorker';

// ── Name normalization for auto-matching ──────────────────────────────────────
function normName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]/g, ''); // keep only alphanumeric
}

function nameScore(edroName: string, reporteiName: string): number {
  const a = normName(edroName);
  const b = normName(reporteiName);
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 80;
  // partial: at least 4 chars in common from start
  const minLen = Math.min(a.length, b.length);
  let common = 0;
  for (let i = 0; i < minLen; i++) {
    if (a[i] === b[i]) common++;
    else break;
  }
  return common >= 4 ? 50 + common : 0;
}

export default async function adminReporteiRoutes(app: FastifyInstance) {

  // ── GET /admin/reportei/explore ───────────────────────────────────────────
  // Verify token + list all projects and integrations
  app.get(
    '/admin/reportei/explore',
    { preHandler: [authGuard, tenantGuard()] },
    async (request: any) => {
      const { token: queryToken } = z
        .object({ token: z.string().optional() })
        .parse(request.query);

      const token = queryToken || process.env.REPORTEI_TOKEN || '';
      if (!token) return { error: 'No token. Set REPORTEI_TOKEN env var.' };

      const client = new ReporteiClient();
      const overrides = { token };
      const result: Record<string, any> = {};

      try { result.company = await client.getCompanySettings(overrides); }
      catch (e: any) { result.company = { error: e.message }; }

      let projects: any[] = [];
      try {
        const res = await client.getProjects({ per_page: 100 }, overrides);
        projects = res?.data ?? [];
        result.projects = { total: res?.meta?.total ?? projects.length, data: projects };
      } catch (e: any) { result.projects = { error: e.message }; }

      try {
        const res = await client.getIntegrations({ per_page: 100 }, overrides);
        result.all_integrations = (res?.data ?? []).map((i: any) => ({
          id: i.id,
          name: i.name,
          slug: i.slug,
          project_id: i.project_id,
          project_name: projects.find((p: any) => p.id === i.project_id)?.name,
        }));
      } catch (e: any) { result.all_integrations = { error: e.message }; }

      return result;
    }
  );

  // ── GET /admin/reportei/status ────────────────────────────────────────────
  // Show all Edro clients with their current Reportei connector status
  app.get(
    '/admin/reportei/status',
    { preHandler: [authGuard, tenantGuard()] },
    async (request: any) => {
      const tenantId = (request.user as any).tenant_id;
      const token = process.env.REPORTEI_TOKEN || '';

      const { rows: clients } = await query<any>(
        `SELECT id, name FROM clients WHERE tenant_id=$1 ORDER BY name ASC`,
        [tenantId]
      );

      const { rows: connectors } = await query<any>(
        `SELECT client_id, payload, last_sync_ok, last_sync_at, last_error
         FROM connectors
         WHERE tenant_id=$1 AND provider='reportei'`,
        [tenantId]
      ).catch(() => ({ rows: [] }));

      const connMap = new Map(connectors.map((c: any) => [c.client_id, c]));

      // Fetch Reportei projects + integrations for reference
      let reporteiProjects: any[] = [];
      let reporteiIntegrations: any[] = [];
      if (token) {
        const client = new ReporteiClient();
        try {
          const [pRes, iRes] = await Promise.all([
            client.getProjects({ per_page: 100 }, { token }),
            client.getIntegrations({ per_page: 100 }, { token }),
          ]);
          reporteiProjects = pRes?.data ?? [];
          reporteiIntegrations = iRes?.data ?? [];
        } catch { /* ignore */ }
      }

      const rows = clients.map((c: any) => {
        const conn = connMap.get(c.id);
        const integrationId = conn?.payload?.integration_id ?? conn?.payload?.reportei_account_id ?? null;
        const integration = integrationId
          ? reporteiIntegrations.find((i: any) => i.id === Number(integrationId))
          : null;
        const project = integration
          ? reporteiProjects.find((p: any) => p.id === integration.project_id)
          : null;

        // Build per-platform summary from stored platforms map
        const platformsMap: Record<string, number> = conn?.payload?.platforms ?? {};
        const platformsSummary: Record<string, { integration_id: number; name: string | null; slug: string }> = {};
        for (const [slug, id] of Object.entries(platformsMap)) {
          const found = reporteiIntegrations.find((i: any) => i.id === Number(id));
          platformsSummary[slug] = { integration_id: Number(id), name: found?.name ?? null, slug };
        }

        return {
          client_id: c.id,
          client_name: c.name,
          linked: !!integrationId,
          integration_id: integrationId ?? null,
          integration_name: integration?.name ?? null,
          integration_slug: integration?.slug ?? null,
          project_id: integration?.project_id ?? null,
          project_name: project?.name ?? null,
          platforms: platformsSummary,
          last_sync_ok: conn?.last_sync_ok ?? null,
          last_error: conn?.last_error ?? null,
        };
      });

      return {
        clients: rows,
        reportei_projects: reporteiProjects.map((p: any) => ({ id: p.id, name: p.name })),
        reportei_integrations: reporteiIntegrations.map((i: any) => ({
          id: i.id,
          name: i.name,
          slug: i.slug,
          project_id: i.project_id,
          project_name: reporteiProjects.find((p: any) => p.id === i.project_id)?.name,
        })),
      };
    }
  );

  // ── POST /admin/reportei/auto-link ────────────────────────────────────────
  // Auto-match Edro clients to Reportei integrations by name similarity.
  // Matches ALL known platform slugs and builds a platforms map per client.
  app.post(
    '/admin/reportei/auto-link',
    { preHandler: [authGuard, tenantGuard()] },
    async (request: any) => {
      const tenantId = (request.user as any).tenant_id;
      const { dry_run } = z
        .object({ dry_run: z.boolean().default(false) })
        .parse(request.body ?? {});

      const token = process.env.REPORTEI_TOKEN || '';
      if (!token) return { error: 'REPORTEI_TOKEN not configured' };

      const KNOWN_SLUGS = ['instagram_business', 'linkedin', 'facebook_ads', 'google_analytics_4', 'google_adwords'];

      const { rows: edroClients } = await query<any>(
        `SELECT id, name FROM clients WHERE tenant_id=$1 ORDER BY name ASC`,
        [tenantId]
      );

      const rc = new ReporteiClient();
      const overrides = { token };

      const iRes = await rc.getIntegrations({ per_page: 100 }, overrides);
      const integrations: any[] = iRes?.data ?? [];

      // Group integrations by slug for fast lookup
      const bySlug: Record<string, any[]> = {};
      for (const i of integrations) {
        if (!bySlug[i.slug]) bySlug[i.slug] = [];
        bySlug[i.slug].push(i);
      }

      const results: Array<{
        client_id: string;
        client_name: string;
        platforms: Record<string, { id: number; name: string; score: number }>;
        action: 'linked' | 'skipped' | 'no_match';
      }> = [];

      for (const edroClient of edroClients) {
        const platforms: Record<string, { id: number; name: string; score: number }> = {};

        for (const slug of KNOWN_SLUGS) {
          const candidates = bySlug[slug] ?? [];
          let bestScore = 0;
          let bestIntegration: any = null;
          for (const integration of candidates) {
            const score = nameScore(edroClient.name, integration.name);
            if (score > bestScore) {
              bestScore = score;
              bestIntegration = integration;
            }
          }
          if (bestIntegration && bestScore >= 50) {
            platforms[slug] = { id: bestIntegration.id, name: bestIntegration.name, score: bestScore };
          }
        }

        const hasAnyMatch = Object.keys(platforms).length > 0;
        if (!hasAnyMatch) {
          results.push({ client_id: edroClient.id, client_name: edroClient.name, platforms: {}, action: 'no_match' });
          continue;
        }

        if (!dry_run) {
          // Build platforms map (slug → id) and set primary integration_id = Instagram or first match
          const platformsMap: Record<string, number> = {};
          for (const [slug, info] of Object.entries(platforms)) {
            platformsMap[slug] = info.id;
          }
          const primaryId =
            platformsMap['instagram_business'] ??
            Object.values(platformsMap)[0];

          const patch = JSON.stringify({ integration_id: primaryId, platforms: platformsMap });

          await query(
            `INSERT INTO connectors (tenant_id, client_id, provider, payload)
             VALUES ($1,$2,'reportei',$3::jsonb)
             ON CONFLICT (tenant_id, client_id, provider)
             DO UPDATE SET payload = connectors.payload || $3::jsonb, updated_at=now()`,
            [tenantId, edroClient.id, patch]
          ).catch(() =>
            query(
              `UPDATE connectors SET payload = payload || $3::jsonb, updated_at=now()
               WHERE tenant_id=$1 AND client_id=$2 AND provider='reportei'`,
              [tenantId, edroClient.id, patch]
            )
          );
        }

        results.push({
          client_id: edroClient.id,
          client_name: edroClient.name,
          platforms,
          action: dry_run ? 'skipped' : 'linked',
        });
      }

      return {
        dry_run,
        total: results.length,
        linked: results.filter(r => r.action === 'linked').length,
        no_match: results.filter(r => r.action === 'no_match').length,
        results,
      };
    }
  );

  // ── POST /admin/reportei/link-client ──────────────────────────────────────
  // Manually link a specific client to a specific integration
  app.post(
    '/admin/reportei/link-client',
    { preHandler: [authGuard, tenantGuard()] },
    async (request: any) => {
      const tenantId = (request.user as any).tenant_id;
      const { client_id, integration_id } = z
        .object({ client_id: z.string(), integration_id: z.number() })
        .parse(request.body);

      await query(
        `INSERT INTO connectors (tenant_id, client_id, provider, payload)
         VALUES ($1,$2,'reportei',$3::jsonb)
         ON CONFLICT (tenant_id, client_id, provider)
         DO UPDATE SET payload = connectors.payload || $3::jsonb, updated_at=now()`,
        [tenantId, client_id, JSON.stringify({ integration_id })]
      );
      return { ok: true };
    }
  );

  // ── GET /admin/reportei/metrics ───────────────────────────────────────────
  app.get(
    '/admin/reportei/metrics',
    { preHandler: [authGuard, tenantGuard()] },
    async (request: any) => {
      const { slug } = z.object({ slug: z.string().min(1) }).parse(request.query);
      const token = process.env.REPORTEI_TOKEN || '';
      if (!token) return { error: 'No token.' };
      try {
        return await new ReporteiClient().getAvailableMetrics(slug, { token });
      } catch (e: any) { return { error: e.message }; }
    }
  );

  // ── GET /admin/reportei/test-client/:clientId ─────────────────────────────
  app.get(
    '/admin/reportei/test-client/:clientId',
    { preHandler: [authGuard, tenantGuard()] },
    async (request: any) => {
      const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
      const tenantId = (request.user as any).tenant_id;
      const connector = await getReporteiConnector(tenantId, clientId);

      if (!connector) return { error: 'No Reportei connector for this client.' };
      const rawToken = connector.token || process.env.REPORTEI_TOKEN || '';
      if (!rawToken) return { error: 'No token (REPORTEI_TOKEN not set).' };
      if (!connector.integrationId) return { error: 'integration_id missing in connector.' };

      // Strip Bearer prefix defensively
      const token = rawToken.replace(/^Bearer\s+/i, '').trim();

      const end = new Date().toISOString().slice(0, 10);
      const start = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

      const diag = {
        integration_id: connector.integrationId,
        platforms: connector.platforms ?? null,
        token_prefix: token.slice(0, 8) + '...',
        token_length: token.length,
        start, end,
      };

      try {
        const raw = await new ReporteiClient().getMetricsData({
          integration_id: Number(connector.integrationId),
          start, end,
          metrics: [
            { id: 'ig:impressions',          metrics: ['value'], component: 'number_v1' },
            { id: 'ig:reach',                metrics: ['value'], component: 'number_v1' },
            { id: 'ig:feed_engagement',      metrics: ['value'], component: 'number_v1' },
            { id: 'ig:feed_engagement_rate', metrics: ['value'], component: 'number_v1' },
            { id: 'ig:followers_count',      metrics: ['value'], component: 'number_v1' },
          ],
        }, { token, baseUrl: connector.baseUrl });
        return { ...diag, raw };
      } catch (e: any) {
        return { ...diag, error: e.message };
      }
    }
  );

  // ── POST /admin/reportei/check-all ───────────────────────────────────────
  // Test Reportei API for all linked clients and return health status
  app.post(
    '/admin/reportei/check-all',
    { preHandler: [authGuard, tenantGuard()] },
    async (request: any, reply: any) => {
      const tenantId = (request.user as any).tenant_id;
      const token = process.env.REPORTEI_TOKEN || '';
      if (!token) return reply.send({ error: 'REPORTEI_TOKEN not set' });

      const { rows: connectors } = await query<any>(
        `SELECT c.id as client_id, c.name as client_name, cn.payload
         FROM clients c
         INNER JOIN connectors cn ON cn.client_id = c.id AND cn.provider = 'reportei'
         WHERE c.tenant_id=$1
         ORDER BY c.name ASC`,
        [tenantId]
      );

      const rc = new ReporteiClient();
      const end = new Date().toISOString().slice(0, 10);
      const start = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

      const results: Array<{
        client_id: string;
        client_name: string;
        integration_id: number | null;
        status: 'ok' | 'expired' | 'error' | 'no_integration';
        message: string;
      }> = [];

      for (const row of connectors) {
        const payload = row.payload ?? {};
        const platformsMap: Record<string, number> = payload.platforms ?? {};
        const integrationId: number | null =
          platformsMap['instagram_business'] ??
          (payload.integration_id ? Number(payload.integration_id) : null);

        if (!integrationId) {
          results.push({ client_id: row.client_id, client_name: row.client_name, integration_id: null, status: 'no_integration', message: 'Sem integration_id configurado' });
          continue;
        }

        // Test all platforms in connector, not just Instagram
        const allPlatformIds: Array<{ slug: string; id: number }> = [];
        if (Object.keys(platformsMap).length > 0) {
          for (const [slug, id] of Object.entries(platformsMap)) {
            allPlatformIds.push({ slug, id: Number(id) });
          }
        } else {
          allPlatformIds.push({ slug: 'instagram_business', id: integrationId });
        }

        const platformResults: string[] = [];
        let anyExpired = false;
        let anyError = false;

        for (const { slug, id } of allPlatformIds) {
          try {
            const testMetric = slug === 'instagram_business' ? 'ig:impressions'
              : slug === 'linkedin' ? 'li:impressions'
              : slug === 'facebook_ads' ? 'fb:impressions'
              : slug === 'google_analytics_4' ? 'ga4:sessions'
              : slug === 'google_adwords' ? 'ga_ads:impressions'
              : 'ig:impressions';

            const raw = await rc.getMetricsData({
              integration_id: id,
              start, end,
              metrics: [{ id: testMetric, metrics: ['value'], component: 'number_v1' }],
            }, { token });

            if (raw?.data?.code || raw?.data?.exception) {
              const msg = raw.data.exception?.message ?? raw.data.code ?? 'unknown_error';
              platformResults.push(`${slug}: ${msg}`);
              anyExpired = true;
            } else {
              platformResults.push(`${slug}: OK`);
            }
          } catch (e: any) {
            platformResults.push(`${slug}: ${e.message}`);
            anyError = true;
          }
          await new Promise(r => setTimeout(r, 1200));
        }

        const status = anyExpired ? 'expired' : anyError ? 'error' : 'ok';
        const message = platformResults.join(' | ');
        results.push({ client_id: row.client_id, client_name: row.client_name, integration_id: integrationId, status, message });
      }

      return reply.send({ total: results.length, results });
    }
  );

  // ── POST /admin/reportei/cleanup-snapshots ───────────────────────────────
  // Delete snapshots that contain Reportei error payloads (code/exception keys)
  app.post(
    '/admin/reportei/cleanup-snapshots',
    { preHandler: [authGuard, tenantGuard()] },
    async (request: any, reply: any) => {
      const tenantId = (request.user as any).tenant_id;
      const { rows } = await query<any>(
        `DELETE FROM reportei_metric_snapshots
         WHERE tenant_id=$1
           AND (metrics ? 'code' OR metrics ? 'exception')
         RETURNING id, client_id, platform, time_window`,
        [tenantId]
      ).catch(() => ({ rows: [] }));
      return reply.send({ deleted: rows.length, rows });
    }
  );

  // ── POST /admin/reportei/debug-sync/:clientId ────────────────────────────
  // Full diagnostic: calls Reportei API and returns raw response + DB state
  app.post(
    '/admin/reportei/debug-sync/:clientId',
    { preHandler: [authGuard, tenantGuard()] },
    async (request: any, reply: any) => {
      const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
      const tenantId = (request.user as any).tenant_id;
      const token = process.env.REPORTEI_TOKEN || '';
      if (!token) return reply.send({ error: 'REPORTEI_TOKEN not set' });

      const connector = await getReporteiConnector(tenantId, clientId);
      if (!connector) return reply.send({ error: 'No Reportei connector for this client' });

      const integrationId =
        connector.platforms?.['instagram_business'] ??
        (connector.integrationId ? Number(connector.integrationId) : null);

      if (!integrationId) return reply.send({ error: 'No integration_id found in connector', connector });

      const rc = new ReporteiClient();
      const end = new Date().toISOString().slice(0, 10);
      const start = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

      let raw: any = null;
      let apiError: string | null = null;
      try {
        raw = await rc.getMetricsData({
          integration_id: Number(integrationId),
          start, end,
          metrics: [
            { id: 'ig:impressions',          metrics: ['value'], component: 'number_v1' },
            { id: 'ig:reach',                metrics: ['value'], component: 'number_v1' },
            { id: 'ig:feed_engagement_rate', metrics: ['value'], component: 'number_v1' },
          ],
          comparison_start: new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10),
          comparison_end: new Date(Date.now() - 8 * 86400000).toISOString().slice(0, 10),
        }, { token, baseUrl: connector.baseUrl });
      } catch (e: any) {
        apiError = e.message;
      }

      // DB state
      const { rows: dbSnapshots } = await query<any>(
        `SELECT platform, time_window, synced_at, jsonb_object_keys(metrics) as metric_key
         FROM reportei_metric_snapshots
         WHERE client_id=$1
         ORDER BY synced_at DESC
         LIMIT 20`,
        [clientId]
      ).catch(() => ({ rows: [] }));

      const { rows: dbCount } = await query<any>(
        `SELECT COUNT(*) as total FROM reportei_metric_snapshots WHERE client_id=$1`,
        [clientId]
      ).catch(() => ({ rows: [{ total: 0 }] }));

      return reply.send({
        connector: {
          integration_id: connector.integrationId,
          platforms: connector.platforms,
          has_token: !!connector.token,
          base_url: connector.baseUrl,
        },
        api_call: {
          integration_id: integrationId,
          start, end,
          error: apiError,
          raw_top_level_keys: raw ? Object.keys(raw) : null,
          raw_data_type: raw?.data ? (Array.isArray(raw.data) ? 'array' : typeof raw.data) : null,
          raw_data_keys: raw?.data && typeof raw.data === 'object' && !Array.isArray(raw.data)
            ? Object.keys(raw.data)
            : null,
          raw_full: raw,
        },
        db: {
          total_snapshots: Number(dbCount[0]?.total ?? 0),
          recent: dbSnapshots,
        },
      });
    }
  );

  // ── POST /admin/reportei/run-learning ──────────────────────────────────────
  // Triggers learning rule generation from existing snapshots
  app.post(
    '/admin/reportei/run-learning',
    { preHandler: [tenantGuard(), authGuard] },
    async (_request: any, reply: any) => {
      try {
        const result = await syncAllClientsLearningRules();
        return reply.send({ ok: true, ...result });
      } catch (e: any) {
        return reply.status(500).send({ error: e.message });
      }
    }
  );

  // ── POST /admin/reportei/run-alerts ───────────────────────────────────────
  // Force-run performance alert detection
  app.post(
    '/admin/reportei/run-alerts',
    { preHandler: [tenantGuard(), authGuard] },
    async (_request: any, reply: any) => {
      try {
        const prev = process.env.PERF_ALERT_FORCE;
        (process.env as any).PERF_ALERT_FORCE = 'true';
        await runPerformanceAlertWorkerOnce();
        (process.env as any).PERF_ALERT_FORCE = prev ?? '';
        return reply.send({ ok: true });
      } catch (e: any) {
        return reply.status(500).send({ error: e.message });
      }
    }
  );

  // ── GET /admin/reportei/alerts ────────────────────────────────────────────
  // List recent performance alerts for the tenant
  app.get(
    '/admin/reportei/alerts',
    { preHandler: [tenantGuard(), authGuard] },
    async (request: any, reply: any) => {
      const tenantId = (request.user as any).tenant_id;
      const limit = Number((request.query as any)?.limit ?? 50);
      const { rows } = await query<any>(
        `SELECT id, client_id, type, severity, title, body, payload, sent_at
         FROM notification_logs
         WHERE tenant_id = $1 AND type IN ('perf_drop', 'perf_spike')
         ORDER BY sent_at DESC
         LIMIT $2`,
        [tenantId, limit]
      ).catch(() => ({ rows: [] }));
      return reply.send({ alerts: rows });
    }
  );
}
