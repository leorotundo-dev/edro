import { query } from '../db';
import { watchCalendar } from './integrations/googleCalendarService';
import { processPendingRetries } from './webhookRetryService';
import { runTrelloOutboxWorkerOnce } from '../jobs/trelloOutboxWorker';
import { recoverStaleOutboxItems, reviveDeadOutboxItems } from './trelloOutboxService';
import { syncGmailInboxFallback, watchGmailInbox } from './integrations/gmailService';
import { refreshAllClientsForTenant } from '../clientIntelligence/worker';
import { runJarvisAlertEngine } from './jarvisAlertEngine';
import { ensureAllWebhooksForTenant } from './trelloWebhookService';
import { reconcileDarkTrelloBoardsForTenant } from '../jobs/trelloSyncWorker';
import { processWebhookAction, type TrelloWebhookAction } from './trelloProjectorService';
import {
  getJarvisBackgroundQueueHealth,
  recoverStaleJarvisBackgroundJobs,
} from './jarvisBackgroundHealthService';
import {
  getCalendarAutoJoinQueueHealth,
  recoverCalendarAutoJoins,
} from './calendarAutoJoinQueueService';

export type SystemRepairType =
  | 'auto_repair'
  | 'process_webhook_retries'
  | 'flush_trello_outbox'
  | 'recover_stale_trello_outbox'
  | 'revive_dead_trello_outbox'
  | 'ensure_trello_webhooks'
  | 'replay_trello_webhook_events'
  | 'reconcile_trello_dark_boards'
  | 'recover_jarvis_background_jobs'
  | 'recover_calendar_auto_joins'
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
    webhook_retry: Array<{ source: string; due: number; processing: number; stale_processing: number; failed: number }>;
    trello_outbox: { backlog: number; processing: number; stale_processing: number; dead: number; oldest_processing_at: string | null };
    trello_webhooks: {
      total: number;
      active: number;
      dark_boards: number;
      boards_without_webhook: number;
      last_seen_at: string | null;
    };
    trello_webhook_events: {
      pending: number;
      processing: number;
      stale_processing: number;
      failed: number;
      oldest_pending_at: string | null;
      oldest_processing_at: string | null;
    };
    jarvis_background: {
      queued: number;
      processing: number;
      stale_processing: number;
      auto_retry_pending: number;
      failed_recent: number;
      last_failed_at: string | null;
    };
    calendar_auto_joins: {
      queued: number;
      processing: number;
      failed: number;
      recoverable_failed: number;
      stale_without_job: number;
      stale_processing_jobs: number;
      next_stale_scheduled_at: string | null;
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
  recover_stale_trello_outbox: 'Recuperar itens presos da fila do Trello',
  revive_dead_trello_outbox: 'Reenfileirar falhas permanentes do Trello',
  ensure_trello_webhooks: 'Garantir webhooks do Trello',
  replay_trello_webhook_events: 'Reprocessar eventos inbound do Trello',
  reconcile_trello_dark_boards: 'Reconciliar boards dark do Trello',
  recover_jarvis_background_jobs: 'Recuperar workflows do Jarvis',
  recover_calendar_auto_joins: 'Recuperar fila de reuniões do Google Calendar',
  renew_google_watches: 'Renovar watches do Google',
  run_gmail_fallback: 'Rodar fallback do Gmail',
  refresh_client_intelligence: 'Atualizar inteligência dos clientes',
  refresh_jarvis_alerts: 'Recalcular alertas do Jarvis',
};

const AUTO_REPAIRABLE_TYPES = new Set<Exclude<SystemRepairType, 'auto_repair'>>([
  'process_webhook_retries',
  'flush_trello_outbox',
  'recover_stale_trello_outbox',
  'ensure_trello_webhooks',
  'replay_trello_webhook_events',
  'reconcile_trello_dark_boards',
  'recover_jarvis_background_jobs',
  'recover_calendar_auto_joins',
  'renew_google_watches',
  'refresh_jarvis_alerts',
]);

const TRELLO_WEBHOOK_EVENT_STALE_INTERVAL = "15 minutes";

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

