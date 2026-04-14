import { query } from '../db';
import { watchCalendar } from './integrations/googleCalendarService';
import { processPendingRetries } from './webhookRetryService';
import { runTrelloOutboxWorkerOnce } from '../jobs/trelloOutboxWorker';
import { syncGmailInboxFallback, watchGmailInbox } from './integrations/gmailService';
import { refreshAllClientsForTenant } from '../clientIntelligence/worker';
import { runJarvisAlertEngine } from './jarvisAlertEngine';
import {
  getJarvisBackgroundQueueHealth,
  recoverStaleJarvisBackgroundJobs,
} from './jarvisBackgroundHealthService';

export type SystemRepairType =
  | 'auto_repair'
  | 'process_webhook_retries'
  | 'flush_trello_outbox'
  | 'recover_jarvis_background_jobs'
  | 'renew_google_watches'
  | 'run_gmail_fallback'
  | 'refresh_client_intelligence'
  | 'refresh_jarvis_alerts';

export type SystemHealthIssue = {
  key: string;
  severity: 'warning' | 'critical';
  title: string;
  message: string;
  repair_type: Exclude<SystemRepairType, 'auto_repair'>;
};

export type SystemHealthSnapshot = {
  summary: {
    status: 'ok' | 'warning' | 'critical';
    open_issues: number;
    critical_issues: number;
  };
  components: {
    webhook_retry: Array<{ source: string; due: number; processing: number; failed: number }>;
    trello_outbox: { backlog: number; processing: number; dead: number };
    jarvis_background: {
      queued: number;
      processing: number;
      stale_processing: number;
      auto_retry_pending: number;
      failed_recent: number;
      last_failed_at: string | null;
    };
    gmail: null | {
      email_address: string | null;
      watch_expiry: string | null;
      last_sync_at: string | null;
      last_error: string | null;
      needs_attention: boolean;
    };
    google_calendar: null | {
      email_address: string | null;
      expires_at: string | null;
      watch_status: string | null;
      last_watch_error: string | null;
      needs_attention: boolean;
    };
    client_intelligence: { total_clients: number; stale_clients: number };
    jarvis_alerts: { open_alerts: number; last_open_alert_at: string | null };
  };
  issues: SystemHealthIssue[];
  repair_actions: Array<{ repair_type: Exclude<SystemRepairType, 'auto_repair'>; label: string }>;
};

export const SYSTEM_REPAIR_LABELS: Record<SystemRepairType, string> = {
  auto_repair: 'Auto-reparo seguro',
  process_webhook_retries: 'Processar retries de webhook',
  flush_trello_outbox: 'Destravar fila do Trello',
  recover_jarvis_background_jobs: 'Recuperar workflows do Jarvis',
  renew_google_watches: 'Renovar watches do Google',
  run_gmail_fallback: 'Rodar fallback do Gmail',
  refresh_client_intelligence: 'Atualizar inteligência dos clientes',
  refresh_jarvis_alerts: 'Recalcular alertas do Jarvis',
};

const AUTO_REPAIRABLE_TYPES = new Set<Exclude<SystemRepairType, 'auto_repair'>>([
  'process_webhook_retries',
  'flush_trello_outbox',
  'recover_jarvis_background_jobs',
  'renew_google_watches',
  'refresh_jarvis_alerts',
]);

export function resolveSystemRepairPlan(
  requestedRepairType: SystemRepairType,
  snapshot: SystemHealthSnapshot,
): Array<Exclude<SystemRepairType, 'auto_repair'>> {
  return requestedRepairType === 'auto_repair'
    ? snapshot.repair_actions.map((item) => item.repair_type)
    : [requestedRepairType];
}

export function resolveAutoRepairPlan(snapshot: SystemHealthSnapshot) {
  return snapshot.repair_actions
    .map((item) => item.repair_type)
    .filter((repairType) => AUTO_REPAIRABLE_TYPES.has(repairType));
}

