import { query } from '../db';
import { enqueueJob } from '../jobs/jobQueue';
import { ensureInternalClient, isInternalClientId } from '../repos/clientsRepo';

type CalendarAutoJoinQueueRow = {
  id: string;
  event_title: string | null;
  video_url: string | null;
  video_platform: string | null;
  scheduled_at: string | null;
  status: string;
  bot_id: string | null;
  meeting_id: string | null;
  resolved_client_id: string | null;
  resolved_client_name: string | null;
};

export type CalendarAutoJoinQueueHealth = {
  queued: number;
  processing: number;
  failed: number;
  recoverable_failed: number;
  stale_without_job: number;
  next_stale_scheduled_at: string | null;
};

export class CalendarAutoJoinQueueError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 422) {
    super(message);
    this.name = 'CalendarAutoJoinQueueError';
    this.statusCode = statusCode;
  }
}

async function loadAutoJoinQueueItem(tenantId: string, autoJoinId: string) {
  const { rows } = await query<CalendarAutoJoinQueueRow>(
    `SELECT caj.id,
            caj.event_title,
            caj.video_url,
            caj.video_platform,
            caj.scheduled_at,
            caj.status,
            COALESCE(caj.bot_id, m.bot_id) AS bot_id,
            COALESCE(caj.meeting_id, m.id) AS meeting_id,
            COALESCE(caj.client_id, m.client_id, 'edro-internal') AS resolved_client_id,
            COALESCE(c.name,
                     CASE WHEN COALESCE(caj.client_id, m.client_id, 'edro-internal') = 'edro-internal'
                          THEN 'Reunião Interna Edro'
                          ELSE NULL END) AS resolved_client_name
       FROM calendar_auto_joins caj
       LEFT JOIN meetings m
         ON m.id = caj.meeting_id
        AND m.tenant_id = caj.tenant_id
       LEFT JOIN clients c
         ON c.id = COALESCE(caj.client_id, m.client_id)
        AND c.tenant_id = caj.tenant_id
      WHERE caj.id = $1
        AND caj.tenant_id = $2
      LIMIT 1`,
    [autoJoinId, tenantId],
  );

  return rows[0] ?? null;
}

async function enqueueRecoveredAutoJoin(tenantId: string, item: CalendarAutoJoinQueueRow) {
  if (!item.video_url || !item.scheduled_at) {
    throw new CalendarAutoJoinQueueError('auto_join_without_video_or_schedule');
  }

  const scheduledAt = new Date(item.scheduled_at);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new CalendarAutoJoinQueueError('auto_join_with_invalid_schedule');
  }

  if (!item.bot_id && scheduledAt.getTime() < Date.now() + 11 * 60 * 1000) {
    throw new CalendarAutoJoinQueueError(
      'Janela insuficiente para reagendar um novo bot. Use Meeting Ops para reprocessamento ou upload manual.',
    );
  }

  const internalClient = (!item.resolved_client_id || isInternalClientId(item.resolved_client_id))
    ? await ensureInternalClient(tenantId)
    : null;
  const clientId = internalClient?.id || item.resolved_client_id!;
  const clientName = internalClient?.name || item.resolved_client_name || 'Reunião Interna Edro';

  const job = await enqueueJob(tenantId, 'meet-bot', {
    videoUrl: item.video_url,
    eventTitle: item.event_title || 'Reunião',
    scheduledAt: scheduledAt.toISOString(),
    autoJoinId: item.id,
    source: 'google_calendar',
    platform: item.video_platform || 'other',
    clientId,
    clientName,
    meetingId: item.meeting_id || undefined,
  });

  await query(
    `UPDATE calendar_auto_joins
        SET status = 'queued',
            job_enqueued_at = now(),
            last_error = null,
            updated_at = now()
      WHERE id = $1
        AND tenant_id = $2`,
    [item.id, tenantId],
  );

  return {
    ok: true,
    job_id: job.id,
    mode: item.bot_id ? 'resume_existing_bot' : 'schedule_bot',
  };
}