async function replayTrelloWebhookEvents(tenantId: string, limit = 50) {
  const staleRecoveryRes = await query<{ recovered: number }>(
    `WITH stale AS (
       SELECT id
         FROM trello_webhook_events
        WHERE tenant_id = $1
          AND status = 'processing'
          AND created_at < now() - interval '${TRELLO_WEBHOOK_EVENT_STALE_INTERVAL}'
        FOR UPDATE SKIP LOCKED
     )
     UPDATE trello_webhook_events twe
        SET status = 'error',
            error_message = COALESCE(NULLIF(twe.error_message, ''), 'trello_webhook_processing_stale')
       FROM stale
      WHERE twe.id = stale.id
      RETURNING 1`,
    [tenantId],
  ).catch(() => ({ rows: [] as Array<{ recovered: number }> }));

  const claimRes = await query<{
    id: string;
    trello_board_id: string | null;
    payload: { action?: TrelloWebhookAction } | null;
  }>(
    `WITH claimed AS (
       SELECT id
         FROM trello_webhook_events
        WHERE tenant_id = $1
          AND status IN ('pending', 'error')
        ORDER BY created_at ASC
        LIMIT $2
        FOR UPDATE SKIP LOCKED
     )
     UPDATE trello_webhook_events twe
        SET status = 'processing',
            error_message = NULL
       FROM claimed
      WHERE twe.id = claimed.id
      RETURNING twe.id, twe.trello_board_id, twe.payload`,
    [tenantId, Math.max(1, Math.min(limit, 200))],
  );

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of claimRes.rows) {
    const action = row.payload?.action;
    if (!action?.id || !action?.type) {
      skipped += 1;
      await query(
        `UPDATE trello_webhook_events
            SET status = 'skipped',
                processed_at = now(),
                error_message = NULL
          WHERE id = $1`,
        [row.id],
      ).catch(() => undefined);
      continue;
    }

    try {
      const handled = await processWebhookAction(tenantId, action);
      await query(
        `UPDATE trello_webhook_events
            SET status = $1,
                processed_at = now(),
                error_message = NULL
          WHERE id = $2`,
        [handled ? 'processed' : 'skipped', row.id],
      );
      if (row.trello_board_id) {
        await query(
          `UPDATE trello_webhooks
              SET last_seen_at = now(),
                  last_error = NULL
            WHERE tenant_id = $1
              AND trello_board_id = $2`,
          [tenantId, row.trello_board_id],
        ).catch(() => undefined);
      }
      if (handled) processed += 1;
      else skipped += 1;
    } catch (error: any) {
      failed += 1;
      await query(
        `UPDATE trello_webhook_events
            SET status = 'error',
                error_message = $2
          WHERE id = $1`,
        [row.id, error?.message ?? 'trello_webhook_replay_failed'],
      ).catch(() => undefined);
    }
  }

  return {
    recovered_stale: staleRecoveryRes.rows.length,
    scanned: claimRes.rows.length,
    processed,
    skipped,
    failed,
  };
}