export async function buildSystemHealthSnapshot(tenantId: string): Promise<SystemHealthSnapshot> {
  const [retryRes, trelloRes, jarvisBackground, gmailRes, calendarRes, intelligenceRes, alertsRes] = await Promise.all([
    query<any>(
      `SELECT source,
              COUNT(*) FILTER (WHERE status = 'pending' AND next_retry_at <= now())::int AS due,
              COUNT(*) FILTER (WHERE status = 'processing')::int AS processing,
              COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
         FROM webhook_retry_queue
        WHERE tenant_id = $1
        GROUP BY source
        ORDER BY source ASC`,
      [tenantId],
    ).catch(() => ({ rows: [] as any[] })),
    query<any>(
      `SELECT COUNT(*) FILTER (WHERE status IN ('pending','error'))::int AS backlog,
              COUNT(*) FILTER (WHERE status = 'processing')::int AS processing,
              COUNT(*) FILTER (WHERE status = 'dead')::int AS dead
         FROM trello_outbox
        WHERE tenant_id = $1`,
      [tenantId],
    ).catch(() => ({ rows: [{ backlog: 0, processing: 0, dead: 0 }] as any[] })),
    getJarvisBackgroundQueueHealth(tenantId).catch(() => ({
      queued: 0,
      processing: 0,
      stale_processing: 0,
      auto_retry_pending: 0,
      failed_recent: 0,
      last_failed_at: null,
    })),
    query<any>(
      `SELECT email_address, watch_expiry, last_sync_at, last_error
         FROM gmail_connections
        WHERE tenant_id = $1
        LIMIT 1`,
      [tenantId],
    ).catch(() => ({ rows: [] as any[] })),
    query<any>(
      `SELECT email_address, expires_at, watch_status, last_watch_error
         FROM google_calendar_channels
        WHERE tenant_id = $1
        LIMIT 1`,
      [tenantId],
    ).catch(() => ({ rows: [] as any[] })),
    query<any>(
      `SELECT COUNT(*)::int AS total_clients,
              COUNT(*) FILTER (
                WHERE intelligence_refreshed_at IS NULL
                   OR intelligence_refreshed_at < now() - interval '7 days'
              )::int AS stale_clients
         FROM clients
        WHERE tenant_id = $1
          AND status != 'archived'`,
      [tenantId],
    ).catch(() => ({ rows: [{ total_clients: 0, stale_clients: 0 }] as any[] })),
    query<any>(
      `SELECT COUNT(*)::int AS open_alerts, MAX(created_at)::text AS last_open_alert_at
         FROM jarvis_alerts
        WHERE tenant_id = $1
          AND status = 'open'`,
      [tenantId],
    ).catch(() => ({ rows: [{ open_alerts: 0, last_open_alert_at: null }] as any[] })),
  ]);

  const now = Date.now();
  const retry = retryRes.rows as Array<{ source: string; due: number; processing: number; failed: number }>;
  const trello = trelloRes.rows[0] ?? { backlog: 0, processing: 0, dead: 0 };
  const gmail = gmailRes.rows[0] ?? null;
  const calendar = calendarRes.rows[0] ?? null;
  const intelligence = intelligenceRes.rows[0] ?? { total_clients: 0, stale_clients: 0 };
  const alerts = alertsRes.rows[0] ?? { open_alerts: 0, last_open_alert_at: null };
  const gmailExpiryMs = gmail?.watch_expiry ? new Date(gmail.watch_expiry).getTime() : null;
  const calendarExpiryMs = calendar?.expires_at ? new Date(calendar.expires_at).getTime() : null;
  const gmailNeedsAttention = Boolean(gmail?.last_error) || (gmailExpiryMs !== null && gmailExpiryMs < now + 48 * 3_600_000);
  const calendarNeedsAttention = Boolean(calendar?.last_watch_error) || (calendarExpiryMs !== null && calendarExpiryMs < now + 48 * 3_600_000);

  const issues: SystemHealthIssue[] = [];
  const dueRetries = retry.reduce((sum, row) => sum + Number(row.due || 0), 0);
  const failedRetries = retry.reduce((sum, row) => sum + Number(row.failed || 0), 0);

  if (dueRetries || failedRetries) {
    issues.push({
      key: 'webhook_retry_queue',
      severity: failedRetries > 0 ? 'critical' : 'warning',
      title: 'Fila de webhook com eventos pendentes',
      message: `${dueRetries} retry(s) de webhook vencidos e ${failedRetries} falha(s) permanentes.`,
      repair_type: 'process_webhook_retries',
    });
  }
  if (Number(trello.backlog || 0) || Number(trello.dead || 0)) {
    issues.push({
      key: 'trello_outbox',
      severity: Number(trello.dead || 0) > 0 ? 'critical' : 'warning',
      title: 'Fila do Trello acumulada',
      message: `${Number(trello.backlog || 0)} item(ns) pendentes e ${Number(trello.dead || 0)} falha(s) permanentes.`,
      repair_type: 'flush_trello_outbox',
    });
  }
  if (Number(jarvisBackground.stale_processing || 0) > 0) {
    issues.push({
      key: 'jarvis_background_queue',
      severity: 'critical',
      title: 'Workflow do Jarvis preso em background',
      message: `${Number(jarvisBackground.stale_processing || 0)} workflow(s) do Jarvis ficaram travados em processamento.`,
      repair_type: 'recover_jarvis_background_jobs',
    });
  }
  if (gmailNeedsAttention || calendarNeedsAttention) {
    issues.push({
      key: 'google_watches',
      severity: (gmailExpiryMs !== null && gmailExpiryMs <= now) || (calendarExpiryMs !== null && calendarExpiryMs <= now) ? 'critical' : 'warning',
      title: 'Watches do Google precisam atenção',
      message: [
        gmailNeedsAttention ? `Gmail ${gmail?.email_address || ''}`.trim() : null,
        calendarNeedsAttention ? `Calendar ${calendar?.email_address || ''}`.trim() : null,
      ].filter(Boolean).join(' · ') || 'Conexões Google exigem renovação.',
      repair_type: 'renew_google_watches',
    });
  }
  if (Number(intelligence.stale_clients || 0) > 0) {
    issues.push({
      key: 'client_intelligence',
      severity: Number(intelligence.stale_clients || 0) >= 5 ? 'critical' : 'warning',
      title: 'Clientes com inteligência stale',
      message: `${Number(intelligence.stale_clients || 0)} cliente(s) sem refresh de inteligência nos últimos 7 dias.`,
      repair_type: 'refresh_client_intelligence',
    });
  }

  const status = issues.some((item) => item.severity === 'critical') ? 'critical' : issues.length ? 'warning' : 'ok';
  return {
    summary: {
      status,
      open_issues: issues.length,
      critical_issues: issues.filter((item) => item.severity === 'critical').length,
    },
    components: {
      webhook_retry: retry,
      trello_outbox: {
        backlog: Number(trello.backlog || 0),
        processing: Number(trello.processing || 0),
        dead: Number(trello.dead || 0),
      },
      jarvis_background: jarvisBackground,
      gmail: gmail ? {
        email_address: gmail.email_address,
        watch_expiry: gmail.watch_expiry,
        last_sync_at: gmail.last_sync_at,
        last_error: gmail.last_error,
        needs_attention: gmailNeedsAttention,
      } : null,
      google_calendar: calendar ? {
        email_address: calendar.email_address,
        expires_at: calendar.expires_at,
        watch_status: calendar.watch_status,
        last_watch_error: calendar.last_watch_error,
        needs_attention: calendarNeedsAttention,
      } : null,
      client_intelligence: {
        total_clients: Number(intelligence.total_clients || 0),
        stale_clients: Number(intelligence.stale_clients || 0),
      },
      jarvis_alerts: {
        open_alerts: Number(alerts.open_alerts || 0),
        last_open_alert_at: alerts.last_open_alert_at || null,
      },
    },
    issues,
    repair_actions: Array.from(new Set(issues.map((item) => item.repair_type))).map((repairType) => ({
      repair_type: repairType,
      label: SYSTEM_REPAIR_LABELS[repairType],
    })),
  };
}