export async function getCalendarAutoJoinQueueHealth(tenantId: string): Promise<CalendarAutoJoinQueueHealth> {
  const { rows } = await query<CalendarAutoJoinQueueHealth>(
    `SELECT COUNT(*) FILTER (WHERE caj.status = 'queued')::int AS queued,
            COUNT(*) FILTER (WHERE caj.status = 'processing')::int AS processing,
            COUNT(*) FILTER (WHERE caj.status = 'failed')::int AS failed,
            COUNT(*) FILTER (
              WHERE caj.status = 'failed'
                AND caj.video_url IS NOT NULL
                AND caj.scheduled_at IS NOT NULL
                AND caj.scheduled_at >= now() - interval '90 minutes'
                AND (
                  COALESCE(caj.bot_id, m.bot_id) IS NOT NULL
                  OR caj.scheduled_at >= now() + interval '11 minutes'
                )
            )::int AS recoverable_failed,
            COUNT(*) FILTER (
              WHERE caj.status IN ('queued', 'processing')
                AND caj.video_url IS NOT NULL
                AND caj.scheduled_at IS NOT NULL
                AND caj.scheduled_at >= now() - interval '90 minutes'
                AND caj.scheduled_at <= now() + interval '15 minutes'
                AND NOT EXISTS (
                  SELECT 1
                    FROM job_queue jq
                   WHERE jq.tenant_id = caj.tenant_id
                     AND jq.type IN ('meet-bot', 'meet-bot.finalize')
                     AND jq.status IN ('queued', 'processing')
                     AND COALESCE(jq.payload->>'autoJoinId', jq.payload->>'auto_join_id') = caj.id::text
                )
            )::int AS stale_without_job,
            MIN(caj.scheduled_at)::text FILTER (
              WHERE caj.status IN ('queued', 'processing')
                AND caj.video_url IS NOT NULL
                AND caj.scheduled_at IS NOT NULL
                AND caj.scheduled_at >= now() - interval '90 minutes'
                AND caj.scheduled_at <= now() + interval '15 minutes'
                AND NOT EXISTS (
                  SELECT 1
                    FROM job_queue jq
                   WHERE jq.tenant_id = caj.tenant_id
                     AND jq.type IN ('meet-bot', 'meet-bot.finalize')
                     AND jq.status IN ('queued', 'processing')
                     AND COALESCE(jq.payload->>'autoJoinId', jq.payload->>'auto_join_id') = caj.id::text
                )
            ) AS next_stale_scheduled_at
       FROM calendar_auto_joins caj
       LEFT JOIN meetings m
         ON m.id = caj.meeting_id
        AND m.tenant_id = caj.tenant_id
      WHERE caj.tenant_id = $1`,
    [tenantId],
  ).catch(() => ({
    rows: [{
      queued: 0,
      processing: 0,
      failed: 0,
      recoverable_failed: 0,
      stale_without_job: 0,
      next_stale_scheduled_at: null,
    }],
  }));

  return rows[0] ?? {
    queued: 0,
    processing: 0,
    failed: 0,
    recoverable_failed: 0,
    stale_without_job: 0,
    next_stale_scheduled_at: null,
  };
}

export async function requeueCalendarAutoJoinById(tenantId: string, autoJoinId: string) {
  const item = await loadAutoJoinQueueItem(tenantId, autoJoinId);
  if (!item) {
    throw new CalendarAutoJoinQueueError('auto_join_not_found', 404);
  }
  return enqueueRecoveredAutoJoin(tenantId, item);
}

export async function recoverCalendarAutoJoins(params: { tenantId: string; limit?: number }) {
  const limit = Math.max(1, Math.min(50, Number(params.limit || 20)));
  const { rows } = await query<CalendarAutoJoinQueueRow>(
    `SELECT caj.id,
            caj.event_title,
            caj.video_url,
            caj.video_platform,
            caj.scheduled_at,
            caj.status,
            COALESCE(caj.bot_id, m.bot_id) AS bot_id,
            COALESCE(caj.meeting_id, m.id) AS meeting_id,
            COALESCE(caj.client_id, m.client_id, 'edro-internal') AS resolved_client_id,
            COALESCE(c.name,
                     CASE WHEN COALESCE(caj.client_id, m.client_id, 'edro-internal') = 'edro-internal'
                          THEN 'Reunião Interna Edro'
                          ELSE NULL END) AS resolved_client_name
       FROM calendar_auto_joins caj
       LEFT JOIN meetings m
         ON m.id = caj.meeting_id
        AND m.tenant_id = caj.tenant_id
       LEFT JOIN clients c
         ON c.id = COALESCE(caj.client_id, m.client_id)
        AND c.tenant_id = caj.tenant_id
      WHERE caj.tenant_id = $1
        AND caj.video_url IS NOT NULL
        AND caj.scheduled_at IS NOT NULL
        AND caj.scheduled_at >= now() - interval '90 minutes'
        AND (
          caj.status = 'failed'
          OR (
            caj.status IN ('queued', 'processing')
            AND caj.scheduled_at <= now() + interval '15 minutes'
            AND NOT EXISTS (
              SELECT 1
                FROM job_queue jq
               WHERE jq.tenant_id = caj.tenant_id
                 AND jq.type IN ('meet-bot', 'meet-bot.finalize')
                 AND jq.status IN ('queued', 'processing')
                 AND COALESCE(jq.payload->>'autoJoinId', jq.payload->>'auto_join_id') = caj.id::text
            )
          )
        )
      ORDER BY caj.scheduled_at ASC
      LIMIT $2`,
    [params.tenantId, limit],
  );

  const result = {
    scanned: rows.length,
    recovered: 0,
    skipped_too_close: 0,
    failed: 0,
  };

  for (const item of rows) {
    try {
      await enqueueRecoveredAutoJoin(params.tenantId, item);
      result.recovered += 1;
    } catch (error: any) {
      if (error instanceof CalendarAutoJoinQueueError && error.message.includes('Janela insuficiente')) {
        result.skipped_too_close += 1;
        continue;
      }
      result.failed += 1;
    }
  }

  return result;
}
