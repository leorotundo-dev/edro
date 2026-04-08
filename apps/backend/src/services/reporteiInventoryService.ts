import { query } from '../db';
import { ReporteiClient, ReporteiMetricRequest } from '../providers/reportei/reporteiClient';
import { getReporteiConnector } from '../providers/reportei/reporteiConnector';
import {
  finishReporteiSyncRun,
  startReporteiSyncRun,
  upsertReporteiMetricRawPayload,
  upsertReporteiResourceRaw,
} from './reporteiRawStorageService';

const DEFAULT_PER_PAGE = 100;

function windowToDates(window: string) {
  const days = parseInt(window, 10);
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  const comparisonEnd = new Date(start);
  comparisonEnd.setDate(comparisonEnd.getDate() - 1);
  const comparisonStart = new Date(comparisonEnd);
  comparisonStart.setDate(comparisonStart.getDate() - days);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return {
    start: fmt(start),
    end: fmt(end),
    comparisonStart: fmt(comparisonStart),
    comparisonEnd: fmt(comparisonEnd),
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function collectPaged<T>(
  fetchPage: (page: number) => Promise<any>,
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  while (true) {
    const response = await fetchPage(page);
    const pageItems: T[] = response?.data ?? [];
    items.push(...pageItems);

    const lastPage = Number(response?.meta?.last_page ?? 1);
    if (!pageItems.length || page >= lastPage) break;
    page += 1;
  }
  return items;
}

async function upsertProjects(tenantId: string, companyId: number | null, projects: any[]) {
  for (const project of projects) {
    await query(
      `INSERT INTO reportei_projects
         (tenant_id, reportei_project_id, company_id, name, status, payload)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb)
       ON CONFLICT (tenant_id, reportei_project_id)
       DO UPDATE SET
         company_id=EXCLUDED.company_id,
         name=EXCLUDED.name,
         status=EXCLUDED.status,
         payload=EXCLUDED.payload,
         synced_at=now()`,
      [
        tenantId,
        Number(project.id),
        companyId,
        project.name ?? null,
        project.status ?? null,
        JSON.stringify(project ?? {}),
      ],
    );
  }
}

async function upsertIntegrations(tenantId: string, companyId: number | null, integrations: any[]) {
  for (const integration of integrations) {
    await query(
      `INSERT INTO reportei_integrations
         (tenant_id, reportei_integration_id, reportei_project_id, company_id, slug, name, status, payload)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
       ON CONFLICT (tenant_id, reportei_integration_id)
       DO UPDATE SET
         reportei_project_id=EXCLUDED.reportei_project_id,
         company_id=EXCLUDED.company_id,
         slug=EXCLUDED.slug,
         name=EXCLUDED.name,
         status=EXCLUDED.status,
         payload=EXCLUDED.payload,
         synced_at=now()`,
      [
        tenantId,
        Number(integration.id),
        integration.project_id ? Number(integration.project_id) : null,
        companyId,
        integration.slug ?? null,
        integration.name ?? null,
        integration.status ?? null,
        JSON.stringify(integration ?? {}),
      ],
    );
  }
}

async function upsertMetricCatalog(tenantId: string, slug: string, metrics: any[]) {
  for (const metric of metrics) {
    await query(
      `INSERT INTO reportei_metric_catalog
         (tenant_id, integration_slug, metric_id, reference_key, component, metric_keys, payload)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)
       ON CONFLICT (tenant_id, integration_slug, metric_id)
       DO UPDATE SET
         reference_key=EXCLUDED.reference_key,
         component=EXCLUDED.component,
         metric_keys=EXCLUDED.metric_keys,
         payload=EXCLUDED.payload,
         synced_at=now()`,
      [
        tenantId,
        slug,
        String(metric.id),
        metric.reference_key ?? null,
        metric.component ?? null,
        JSON.stringify(metric.metrics ?? []),
        JSON.stringify(metric ?? {}),
      ],
    );
  }
}

async function syncResourceCollection(
  tenantId: string,
  resourceType: string,
  items: any[],
  getId: (item: any) => string,
) {
  for (const item of items) {
    await upsertReporteiResourceRaw({
      tenantId,
      resourceType,
      resourceId: getId(item),
      reporteiProjectId: item.project_id ? Number(item.project_id) : null,
      payload: item,
    });
  }
}

export async function refreshReporteiInventory(
  tenantId: string,
  token: string,
  options?: {
    includeResources?: boolean;
  },
) {
  const client = new ReporteiClient();
  const overrides = { token };
  const runId = await startReporteiSyncRun({
    tenantId,
    runType: 'inventory_refresh',
    scope: 'company',
    metadata: { include_resources: !!options?.includeResources },
  });

  try {
    const companyResponse = await client.getCompanySettings(overrides);
    const company = companyResponse?.company ?? companyResponse ?? {};
    const companyId = company?.id ? Number(company.id) : null;

    await upsertReporteiResourceRaw({
      tenantId,
      resourceType: 'company_settings',
      resourceId: String(companyId ?? 'current'),
      payload: companyResponse,
    });

    const projects = await collectPaged<any>((page) =>
      client.getProjects({ page, per_page: DEFAULT_PER_PAGE }, overrides),
    );
    const integrations = await collectPaged<any>((page) =>
      client.getIntegrations({ page, per_page: DEFAULT_PER_PAGE }, overrides),
    );

    await upsertProjects(tenantId, companyId, projects);
    await upsertIntegrations(tenantId, companyId, integrations);

    const slugs = [...new Set(integrations.map((item) => item.slug).filter(Boolean))];
    let metricCount = 0;
    for (const slug of slugs) {
      const metrics = await collectPaged<any>((page) =>
        client.getAvailableMetrics(slug, { page, per_page: DEFAULT_PER_PAGE }, overrides),
      );
      metricCount += metrics.length;
      await upsertMetricCatalog(tenantId, slug, metrics);
    }

    const resourceCounts: Record<string, number> = {};
    if (options?.includeResources) {
      const templates = await collectPaged<any>((page) =>
        client.getTemplates({ page, per_page: DEFAULT_PER_PAGE }, overrides),
      );
      const reports = await collectPaged<any>((page) =>
        client.getReports({ page, per_page: DEFAULT_PER_PAGE }, overrides),
      );
      const dashboards = await collectPaged<any>((page) =>
        client.getDashboards({ page, per_page: DEFAULT_PER_PAGE }, overrides),
      );
      const webhooks = await collectPaged<any>((page) =>
        client.getWebhooks({ page, per_page: DEFAULT_PER_PAGE }, overrides),
      );
      const timelineEvents = await collectPaged<any>((page) =>
        client.getTimelineEvents({ page, per_page: DEFAULT_PER_PAGE }, overrides),
      );
      const webhookEventsResponse = await client.getWebhookEvents(overrides);
      const webhookEvents: any[] = webhookEventsResponse?.events ?? [];

      await syncResourceCollection(tenantId, 'template', templates, (item) => String(item.id));
      await syncResourceCollection(tenantId, 'report', reports, (item) => String(item.id));
      await syncResourceCollection(tenantId, 'dashboard', dashboards, (item) => String(item.id));
      await syncResourceCollection(tenantId, 'webhook', webhooks, (item) => String(item.id));
      await syncResourceCollection(tenantId, 'timeline_event', timelineEvents, (item) => String(item.id));
      for (const eventType of webhookEvents) {
        await upsertReporteiResourceRaw({
          tenantId,
          resourceType: 'webhook_event',
          resourceId: String(eventType),
          payload: { event_type: eventType },
        });
      }

      resourceCounts.templates = templates.length;
      resourceCounts.reports = reports.length;
      resourceCounts.dashboards = dashboards.length;
      resourceCounts.webhooks = webhooks.length;
      resourceCounts.timeline_events = timelineEvents.length;
      resourceCounts.webhook_events = webhookEvents.length;
    }

    const result = {
      run_id: runId,
      company_id: companyId,
      projects: projects.length,
      integrations: integrations.length,
      slugs: slugs.length,
      metrics: metricCount,
      resources: resourceCounts,
    };
    await finishReporteiSyncRun(runId, 'success', result);
    return result;
  } catch (error: any) {
    await finishReporteiSyncRun(runId, 'error', {}, error?.message ?? 'unknown_error');
    throw error;
  }
}

async function resolveProjectContext(tenantId: string, projectId?: number | null, clientId?: string | null) {
  if (projectId) return { projectId, clientId: clientId ?? null };
  if (!clientId) throw new Error('project_id or client_id is required');

  const connector = await getReporteiConnector(tenantId, clientId);
  if (connector?.projectId) return { projectId: Number(connector.projectId), clientId };

  const ids = Object.values(connector?.platforms ?? {}).map((value) => Number(value)).filter(Boolean);
  const fallbackId = connector?.integrationId ? Number(connector.integrationId) : null;
  if (fallbackId) ids.push(fallbackId);
  if (!ids.length) throw new Error('client has no Reportei connector context');

  const { rows } = await query<{ reportei_project_id: number }>(
    `SELECT reportei_project_id
       FROM reportei_integrations
      WHERE tenant_id=$1
        AND reportei_integration_id = ANY($2::bigint[])
        AND reportei_project_id IS NOT NULL
      LIMIT 1`,
    [tenantId, ids],
  );
  if (!rows[0]?.reportei_project_id) throw new Error('project_id not found in inventory for client');
  return { projectId: Number(rows[0].reportei_project_id), clientId };
}

function toMetricRequest(row: {
  metric_id: string;
  reference_key: string | null;
  component: string | null;
  metric_keys: any;
}): ReporteiMetricRequest {
  const metricKeys = Array.isArray(row.metric_keys) && row.metric_keys.length ? row.metric_keys : ['value'];
  return {
    id: row.metric_id,
    reference_key: row.reference_key ?? undefined,
    metrics: metricKeys,
    component: (row.component as ReporteiMetricRequest['component']) ?? 'number_v1',
  };
}

export async function ingestReporteiRawMetrics(
  tenantId: string,
  token: string,
  options: {
    projectId?: number | null;
    clientId?: string | null;
    windows: string[];
    metricsPerRequest: number;
    includeInactive?: boolean;
  },
) {
  const client = new ReporteiClient();
  const overrides = { token };
  const context = await resolveProjectContext(tenantId, options.projectId, options.clientId);

  const runId = await startReporteiSyncRun({
    tenantId,
    runType: 'raw_metrics_ingest',
    scope: context.clientId ? `client:${context.clientId}` : `project:${context.projectId}`,
    reporteiProjectId: context.projectId,
    metadata: {
      windows: options.windows,
      metrics_per_request: options.metricsPerRequest,
      include_inactive: !!options.includeInactive,
    },
  });

  try {
    const { rows: integrations } = await query<{
      reportei_integration_id: number;
      slug: string;
      status: string | null;
    }>(
      `SELECT reportei_integration_id, slug, status
         FROM reportei_integrations
        WHERE tenant_id=$1
          AND reportei_project_id=$2
          AND slug IS NOT NULL
          AND ($3::boolean OR COALESCE(status, 'active') = 'active')
        ORDER BY reportei_integration_id ASC`,
      [tenantId, context.projectId, !!options.includeInactive],
    );

    let storedPayloads = 0;
    let integrationCount = 0;
    for (const integration of integrations) {
      const { rows: catalogRows } = await query<{
        metric_id: string;
        reference_key: string | null;
        component: string | null;
        metric_keys: any;
      }>(
        `SELECT metric_id, reference_key, component, metric_keys
           FROM reportei_metric_catalog
          WHERE tenant_id=$1 AND integration_slug=$2
          ORDER BY COALESCE(reference_key, metric_id) ASC`,
        [tenantId, integration.slug],
      );

      const metricDefs = catalogRows.map(toMetricRequest);
      if (!metricDefs.length) continue;
      integrationCount += 1;

      const batches = chunk(metricDefs, Math.max(1, options.metricsPerRequest));
      for (const window of options.windows) {
        const { start, end, comparisonStart, comparisonEnd } = windowToDates(window);
        for (let index = 0; index < batches.length; index++) {
          const metrics = batches[index];
          const requestPayload = {
            integration_id: integration.reportei_integration_id,
            start,
            end,
            comparison_start: comparisonStart,
            comparison_end: comparisonEnd,
            metrics,
          };
          const responsePayload = await client.getMetricsData(requestPayload, overrides);
          const requestKey = `${window}:${start}:${end}:batch:${index + 1}:${batches.length}`;

          await upsertReporteiMetricRawPayload({
            tenantId,
            clientId: context.clientId,
            reporteiProjectId: context.projectId,
            reporteiIntegrationId: integration.reportei_integration_id,
            integrationSlug: integration.slug,
            timeWindow: window,
            periodStart: start,
            periodEnd: end,
            comparisonStart,
            comparisonEnd,
            requestKey,
            requestPayload,
            responsePayload,
          });
          storedPayloads += 1;
        }
      }
    }

    const result = {
      run_id: runId,
      project_id: context.projectId,
      client_id: context.clientId,
      integrations: integrationCount,
      payloads: storedPayloads,
      windows: options.windows,
      metrics_per_request: options.metricsPerRequest,
    };
    await finishReporteiSyncRun(runId, 'success', result);
    return result;
  } catch (error: any) {
    await finishReporteiSyncRun(runId, 'error', {}, error?.message ?? 'unknown_error');
    throw error;
  }
}