export async function runSystemRepair(
  tenantId: string,
  repairType: SystemRepairType,
  beforeSnapshot?: SystemHealthSnapshot,
) {
  const before = beforeSnapshot ?? await buildSystemHealthSnapshot(tenantId);
  const repairPlan = resolveSystemRepairPlan(repairType, before);
  if (!repairPlan.length) {
    return {
      repair_type: repairType,
      executed_repairs: [],
      before_summary: before.summary,
      after_summary: before.summary,
      remaining_issues: before.issues,
      message: 'Nenhum reparo necessário no momento.',
    };
  }

  const executedRepairs: Array<Record<string, any>> = [];
  for (const plannedRepair of repairPlan) {
    switch (plannedRepair) {
      case 'process_webhook_retries':
        executedRepairs.push({ repair_type: plannedRepair, ...(await processPendingRetries()) });
        break;
      case 'flush_trello_outbox': {
        const beforeOutbox = before.components.trello_outbox;
        await runTrelloOutboxWorkerOnce();
        const outboxAfter = await buildSystemHealthSnapshot(tenantId);
        executedRepairs.push({
          repair_type: plannedRepair,
          backlog_before: beforeOutbox.backlog,
          backlog_after: outboxAfter.components.trello_outbox.backlog,
          dead_after: outboxAfter.components.trello_outbox.dead,
        });
        break;
      }
      case 'recover_jarvis_background_jobs': {
        const recovery = await recoverStaleJarvisBackgroundJobs({ tenantId });
        executedRepairs.push({
          repair_type: plannedRepair,
          scanned: recovery.scanned,
          recovered: recovery.recovered,
        });
        break;
      }
      case 'renew_google_watches': {
        const gmailConnected = await query(`SELECT 1 FROM gmail_connections WHERE tenant_id = $1 AND refresh_token IS NOT NULL LIMIT 1`, [tenantId]).catch(() => ({ rows: [] as any[] }));
        const calendarConnected = await query(`SELECT 1 FROM google_calendar_channels WHERE tenant_id = $1 AND refresh_token IS NOT NULL LIMIT 1`, [tenantId]).catch(() => ({ rows: [] as any[] }));
        const result = { repair_type: plannedRepair, gmail: { attempted: false, ok: false, error: null as string | null }, calendar: { attempted: false, ok: false, error: null as string | null } };
        if (gmailConnected.rows.length) {
          result.gmail.attempted = true;
          try {
            await watchGmailInbox(tenantId);
            result.gmail.ok = true;
          } catch (error: any) {
            result.gmail.error = error?.message || 'gmail_watch_failed';
          }
        }
        if (calendarConnected.rows.length) {
          result.calendar.attempted = true;
          try {
            await watchCalendar(tenantId);
            result.calendar.ok = true;
          } catch (error: any) {
            result.calendar.error = error?.message || 'calendar_watch_failed';
          }
        }
        executedRepairs.push(result);
        break;
      }
      case 'run_gmail_fallback':
        executedRepairs.push({ repair_type: plannedRepair, outcome: await syncGmailInboxFallback(tenantId) });
        break;
      case 'refresh_client_intelligence': {
        const result = await refreshAllClientsForTenant(tenantId);
        executedRepairs.push({
          repair_type: plannedRepair,
          total_clients: result.total,
          processed: result.processed,
          ok: result.results.filter((item) => item.ok).length,
          failed: result.results.filter((item) => !item.ok).length,
        });
        break;
      }
      case 'refresh_jarvis_alerts':
        executedRepairs.push({ repair_type: plannedRepair, saved: await runJarvisAlertEngine(tenantId) });
        break;
      default:
        throw new Error(`repair_type não suportado: ${plannedRepair}`);
    }
  }

  const after = await buildSystemHealthSnapshot(tenantId);
  return {
    repair_type: repairType,
    executed_repairs: executedRepairs,
    before_summary: before.summary,
    after_summary: after.summary,
    remaining_issues: after.issues,
    message: `Reparo ${SYSTEM_REPAIR_LABELS[repairType]} concluído.`,
  };
}
