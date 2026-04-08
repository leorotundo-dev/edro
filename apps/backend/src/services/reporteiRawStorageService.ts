import { query } from '../db';

type SyncRunArgs = {
  tenantId: string;
  runType: string;
  scope?: string | null;
  reporteiProjectId?: number | null;
  reporteiIntegrationId?: number | null;
  metadata?: Record<string, any>;
};

type MetricRawPayloadArgs = {
  tenantId: string;
  clientId?: string | null;
  reporteiProjectId?: number | null;
  reporteiIntegrationId: number;
  integrationSlug: string;
  timeWindow?: string | null;
  periodStart: string;
  periodEnd: string;
  comparisonStart?: string | null;
  comparisonEnd?: string | null;
  requestKey: string;
  requestPayload: unknown;
  responsePayload: unknown;
};

type ResourceRawArgs = {
  tenantId: string;
  resourceType: string;
  resourceId: string;
  reporteiProjectId?: number | null;
  payload: unknown;
};

export async function startReporteiSyncRun(args: SyncRunArgs): Promise<string> {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO reportei_sync_runs
       (tenant_id, run_type, scope, reportei_project_id, reportei_integration_id, metadata)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb)
     RETURNING id`,
    [
      args.tenantId,
      args.runType,
      args.scope ?? null,
      args.reporteiProjectId ?? null,
      args.reporteiIntegrationId ?? null,
      JSON.stringify(args.metadata ?? {}),
    ]
  );
  return rows[0]?.id;
}

export async function finishReporteiSyncRun(
  runId: string,
  status: 'success' | 'error',
  metadata?: Record<string, any>,
  error?: string | null
) {
  await query(
    `UPDATE reportei_sync_runs
        SET status=$2,
            metadata=COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
            error=$4,
            finished_at=now()
      WHERE id=$1`,
    [runId, status, JSON.stringify(metadata ?? {}), error ?? null]
  );
}

export async function upsertReporteiMetricRawPayload(args: MetricRawPayloadArgs) {
  await query(
    `INSERT INTO reportei_metric_raw_payloads
       (tenant_id, client_id, reportei_project_id, reportei_integration_id, integration_slug,
        time_window, period_start, period_end, comparison_start, comparison_end,
        request_key, request_payload, response_payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb)
     ON CONFLICT (tenant_id, reportei_integration_id, request_key)
     DO UPDATE SET
       client_id=EXCLUDED.client_id,
       reportei_project_id=EXCLUDED.reportei_project_id,
       integration_slug=EXCLUDED.integration_slug,
       time_window=EXCLUDED.time_window,
       period_start=EXCLUDED.period_start,
       period_end=EXCLUDED.period_end,
       comparison_start=EXCLUDED.comparison_start,
       comparison_end=EXCLUDED.comparison_end,
       request_payload=EXCLUDED.request_payload,
       response_payload=EXCLUDED.response_payload,
       synced_at=now()`,
    [
      args.tenantId,
      args.clientId ?? null,
      args.reporteiProjectId ?? null,
      args.reporteiIntegrationId,
      args.integrationSlug,
      args.timeWindow ?? null,
      args.periodStart,
      args.periodEnd,
      args.comparisonStart ?? null,
      args.comparisonEnd ?? null,
      args.requestKey,
      JSON.stringify(args.requestPayload ?? {}),
      JSON.stringify(args.responsePayload ?? {}),
    ]
  );
}

export async function upsertReporteiResourceRaw(args: ResourceRawArgs) {
  await query(
    `INSERT INTO reportei_resource_raw
       (tenant_id, resource_type, resource_id, reportei_project_id, payload)
     VALUES ($1,$2,$3,$4,$5::jsonb)
     ON CONFLICT (tenant_id, resource_type, resource_id)
     DO UPDATE SET
       reportei_project_id=EXCLUDED.reportei_project_id,
       payload=EXCLUDED.payload,
       synced_at=now()`,
    [
      args.tenantId,
      args.resourceType,
      args.resourceId,
      args.reporteiProjectId ?? null,
      JSON.stringify(args.payload ?? {}),
    ]
  );
}
