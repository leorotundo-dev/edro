import { query } from '../db';

export type IntegrationService =
  | 'trello'
  | 'whatsapp'
  | 'recall'
  | 'resend'
  | 'd4sign'
  | 'openai'
  | 'gmail'
  | 'google_calendar'
  | 'instagram'
  | 'evolution';

export type ActivityStatus = 'ok' | 'error' | 'degraded';

export interface LogActivityParams {
  tenantId: string;
  service: IntegrationService;
  event: string;
  status?: ActivityStatus;
  records?: number;
  errorMsg?: string;
  meta?: Record<string, any>;
}

/** Fire-and-forget: log one integration activity event. */
export function logActivity(params: LogActivityParams): void {
  const { tenantId, service, event, status = 'ok', records, errorMsg, meta } = params;
  query(
    `INSERT INTO integration_activity_log
       (tenant_id, service, event, status, records, error_msg, meta)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    [tenantId, service, event, status, records ?? null, errorMsg ?? null, JSON.stringify(meta ?? {})],
  ).catch((err) => {
    console.error('[integrationMonitor] failed to log activity:', err?.message);
  });
}

export interface ServiceMonitorStatus {
  service: IntegrationService;
  label: string;
  configured: boolean;
  status: ActivityStatus | 'unknown';
  last_event?: string;
  last_activity?: string; // ISO timestamp
  records?: number | null;
  error_msg?: string | null;
  meta?: Record<string, any>;
}

/** Aggregate last activity per service for a tenant. */
export async function getMonitorStatus(
  tenantId: string,
  configuredServices: Set<IntegrationService>,
): Promise<ServiceMonitorStatus[]> {
  const { rows } = await query<{
    service: string;
    event: string;
    status: string;
    records: number | null;
    error_msg: string | null;
    meta: any;
    created_at: string;
  }>(
    `SELECT service, event, status, records, error_msg, meta, created_at
       FROM integration_latest_activity
      WHERE tenant_id = $1`,
    [tenantId],
  );

  const activityMap = new Map(rows.map((r) => [r.service, r]));

  const SERVICE_LABELS: Record<IntegrationService, string> = {
    trello:           'Trello',
    whatsapp:         'WhatsApp (Meta)',
    evolution:        'WhatsApp (Evolution)',
    recall:           'Recall.ai (Meeting Bot)',
    resend:           'Email (Resend/SMTP)',
    d4sign:           'D4Sign (Contratos)',
    openai:           'AI (OpenAI)',
    gmail:            'Gmail',
    google_calendar:  'Google Calendar',
    instagram:        'Instagram',
  };

  const allServices: IntegrationService[] = [
    'trello', 'whatsapp', 'evolution', 'recall', 'resend',
    'd4sign', 'openai', 'gmail', 'google_calendar', 'instagram',
  ];

  return allServices.map((service) => {
    const activity = activityMap.get(service);
    const configured = configuredServices.has(service);

    // If no activity logged yet but configured → unknown
    // If activity exists → use its status
    // If not configured → not relevant
    const status: ActivityStatus | 'unknown' = !configured
      ? 'unknown'
      : activity
      ? (activity.status as ActivityStatus)
      : 'unknown';

    return {
      service,
      label: SERVICE_LABELS[service],
      configured,
      status,
      last_event: activity?.event,
      last_activity: activity?.created_at,
      records: activity?.records,
      error_msg: activity?.error_msg,
      meta: activity?.meta,
    };
  });
}