export async function buildSystemHealthSnapshot(tenantId: string): Promise<SystemHealthSnapshot> {
  const [retryRes, trelloRes, trelloWebhookRes, trelloWebhookEventsRes, jarvisBackground, calendarAutoJoins, gmailRes, calendarRes, intelligenceRes, alertsRes] = await Promise.all([
    query<any>(
      `SELECT source,
              COUNT(*) FILTER (WHERE status = 'pending' AND next_retry_at <= now())::int AS due,
              COUNT(*) FILTER (WHERE status = 'processing')::int AS processing,
              COUNT(*) FILTER (
                WHERE status = 'processing'
                  AND updated_at < now() - interval '15 minutes'
              )::int AS stale_processing,
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
              COUNT(*) FILTER (
                WHERE status = 'processing'
                  AND updated_at < now() - interval '15 minutes'
              )::int AS stale_processing,
              MIN(updated_at) FILTER (WHERE status = 'processing')::text AS oldest_processing_at,
              COUNT(*) FILTER (WHERE status = 'dead')::int AS dead
         FROM trello_outbox
        WHERE tenant_id = $1`,
      [tenantId],
    ).catch(() => ({ rows: [{ backlog: 0, processing: 0, stale_processing: 0, oldest_processing_at: null, dead: 0 }] as any[] })),
    query<any>(
      `SELECT
         COUNT(tw.id)::int as total,
         COUNT(tw.id) FILTER (WHERE tw.is_active = true AND tw.last_seen_at > now() - interval '2 hours')::int as active,
         MAX(tw.last_seen_at)::text as last_seen_at,
         (SELECT COUNT(*)::int FROM project_boards pb2
          WHERE pb2.tenant_id = $1
            AND pb2.is_archived = false
            AND pb2.trello_board_id IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM trello_webhooks tw2
              WHERE tw2.tenant_id = pb2.tenant_id
                AND tw2.trello_board_id = pb2.trello_board_id
                AND tw2.is_active = true
            )
         ) as boards_without_webhook,
         (SELECT COUNT(*)::int FROM project_boards pb3
          LEFT JOIN trello_webhooks tw3
            ON tw3.tenant_id = pb3.tenant_id
           AND tw3.trello_board_id = pb3.trello_board_id
          WHERE pb3.tenant_id = $1
            AND pb3.is_archived = false
            AND pb3.trello_board_id IS NOT NULL
            AND tw3.is_active = true
            AND (tw3.last_seen_at IS NULL OR tw3.last_seen_at <= now() - interval '2 hours')
         ) as dark_boards
       FROM trello_webhooks tw
       WHERE tw.tenant_id = $1`,
      [tenantId],
    ).catch(() => ({ rows: [{ total: 0, active: 0, dark_boards: 0, last_seen_at: null, boards_without_webhook: 0 }] as any[] })),
    query<any>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
         COUNT(*) FILTER (WHERE status = 'processing')::int AS processing,
         COUNT(*) FILTER (
           WHERE status = 'processing'
             AND created_at < now() - interval '${TRELLO_WEBHOOK_EVENT_STALE_INTERVAL}'
         )::int AS stale_processing,
         COUNT(*) FILTER (WHERE status = 'error')::int AS failed,
         MIN(created_at) FILTER (WHERE status = 'pending')::text AS oldest_pending_at,
         MIN(created_at) FILTER (WHERE status = 'processing')::text AS oldest_processing_at
       FROM trello_webhook_events
      WHERE tenant_id = $1`,
      [tenantId],
    ).catch(() => ({ rows: [{ pending: 0, failed: 0, oldest_pending_at: null }] as any[] })),
    getJarvisBackgroundQueueHealth(tenantId).catch(() => ({
      queued: 0,
      processing: 0,
      stale_processing: 0,
      auto_retry_pending: 0,
      failed_recent: 0,
      last_failed_at: null,
    })),
    getCalendarAutoJoinQueueHealth(tenantId).catch(() => ({
      queued: 0,
      processing: 0,
      failed: 0,
      recoverable_failed: 0,
      stale_without_job: 0,
      stale_processing_jobs: 0,
      next_stale_scheduled_at: null,
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
  const retry = retryRes.rows as Array<{ source: string; due: number; processing: number; stale_processing: number; failed: number }>;
  const trello = trelloRes.rows[0] ?? { backlog: 0, processing: 0, stale_processing: 0, oldest_processing_at: null, dead: 0 };
  const trelloWebhooks = trelloWebhookRes.rows[0] ?? { total: 0, active: 0, dark_boards: 0, last_seen_at: null, boards_without_webhook: 0 };
  const trelloWebhookEvents = trelloWebhookEventsRes.rows[0] ?? {
    pending: 0,
    processing: 0,
    stale_processing: 0,
    failed: 0,
    oldest_pending_at: null,
    oldest_processing_at: null,
  };
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
  const staleRetries = retry.reduce((sum, row) => sum + Number(row.stale_processing || 0), 0);
  const failedRetries = retry.reduce((sum, row) => sum + Number(row.failed || 0), 0);

  if (dueRetries || staleRetries || failedRetries) {
    issues.push({
      key: 'webhook_retry_queue',
      severity: failedRetries > 0 || staleRetries > 0 ? 'critical' : 'warning',
      title: 'Fila de webhook com eventos pendentes',
      message: `${dueRetries} retry(s) vencidos, ${staleRetries} processamento(s) stale e ${failedRetries} falha(s) permanentes.`,
      repair_type: 'process_webhook_retries',
    });
  }
  if (Number(trello.backlog || 0)) {
    issues.push({
      key: 'trello_outbox',
      severity: 'warning',
      title: 'Fila do Trello acumulada',
      message: `${Number(trello.backlog || 0)} item(ns) pendentes aguardando envio.`,
      repair_type: 'flush_trello_outbox',
    });
  }
  if (Number(trello.stale_processing || 0)) {
    issues.push({
      key: 'trello_outbox_processing',
      severity: 'critical',
      title: 'Fila do Trello com itens presos em processamento',
      message: `${Number(trello.stale_processing || 0)} operação(ões) da outbox do Trello ficaram presas em processing e precisam recuperação.`,
      repair_type: 'recover_stale_trello_outbox',
    });
  }
  if (Number(trello.dead || 0)) {
    issues.push({
      key: 'trello_outbox_dead',
      severity: 'critical',
      title: 'Fila do Trello com falhas permanentes',
      message: `${Number(trello.dead || 0)} operação(ões) do Trello caíram em falha permanente e exigem reenfileiramento explícito.`,
      repair_type: 'revive_dead_trello_outbox',
    });
  }
  if (Number(trelloWebhooks.boards_without_webhook || 0) > 0) {
    issues.push({
      key: 'trello_webhooks',
      severity: 'warning',
      title: 'Boards do Trello sem webhook ativo',
      message: `${Number(trelloWebhooks.boards_without_webhook || 0)} board(s) estão sem webhook ativo para sync em tempo real.`,
      repair_type: 'ensure_trello_webhooks',
    });
  }
  if (Number(trelloWebhooks.dark_boards || 0) > 0) {
    issues.push({
      key: 'trello_dark_boards',
      severity: 'warning',
      title: 'Realtime do Trello está silencioso',
      message: `${Number(trelloWebhooks.dark_boards || 0)} board(s) do Trello estão sem evento recente nas últimas 2 horas. Reconciliar boards dark reduz drift de contexto.`,
      repair_type: 'reconcile_trello_dark_boards',
    });
  }
  if (
    Number(trelloWebhookEvents.pending || 0) > 0 ||
    Number(trelloWebhookEvents.failed || 0) > 0 ||
    Number(trelloWebhookEvents.stale_processing || 0) > 0
  ) {
    issues.push({
      key: 'trello_webhook_events',
      severity:
        Number(trelloWebhookEvents.failed || 0) > 0 ||
        Number(trelloWebhookEvents.stale_processing || 0) > 0
          ? 'critical'
          : 'warning',
      title: 'Eventos inbound do Trello presos',
      message: `${Number(trelloWebhookEvents.pending || 0)} evento(s) pendentes, ${Number(trelloWebhookEvents.failed || 0)} falha(s) e ${Number(trelloWebhookEvents.stale_processing || 0)} processamento(s) stale no projector do Trello.`,
      repair_type: 'replay_trello_webhook_events',
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
  if (
    Number(calendarAutoJoins.stale_without_job || 0) > 0 ||
    Number(calendarAutoJoins.stale_processing_jobs || 0) > 0 ||
    Number(calendarAutoJoins.recoverable_failed || 0) > 0
  ) {
    issues.push({
      key: 'calendar_auto_joins',
      severity:
        Number(calendarAutoJoins.stale_without_job || 0) > 0 ||
        Number(calendarAutoJoins.stale_processing_jobs || 0) > 0
          ? 'critical'
          : 'warning',
      title: 'Fila de reuniões com bot do Google Calendar precisa recuperação',
      message: `${Number(calendarAutoJoins.stale_without_job || 0)} auto-join(ns) sem job vivo, ${Number(calendarAutoJoins.stale_processing_jobs || 0)} job(s) stale do meet-bot e ${Number(calendarAutoJoins.recoverable_failed || 0)} falha(s) recuperáveis.`,
      repair_type: 'recover_calendar_auto_joins',
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
        stale_processing: Number(trello.stale_processing || 0),
        dead: Number(trello.dead || 0),
        oldest_processing_at: trello.oldest_processing_at || null,
      },
      trello_webhooks: {
        total: Number(trelloWebhooks.total || 0),
        active: Number(trelloWebhooks.active || 0),
        dark_boards: Number(trelloWebhooks.dark_boards || 0),
        boards_without_webhook: Number(trelloWebhooks.boards_without_webhook || 0),
        last_seen_at: trelloWebhooks.last_seen_at || null,
      },
      trello_webhook_events: {
        pending: Number(trelloWebhookEvents.pending || 0),
        processing: Number(trelloWebhookEvents.processing || 0),
        stale_processing: Number(trelloWebhookEvents.stale_processing || 0),
        failed: Number(trelloWebhookEvents.failed || 0),
        oldest_pending_at: trelloWebhookEvents.oldest_pending_at || null,
        oldest_processing_at: trelloWebhookEvents.oldest_processing_at || null,
      },
      jarvis_background: jarvisBackground,
      calendar_auto_joins: calendarAutoJoins,
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
      case 'recover_stale_trello_outbox': {
        const beforeOutbox = before.components.trello_outbox;
        const recovered = await recoverStaleOutboxItems(tenantId);
        const outboxAfter = await buildSystemHealthSnapshot(tenantId);
        executedRepairs.push({
          repair_type: plannedRepair,
          stale_processing_before: beforeOutbox.stale_processing,
          recovered: recovered.recovered,
          stale_processing_after: outboxAfter.components.trello_outbox.stale_processing,
          backlog_after: outboxAfter.components.trello_outbox.backlog,
        });
        break;
      }
      case 'revive_dead_trello_outbox': {
        const beforeOutbox = before.components.trello_outbox;
        const revived = await reviveDeadOutboxItems(tenantId);
        const outboxAfter = await buildSystemHealthSnapshot(tenantId);
        executedRepairs.push({
          repair_type: plannedRepair,
          dead_before: beforeOutbox.dead,
          revived: revived.revived,
          dead_after: outboxAfter.components.trello_outbox.dead,
          backlog_after: outboxAfter.components.trello_outbox.backlog,
        });
        break;
      }
      case 'ensure_trello_webhooks': {
        const beforeWebhooks = before.components.trello_webhooks;
        await ensureAllWebhooksForTenant(tenantId);
        const afterWebhooks = (await buildSystemHealthSnapshot(tenantId)).components.trello_webhooks;
        executedRepairs.push({
          repair_type: plannedRepair,
          boards_without_webhook_before: beforeWebhooks.boards_without_webhook,
          boards_without_webhook_after: afterWebhooks.boards_without_webhook,
          active_after: afterWebhooks.active,
        });
        break;
      }
      case 'replay_trello_webhook_events': {
        const replay = await replayTrelloWebhookEvents(tenantId);
        executedRepairs.push({
          repair_type: plannedRepair,
          recovered_stale: replay.recovered_stale,
          scanned: replay.scanned,
          processed: replay.processed,
          skipped: replay.skipped,
          failed: replay.failed,
        });
        break;
      }
      case 'reconcile_trello_dark_boards': {
        const result = await reconcileDarkTrelloBoardsForTenant(tenantId);
        executedRepairs.push({
          repair_type: plannedRepair,
          scanned: result.scanned,
          reconciled: result.reconciled,
          skipped_live: result.skipped_live,
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
      case 'recover_calendar_auto_joins': {
        const recovery = await recoverCalendarAutoJoins({ tenantId });
        executedRepairs.push({
          repair_type: plannedRepair,
          scanned: recovery.scanned,
          recovered_stale_jobs: recovery.recovered_stale_jobs,
          recovered: recovery.recovered,
          skipped_too_close: recovery.skipped_too_close,
          failed: recovery.failed,
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
