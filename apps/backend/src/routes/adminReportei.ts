import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { ReporteiClient } from '../providers/reportei/reporteiClient';
import { getReporteiConnector } from '../providers/reportei/reporteiConnector';
import { query } from '../db';

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

        return {
          client_id: c.id,
          client_name: c.name,
          linked: !!integrationId,
          integration_id: integrationId ?? null,
          integration_name: integration?.name ?? null,
          integration_slug: integration?.slug ?? null,
          project_id: integration?.project_id ?? null,
          project_name: project?.name ?? null,
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
  // Only links instagram_business integrations by default.
  app.post(
    '/admin/reportei/auto-link',
    { preHandler: [authGuard, tenantGuard()] },
    async (request: any) => {
      const tenantId = (request.user as any).tenant_id;
      const { slug_filter, dry_run } = z
        .object({
          slug_filter: z.string().default('instagram_business'),
          dry_run: z.boolean().default(false),
        })
        .parse(request.body ?? {});

      const token = process.env.REPORTEI_TOKEN || '';
      if (!token) return { error: 'REPORTEI_TOKEN not configured' };

      const { rows: edroClients } = await query<any>(
        `SELECT id, name FROM clients WHERE tenant_id=$1 ORDER BY name ASC`,
        [tenantId]
      );

      const client = new ReporteiClient();
      const overrides = { token };

      const [pRes, iRes] = await Promise.all([
        client.getProjects({ per_page: 100 }, overrides),
        client.getIntegrations({ per_page: 100 }, overrides),
      ]);

      const integrations: any[] = iRes?.data ?? [];
      const filtered = slug_filter
        ? integrations.filter((i: any) => i.slug === slug_filter)
        : integrations;

      const results: Array<{
        client_id: string;
        client_name: string;
        matched_integration_id: number | null;
        matched_name: string | null;
        score: number;
        action: 'linked' | 'skipped' | 'no_match';
      }> = [];

      for (const edroClient of edroClients) {
        let bestScore = 0;
        let bestIntegration: any = null;

        for (const integration of filtered) {
          const score = nameScore(edroClient.name, integration.name);
          if (score > bestScore) {
            bestScore = score;
            bestIntegration = integration;
          }
        }

        if (!bestIntegration || bestScore < 50) {
          results.push({
            client_id: edroClient.id,
            client_name: edroClient.name,
            matched_integration_id: null,
            matched_name: null,
            score: bestScore,
            action: 'no_match',
          });
          continue;
        }

        if (!dry_run) {
          await query(
            `INSERT INTO connectors (tenant_id, client_id, provider, payload)
             VALUES ($1,$2,'reportei',$3::jsonb)
             ON CONFLICT (tenant_id, client_id, provider)
             DO UPDATE SET payload = connectors.payload || $3::jsonb, updated_at=now()`,
            [tenantId, edroClient.id, JSON.stringify({ integration_id: bestIntegration.id })]
          ).catch(() => {
            // Fallback: only update, don't insert
            return query(
              `UPDATE connectors SET payload = payload || $3::jsonb, updated_at=now()
               WHERE tenant_id=$1 AND client_id=$2 AND provider='reportei'`,
              [tenantId, edroClient.id, JSON.stringify({ integration_id: bestIntegration.id })]
            );
          });
        }

        results.push({
          client_id: edroClient.id,
          client_name: edroClient.name,
          matched_integration_id: bestIntegration.id,
          matched_name: bestIntegration.name,
          score: bestScore,
          action: dry_run ? 'skipped' : 'linked',
        });
      }

      return {
        dry_run,
        slug_filter,
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
      const token = connector.token || process.env.REPORTEI_TOKEN || '';
      if (!token) return { error: 'No token.' };
      if (!connector.integrationId) return { error: 'integration_id missing in connector.' };

      const end = new Date().toISOString().slice(0, 10);
      const start = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

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
        return { integration_id: connector.integrationId, start, end, raw };
      } catch (e: any) {
        return { error: e.message };
      }
    }
  );
}
