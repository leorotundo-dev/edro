/**
 * Google Calendar Service
 * OAuth2 + Calendar API watch for auto-detecting meetings with video links.
 *
 * ENV vars:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 *   GOOGLE_CALENDAR_REDIRECT_URI  — e.g. https://edro-backend-production.up.railway.app/api/auth/google/calendar/callback
 *   GOOGLE_CALENDAR_WEBHOOK_URL   — e.g. https://api.edro.digital/webhook/google-calendar
 *   GOOGLE_CALENDAR_WEBHOOK_SECRET — signs X-Goog-Channel-Token per watch channel
 *
 * Flow:
 *   1. User authorizes Google Calendar OAuth
 *   2. watchCalendar() registers a push channel (channel_id, resource_id)
 *   3. Google POSTs to /webhook/google-calendar when calendar changes
 *   4. Handler calls processCalendarNotification() → fetch events → detect video links
 *   5. New meetings with video links → INSERT into calendar_auto_joins → enqueue meet-bot job
 */

import crypto from 'crypto';
import { query } from '../../db';
import { enqueueJob } from '../../jobs/jobQueue';
import { ensureInternalClient } from '../../repos/clientsRepo';
import { syncMeetingParticipantsFromCalendarPayload } from '../../repos/meetingParticipantsRepo';
import { updateMeetingState } from '../meetingService';
import { env } from '../../env';
import { logActivity } from '../integrationMonitor';

type ResolvedCalendarClient = {
  id: string;
  name: string;
  matchSource: string;
};

type CalendarChannelRow = {
  channel_id: string | null;
  resource_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expiry: string | null;
};

function buildCalendarTokenSignature(channelId: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(channelId).digest('base64url');
}

export function buildCalendarWebhookToken(channelId: string): string {
  const secret = env.GOOGLE_CALENDAR_WEBHOOK_SECRET || env.GOOGLE_CLIENT_SECRET;
  if (!secret) {
    throw new Error('GOOGLE_CALENDAR_WEBHOOK_SECRET/GOOGLE_CLIENT_SECRET não configurado.');
  }
  return buildCalendarTokenSignature(channelId, secret);
}

export function canValidateCalendarWebhookToken(): boolean {
  return Boolean(env.GOOGLE_CALENDAR_WEBHOOK_SECRET || env.GOOGLE_CLIENT_SECRET);
}

// ── OAuth state helpers (signed to prevent forgery) ───────────────────────

function signOAuthState(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const secret = env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error('GOOGLE_CLIENT_SECRET não configurado.');
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyOAuthState(rawState: string): { tenantId: string } {
  const dotIndex = rawState.lastIndexOf('.');
  if (dotIndex < 0) throw new Error('Invalid OAuth state format');
  const data = rawState.slice(0, dotIndex);
  const sig = rawState.slice(dotIndex + 1);
  const secret = env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error('GOOGLE_CLIENT_SECRET não configurado.');
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  if (sig !== expected) throw new Error('Invalid OAuth state signature');
  return JSON.parse(Buffer.from(data, 'base64url').toString());
}

function resolveCalendarRedirectUri(): string {
  if (env.GOOGLE_CALENDAR_REDIRECT_URI) {
    return env.GOOGLE_CALENDAR_REDIRECT_URI;
  }
  const publicBase = env.PUBLIC_API_URL?.replace(/\/+$/, '').replace(/\/api$/, '');
  if (!publicBase) {
    throw new Error('Configure GOOGLE_CALENDAR_REDIRECT_URI ou PUBLIC_API_URL para o OAuth do Google Calendar.');
  }
  return `${publicBase}/api/auth/google/calendar/callback`;
}

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
let hasClientContactEmailColumn: boolean | null = null;

// ── OAuth ─────────────────────────────────────────────────────────────────

export function calendarOAuthUrl(tenantId: string): string {
  const clientId = env.GOOGLE_CLIENT_ID;
  const redirectUri = resolveCalendarRedirectUri();
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID não configurado.');

  const state = signOAuthState({ tenantId, ts: Date.now() });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params}`;
}

export async function exchangeCalendarCode(code: string, rawState: string): Promise<{
  tenantId: string;
  email: string;
}> {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  const redirectUri = resolveCalendarRedirectUri();
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET não configurados.');
  }

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret,
      redirect_uri: redirectUri, grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Calendar token exchange failed: ${err.slice(0, 200)}`);
  }
  const tokens = await tokenRes.json() as {
    access_token: string; refresh_token?: string; expires_in: number;
  };

  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = await userRes.json() as { email: string };

  let tenantId: string;
  try {
    tenantId = verifyOAuthState(rawState).tenantId;
  } catch {
    throw new Error('Invalid OAuth state');
  }

  const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);
  const channelId = crypto.randomUUID();

  await query(
    `INSERT INTO google_calendar_channels
       (tenant_id, channel_id, email_address, access_token, refresh_token, token_expiry)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (tenant_id) DO UPDATE
       SET channel_id = $2, email_address = $3, access_token = $4,
           refresh_token = COALESCE($5, google_calendar_channels.refresh_token),
           token_expiry = $6`,
    [tenantId, channelId, userInfo.email, tokens.access_token, tokens.refresh_token ?? null, tokenExpiry],
  );

  return { tenantId, email: userInfo.email };
}

// ── Calendar watch ────────────────────────────────────────────────────────

export async function watchCalendar(tenantId: string): Promise<void> {
  const webhookUrl = env.GOOGLE_CALENDAR_WEBHOOK_URL;
  if (!webhookUrl) throw new Error('GOOGLE_CALENDAR_WEBHOOK_URL não configurado.');

  const { rows } = await query<CalendarChannelRow>(
    `SELECT channel_id, resource_id, access_token, refresh_token, token_expiry
       FROM google_calendar_channels
      WHERE tenant_id = $1`,
    [tenantId],
  );
  if (!rows.length) throw new Error('Calendário não configurado para este tenant.');

  const accessToken = await getCalendarAccessToken(tenantId);
  const currentChannelId = rows[0].channel_id;
  const currentResourceId = rows[0].resource_id;
  const nextChannelId = crypto.randomUUID();

  // Calendar watch expires after 1 week max
  const expiration = Date.now() + 6 * 24 * 60 * 60 * 1000; // 6 days
  const channelToken = buildCalendarWebhookToken(nextChannelId);

  try {
    // Google Calendar rejects reused channel IDs while an older watch is still alive.
    // Stop the previous channel best-effort, then create a fresh one for every renewal.
    await stopCalendarChannel(accessToken, currentChannelId, currentResourceId);

    const res = await fetch(`${CALENDAR_API}/calendars/primary/events/watch`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: nextChannelId,
        token: channelToken,
        type: 'web_hook',
        address: webhookUrl,
        expiration: expiration.toString(),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      await markCalendarWatchFailure(tenantId, `Calendar watch failed: ${err.slice(0, 200)}`);
      throw new Error(`Calendar watch failed: ${err.slice(0, 200)}`);
    }

    const data = await res.json() as { resourceId: string };

    await query(
      `UPDATE google_calendar_channels
          SET channel_id = $1,
              resource_id = $2,
              expires_at = $3,
              last_watch_renewed_at = now(),
              last_watch_error = NULL,
              watch_status = 'active',
              updated_at = now()
        WHERE tenant_id = $4`,
      [nextChannelId, data.resourceId, new Date(expiration), tenantId],
    );

    logActivity({
      tenantId,
      service: 'google_calendar',
      event: 'watch_renewed',
      status: 'ok',
      meta: {
        channel_id: nextChannelId,
        resource_id: data.resourceId,
        expires_at: new Date(expiration).toISOString(),
      },
    });
  } catch (error: any) {
    await markCalendarWatchFailure(tenantId, error?.message ?? 'calendar_watch_failed').catch(() => {});
    logActivity({
      tenantId,
      service: 'google_calendar',
      event: 'watch_renewed',
      status: 'error',
      errorMsg: error?.message ?? 'calendar_watch_failed',
    });
    throw error;
  }
}

export async function disconnectCalendar(tenantId: string): Promise<void> {
  try {
    const accessToken = await getCalendarAccessToken(tenantId);
    const { rows } = await query<CalendarChannelRow>(
      `SELECT channel_id, resource_id
         FROM google_calendar_channels
        WHERE tenant_id = $1`,
      [tenantId],
    );

    if (rows[0]) {
      await stopCalendarChannel(accessToken, rows[0].channel_id, rows[0].resource_id);
    }
  } catch (error: any) {
    console.warn('[googleCalendarService] disconnect stop failed:', error?.message);
  }

  await query(`DELETE FROM google_calendar_channels WHERE tenant_id = $1`, [tenantId]);
}

// ── Process calendar notification ─────────────────────────────────────────

export async function processCalendarNotification(channelId: string, resourceState?: string): Promise<void> {
  const { rows } = await query(
    `SELECT tenant_id FROM google_calendar_channels WHERE channel_id = $1`,
    [channelId],
  );
  if (!rows.length) return;

  const { tenant_id: tenantId } = rows[0];
  await query(
    `UPDATE google_calendar_channels
        SET last_notification_at = now(),
            last_notification_state = $2,
            watch_status = 'active',
            updated_at = now()
      WHERE tenant_id = $1`,
    [tenantId, resourceState ?? null],
  ).catch(() => {});

  try {
    const accessToken = await getCalendarAccessToken(tenantId);

    // Fetch events in the next 48 hours
    const now = new Date();
    const tomorrow48 = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const eventsRes = await fetch(
      `${CALENDAR_API}/calendars/primary/events?` +
      new URLSearchParams({
        timeMin: now.toISOString(),
        timeMax: tomorrow48.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        showDeleted: 'true',
      }),
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!eventsRes.ok) {
      const err = await eventsRes.text().catch(() => '');
      throw new Error(`calendar_notification_fetch_failed: ${err.slice(0, 200)}`);
    }

    const eventsData = await eventsRes.json() as { items?: any[] };
    const events = eventsData.items ?? [];

    for (const event of events) {
      try {
        await processCalendarEvent(tenantId, event);
      } catch (err: any) {
        console.error('[googleCalendarService] processEvent failed:', err?.message);
      }
    }

    logActivity({
      tenantId,
      service: 'google_calendar',
      event: 'sync',
      status: 'ok',
      records: events.length,
      meta: {
        channel_id: channelId,
        resource_state: resourceState ?? null,
      },
    });
  } catch (error: any) {
    logActivity({
      tenantId,
      service: 'google_calendar',
      event: 'sync',
      status: 'error',
      errorMsg: error?.message ?? 'calendar_sync_failed',
      meta: {
        channel_id: channelId,
        resource_state: resourceState ?? null,
      },
    });
    throw error;
  }
}

async function processCalendarEvent(tenantId: string, event: any) {
  const eventId = event.id as string;
  if (!eventId) return;

  if (event.status === 'cancelled') {
    await syncCancelledCalendarEvent(tenantId, eventId);
    return;
  }

  const videoLink = extractVideoLink(event);
  if (!videoLink) return; // Not a video meeting, skip

  const scheduledAt = new Date(
    event.start?.dateTime ?? event.start?.date ?? Date.now(),
  );

  // Skip past events
  if (scheduledAt.getTime() < Date.now() - 5 * 60 * 1000) return;

  const platform = detectPlatform(videoLink);
  const organizer = event.organizer?.email ?? null;
  const organizerName = event.organizer?.displayName ?? null;
  const attendees = (event.attendees ?? []).map((a: any) => ({
    email: a.email,
    displayName: a.displayName,
    responseStatus: a.responseStatus,
  }));

  const { rows: existing } = await query(
    `SELECT id, job_enqueued_at, meeting_id, client_id, status, attendees
       FROM calendar_auto_joins
      WHERE calendar_event_id = $1`,
    [eventId],
  );

  // Always upsert — handles both INSERT (new events) and UPDATE (changed events).
  // The ON CONFLICT DO UPDATE in upsertAutoJoin makes the separate UPDATE redundant.
  const autoJoin = await upsertAutoJoin({
    tenantId,
    eventId,
    eventTitle: event.summary ?? 'Reunião',
    videoLink,
    platform,
    organizer,
    organizerName,
    attendees,
    scheduledAt,
  });

  if (!autoJoin?.id) return;

  const linkedMeetingId = autoJoin.meetingId ?? existing[0]?.meeting_id ?? null;
  const linkedClientId = autoJoin.clientId ?? existing[0]?.client_id ?? null;
  if (linkedMeetingId && linkedClientId) {
    const attendeeChanges = collectAttendeeResponseChanges(existing[0]?.attendees, attendees);

    await syncLinkedMeetingFromCalendarEvent({
      tenantId,
      meetingId: linkedMeetingId,
      clientId: linkedClientId,
      eventId,
      title: event.summary ?? 'Reunião',
      videoLink,
      scheduledAt,
    }).catch((err) => console.error('[googleCalendarService] syncLinkedMeeting failed:', err?.message));

    await syncMeetingParticipantsFromCalendarPayload({
      meetingId: linkedMeetingId,
      tenantId,
      clientId: linkedClientId,
      organizerEmail: organizer,
      organizerName,
      attendees,
      calendarEventId: eventId,
    }).catch((err) => console.error('[googleCalendarService] syncMeetingParticipants failed:', err?.message));

    if (attendeeChanges.length) {
      await notifyMeetingAttendanceChanges({
        tenantId,
        clientId: linkedClientId,
        meetingId: linkedMeetingId,
        title: event.summary ?? 'Reunião',
        changes: attendeeChanges,
      }).catch((err) => console.error('[googleCalendarService] notifyMeetingAttendanceChanges failed:', err?.message));
    }
  }

  console.log(`[googleCalendarService] Detected video meeting: "${event.summary}" at ${scheduledAt.toISOString()} — ${platform} — ${videoLink}`);

  // Skip only if the meeting completed successfully or if a bot is currently in-flight.
  // Allow re-scheduling when the previous bot failed (status = 'failed').
  const prevStatus = existing[0]?.status as string | undefined;
  const inFlight = prevStatus && !['failed', 'detected'].includes(prevStatus);
  if (inFlight) return;

  const resolvedClient = await resolveClientForEvent(tenantId, event, attendees, organizer);
  if (!resolvedClient) {
    console.log(`[googleCalendarService] No client match for "${event.summary}" — joining as internal Edro meeting`);
  }

  // Always enqueue — for internal Edro meetings we still want Jarvis to transcribe and analyze.
  const client = resolvedClient ?? await buildInternalCalendarClient(tenantId);

  await enqueueMeetBotJob(
    tenantId,
    autoJoin.id,
    videoLink,
    event.summary ?? 'Reunião',
    scheduledAt,
    platform,
    client,
  )
    .catch(err => console.error('[googleCalendarService] enqueueMeetBot failed:', err?.message));
}

async function syncLinkedMeetingFromCalendarEvent(params: {
  tenantId: string;
  meetingId: string;
  clientId: string;
  eventId: string;
  title: string;
  videoLink: string;
  scheduledAt: Date;
}) {
  await updateMeetingState({
    meetingId: params.meetingId,
    tenantId: params.tenantId,
    changes: {
      title: params.title,
      meeting_url: params.videoLink,
      recorded_at: params.scheduledAt,
    },
    event: {
      eventType: 'meeting.synced_from_calendar',
      stage: 'meeting',
      status: 'scheduled',
      message: 'Reunião sincronizada a partir do Google Calendar.',
      actorType: 'system',
      actorId: 'google_calendar',
      payload: {
        calendar_event_id: params.eventId,
        scheduled_at: params.scheduledAt.toISOString(),
      },
    },
  }).catch(() => null);

  await query(
    `UPDATE calendar_auto_joins
        SET event_title = $1,
            video_url = $2,
            scheduled_at = $3,
            status = CASE WHEN status = 'cancelled' THEN 'queued' ELSE status END,
            last_error = NULL,
            updated_at = now()
      WHERE tenant_id = $4
        AND calendar_event_id = $5`,
    [params.title, params.videoLink, params.scheduledAt, params.tenantId, params.eventId],
  ).catch(() => null);
}

async function syncCancelledCalendarEvent(tenantId: string, eventId: string) {
  const { rows } = await query<{
    meeting_id: string;
    client_id: string;
    status: string | null;
  }>(
    `SELECT DISTINCT
        m.id::text AS meeting_id,
        m.client_id,
        m.status
       FROM meetings m
       LEFT JOIN calendar_auto_joins caj
         ON caj.meeting_id = m.id
      WHERE m.tenant_id = $1
        AND (
          m.source_ref_id = $2
          OR caj.calendar_event_id = $2
        )`,
    [tenantId, eventId],
  ).catch(() => ({ rows: [] as Array<{ meeting_id: string; client_id: string; status: string | null }> }));

  await query(
    `UPDATE calendar_auto_joins
        SET status = 'cancelled',
            last_error = 'cancelled_in_google_calendar',
            updated_at = now()
      WHERE tenant_id = $1
        AND calendar_event_id = $2`,
    [tenantId, eventId],
  ).catch(() => null);

  for (const row of rows) {
    if (!row.client_id || ['completed', 'archived'].includes(String(row.status || '').toLowerCase())) {
      continue;
    }

    await updateMeetingState({
      meetingId: row.meeting_id,
      tenantId,
      changes: {
        status: 'archived',
        failed_stage: 'calendar_detect',
        failed_reason: 'cancelled_in_google_calendar',
        completed_at: new Date(),
        last_processed_at: new Date(),
      },
      event: {
        eventType: 'meeting.cancelled_in_calendar',
        stage: 'meeting',
        status: 'archived',
        message: 'Reunião cancelada diretamente no Google Calendar.',
        actorType: 'system',
        actorId: 'google_calendar',
        payload: {
          calendar_event_id: eventId,
        },
      },
    }).catch(() => null);

    await query(
      `UPDATE job_queue
          SET status = 'failed',
              error_message = 'meeting_cancelled_in_google_calendar',
              payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb,
              updated_at = NOW()
        WHERE tenant_id = $1::uuid
          AND type = 'meet-bot'
          AND status = 'queued'
          AND (payload->>'meetingId' = $2 OR payload->>'meeting_id' = $2)`,
      [tenantId, row.meeting_id, JSON.stringify({ cancelled_in_google_calendar: true, calendar_event_id: eventId })],
    ).catch(() => null);
  }
}

type AttendeeResponseChange = {
  email: string;
  displayName: string | null;
  previous: string;
  next: string;
};

function normalizeResponseStatus(value?: string | null) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || 'needsaction';
}

function collectAttendeeResponseChanges(
  previousAttendees: Array<{ email?: string; displayName?: string; responseStatus?: string }> | null | undefined,
  nextAttendees: Array<{ email?: string; displayName?: string; responseStatus?: string }>,
): AttendeeResponseChange[] {
  const previousMap = new Map(
    (Array.isArray(previousAttendees) ? previousAttendees : [])
      .map((attendee) => [String(attendee?.email || '').trim().toLowerCase(), attendee] as const)
      .filter(([email]) => Boolean(email)),
  );

  return nextAttendees
    .map((attendee) => {
      const email = String(attendee?.email || '').trim().toLowerCase();
      if (!email) return null;
      const previous = previousMap.get(email);
      const previousStatus = normalizeResponseStatus(previous?.responseStatus);
      const nextStatus = normalizeResponseStatus(attendee?.responseStatus);
      if (previousStatus === nextStatus) return null;
      return {
        email,
        displayName: attendee?.displayName?.trim() || previous?.displayName?.trim() || null,
        previous: previousStatus,
        next: nextStatus,
      } satisfies AttendeeResponseChange;
    })
    .filter((item): item is AttendeeResponseChange => Boolean(item))
    .slice(0, 5);
}

function describeResponseStatus(value: string) {
  switch (normalizeResponseStatus(value)) {
    case 'accepted': return 'aceitou';
    case 'declined': return 'recusou';
    case 'tentative': return 'ficou como talvez';
    default: return 'ainda não respondeu';
  }
}

async function notifyMeetingAttendanceChanges(params: {
  tenantId: string;
  clientId: string;
  meetingId: string;
  title: string;
  changes: AttendeeResponseChange[];
}) {
  if (!params.changes.length) return;

  const { notifyEvent } = await import('../notificationService');
  const { rows: admins } = await query<{ id: string; email: string }>(
    `SELECT eu.id::text AS id, eu.email
       FROM edro_users eu
       JOIN tenant_users tu ON tu.user_id = eu.id
      WHERE tu.tenant_id = $1
        AND tu.role IN ('admin', 'owner')
      LIMIT 5`,
    [params.tenantId],
  ).catch(() => ({ rows: [] as Array<{ id: string; email: string }> }));

  if (!admins.length) return;

  const body = params.changes
    .map((change) => `${change.displayName || change.email} ${describeResponseStatus(change.next)}`)
    .join(' · ');

  await Promise.allSettled(
    admins.map((admin) =>
      notifyEvent({
        event: 'jarvis_meeting_rsvp_changed',
        tenantId: params.tenantId,
        userId: admin.id,
        recipientEmail: admin.email,
        title: `RSVP mudou: ${params.title}`,
        body,
        link: `/clients/${params.clientId}/meetings`,
        payload: {
          meeting_id: params.meetingId,
          changes: params.changes,
        },
        defaultChannels: ['in_app'],
      }),
    ),
  );
}

async function buildInternalCalendarClient(tenantId: string): Promise<ResolvedCalendarClient> {
  const internalClient = await ensureInternalClient(tenantId);
  return {
    id: internalClient.id,
    name: internalClient.name,
    matchSource: 'fallback_internal',
  };
}

// ── Video link extraction ─────────────────────────────────────────────────

function extractVideoLink(event: any): string | null {
  // Google Meet (hangoutLink field)
  if (event.hangoutLink) return event.hangoutLink;

  // Check conference data
  for (const ep of event.conferenceData?.entryPoints ?? []) {
    if (ep.entryPointType === 'video' && ep.uri) return ep.uri;
  }

  // Scan description for Zoom / Teams links
  const description = event.description ?? '';
  const location = event.location ?? '';
  const text = `${description} ${location}`;

  const zoomMatch = text.match(/https?:\/\/[\w.]*zoom\.us\/j\/[^\s"<>]+/);
  if (zoomMatch) return zoomMatch[0];

  const teamsMatch = text.match(/https?:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s"<>]+/);
  if (teamsMatch) return teamsMatch[0];

  return null;
}

function detectPlatform(url: string): string {
  if (url.includes('meet.google.com') || url.includes('hangouts.google.com')) return 'meet';
  if (url.includes('zoom.us')) return 'zoom';
  if (url.includes('teams.microsoft.com')) return 'teams';
  return 'other';
}

// ── Enqueue meet-bot job ──────────────────────────────────────────────────

async function enqueueMeetBotJob(
  tenantId: string,
  autoJoinId: string,
  videoUrl: string,
  eventTitle: string,
  scheduledAt: Date,
  platform: string,
  client: ResolvedCalendarClient,
): Promise<void> {
  const row = await enqueueJob(
    tenantId,
    'meet-bot',
    {
      videoUrl,
      eventTitle,
      scheduledAt: scheduledAt.toISOString(),
      autoJoinId,
      source: 'google_calendar',
      platform,
      clientId: client.id,
      clientName: client.name,
    },
  );

  await query(
    `UPDATE calendar_auto_joins
        SET job_enqueued_at = now(),
            client_id = $2,
            client_match_source = $3,
            status = 'queued',
            updated_at = now()
      WHERE id = $1`,
    [autoJoinId, client.id, client.matchSource],
  );

  console.log(`[googleCalendarService] Enqueued meet-bot job ${row?.id} for "${eventTitle}"`);
}

// ── Token refresh ─────────────────────────────────────────────────────────

export async function getCalendarAccessToken(tenantId: string): Promise<string> {
  const { rows } = await query(
    `SELECT access_token, refresh_token, token_expiry FROM google_calendar_channels WHERE tenant_id = $1`,
    [tenantId],
  );
  if (!rows.length) throw new Error('Google Calendar não configurado para este tenant.');

  const { access_token, refresh_token, token_expiry } = rows[0];

  if (token_expiry && new Date(token_expiry).getTime() > Date.now() + 120_000) {
    return access_token;
  }

  if (!refresh_token) throw new Error('Refresh token não disponível. Reconecte o Google Calendar.');

  const refreshRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  if (!refreshRes.ok) throw new Error('Falha ao renovar token Google Calendar.');
  const newTokens = await refreshRes.json() as { access_token: string; expires_in: number };

  const newExpiry = new Date(Date.now() + newTokens.expires_in * 1000);
  await query(
    `UPDATE google_calendar_channels SET access_token = $1, token_expiry = $2 WHERE tenant_id = $3`,
    [newTokens.access_token, newExpiry, tenantId],
  );

  return newTokens.access_token;
}

// ── Create Google Meet via Calendar API ────────────────────────────────────

export async function createCalendarMeeting(params: {
  tenantId: string;
  title: string;
  startAt: Date;
  durationMinutes?: number;
  attendeeEmails?: string[];
  description?: string;
  clientId?: string | null;
  clientName?: string | null;
}): Promise<{
  eventId: string;
  meetUrl: string;
  htmlLink: string;
  endAt: Date;
  organizerEmail: string | null;
  organizerName: string | null;
  attendees: Array<{ email?: string; displayName?: string; responseStatus?: string }>;
}> {
  const accessToken = await getCalendarAccessToken(params.tenantId);

  const durationMs = (params.durationMinutes ?? 60) * 60_000;
  const startAt = params.startAt;
  const endAt = new Date(startAt.getTime() + durationMs);

  const body = {
    summary: params.title,
    description: params.description ?? '',
    start: { dateTime: startAt.toISOString() },
    end: { dateTime: endAt.toISOString() },
    attendees: (params.attendeeEmails ?? []).map((email) => ({ email })),
    extendedProperties: {
      private: {
        edro_tenant_id: params.tenantId,
        edro_client_id: params.clientId ?? '',
        edro_client_name: params.clientName ?? '',
        edro_source: 'edro_calendar',
      },
    },
    conferenceData: {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  const res = await fetch(
    `${CALENDAR_API}/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Google Calendar createEvent failed (${res.status}): ${err.slice(0, 300)}`);
  }

  const event = await res.json() as any;
  const meetUrl = event.hangoutLink as string | undefined;
  if (!meetUrl) {
    throw new Error('Google Meet link não foi gerado. Verifique se o Google Meet está habilitado na conta.');
  }

  return {
    eventId: event.id,
    meetUrl,
    htmlLink: event.htmlLink ?? '',
    endAt,
    organizerEmail: event.organizer?.email ?? null,
    organizerName: event.organizer?.displayName ?? null,
    attendees: Array.isArray(event.attendees)
      ? event.attendees.map((attendee: any) => ({
          email: attendee?.email ?? null,
          displayName: attendee?.displayName ?? null,
          responseStatus: attendee?.responseStatus ?? null,
        }))
      : [],
  };
}

export async function createCalendarEvent(params: {
  tenantId: string;
  title: string;
  eventDate: string;
  description?: string | null;
  clientId?: string | null;
  clientName?: string | null;
}): Promise<{ eventId: string; htmlLink: string }> {
  const accessToken = await getCalendarAccessToken(params.tenantId);
  const body = {
    summary: params.title,
    description: params.description ?? '',
    start: { date: params.eventDate },
    end: { date: params.eventDate },
    extendedProperties: {
      private: {
        edro_tenant_id: params.tenantId,
        edro_client_id: params.clientId ?? '',
        edro_client_name: params.clientName ?? '',
        edro_source: 'edro_calendar_event',
      },
    },
  };

  const res = await fetch(`${CALENDAR_API}/calendars/primary/events?sendUpdates=all`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Google Calendar createCalendarEvent failed (${res.status}): ${err.slice(0, 300)}`);
  }

  const event = await res.json() as any;
  return { eventId: event.id, htmlLink: event.htmlLink ?? '' };
}

export async function updateCalendarMeeting(params: {
  tenantId: string;
  eventId: string;
  title: string;
  startAt: Date;
  durationMinutes?: number;
  description?: string | null;
  attendeeEmails?: string[];
}): Promise<{
  eventId: string;
  meetUrl: string | null;
  htmlLink: string;
  endAt: Date;
  organizerEmail: string | null;
  organizerName: string | null;
  attendees: Array<{ email?: string; displayName?: string; responseStatus?: string }>;
}> {
  const accessToken = await getCalendarAccessToken(params.tenantId);
  const durationMs = (params.durationMinutes ?? 60) * 60_000;
  const endAt = new Date(params.startAt.getTime() + durationMs);
  const body: Record<string, unknown> = {
    summary: params.title,
    description: params.description ?? '',
    start: { dateTime: params.startAt.toISOString() },
    end: { dateTime: endAt.toISOString() },
  };
  if (params.attendeeEmails) {
    body.attendees = params.attendeeEmails.map((email) => ({ email }));
  }

  const res = await fetch(
    `${CALENDAR_API}/calendars/primary/events/${encodeURIComponent(params.eventId)}?sendUpdates=all`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Google Calendar updateMeeting failed (${res.status}): ${err.slice(0, 300)}`);
  }

  const event = await res.json() as any;
  return {
    eventId: event.id,
    meetUrl: event.hangoutLink ?? null,
    htmlLink: event.htmlLink ?? '',
    endAt,
    organizerEmail: event.organizer?.email ?? null,
    organizerName: event.organizer?.displayName ?? null,
    attendees: Array.isArray(event.attendees)
      ? event.attendees.map((attendee: any) => ({
          email: attendee?.email ?? null,
          displayName: attendee?.displayName ?? null,
          responseStatus: attendee?.responseStatus ?? null,
        }))
      : [],
  };
}

export async function deleteCalendarEvent(params: {
  tenantId: string;
  eventId: string;
}): Promise<void> {
  const accessToken = await getCalendarAccessToken(params.tenantId);
  const res = await fetch(
    `${CALENDAR_API}/calendars/primary/events/${encodeURIComponent(params.eventId)}?sendUpdates=all`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!res.ok && res.status !== 404) {
    const err = await res.text().catch(() => '');
    throw new Error(`Google Calendar deleteEvent failed (${res.status}): ${err.slice(0, 300)}`);
  }
}

export async function findCalendarConflicts(params: {
  tenantId: string;
  startAt: Date;
  endAt: Date;
  excludeEventId?: string | null;
}): Promise<Array<{ eventId: string; title: string; startAt: string | null }>> {
  const accessToken = await getCalendarAccessToken(params.tenantId);
  const excludeEventId = String(params.excludeEventId || '').trim();

  const res = await fetch(
    `${CALENDAR_API}/calendars/primary/events?` + new URLSearchParams({
      timeMin: params.startAt.toISOString(),
      timeMax: params.endAt.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
    }),
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Google Calendar listEvents failed (${res.status}): ${err.slice(0, 300)}`);
  }

  const data = await res.json() as { items?: any[] };
  const items = Array.isArray(data.items) ? data.items : [];
  return items
    .filter((item) => item?.status !== 'cancelled')
    .filter((item) => String(item?.id || '').trim() !== excludeEventId)
    .map((item) => ({
      eventId: String(item?.id || '').trim(),
      title: String(item?.summary || 'Evento no Google Calendar').trim() || 'Evento no Google Calendar',
      startAt: item?.start?.dateTime || item?.start?.date || null,
    }))
    .slice(0, 5);
}

export async function findAttendeeBusyConflicts(params: {
  tenantId: string;
  startAt: Date;
  endAt: Date;
  attendeeEmails: string[];
}): Promise<Array<{ email: string; startAt: string | null; endAt: string | null }>> {
  const attendeeEmails = Array.from(new Set(
    params.attendeeEmails
      .map((email) => String(email || '').trim().toLowerCase())
      .filter(Boolean),
  )).slice(0, 10);
  if (!attendeeEmails.length) return [];

  const accessToken = await getCalendarAccessToken(params.tenantId);
  const res = await fetch(`${CALENDAR_API}/freeBusy`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin: params.startAt.toISOString(),
      timeMax: params.endAt.toISOString(),
      items: attendeeEmails.map((email) => ({ id: email })),
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Google Calendar freeBusy failed (${res.status}): ${err.slice(0, 300)}`);
  }

  const data = await res.json() as {
    calendars?: Record<string, { busy?: Array<{ start?: string; end?: string }> }>;
  };
  const calendars = data.calendars ?? {};

  return attendeeEmails.flatMap((email) => {
    const busySlots = Array.isArray(calendars[email]?.busy) ? calendars[email]!.busy! : [];
    if (!busySlots.length) return [];
    const firstBusy = busySlots[0];
    return [{
      email,
      startAt: firstBusy?.start ?? null,
      endAt: firstBusy?.end ?? null,
    }];
  }).slice(0, 5);
}

async function upsertAutoJoin(params: {
  tenantId: string;
  eventId: string;
  eventTitle: string;
  videoLink: string;
  platform: string;
  organizer: string | null;
  organizerName: string | null;
  attendees: Array<{ email?: string; displayName?: string; responseStatus?: string }>;
  scheduledAt: Date;
}): Promise<{ id: string; meetingId: string | null; clientId: string | null } | null> {
  const { rows } = await query<{
    id: string;
    meeting_id: string | null;
    client_id: string | null;
  }>(
    `INSERT INTO calendar_auto_joins
       (tenant_id, calendar_event_id, event_title, video_url, video_platform,
        organizer_email, organizer_name, attendees, scheduled_at, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, 'detected')
     ON CONFLICT (calendar_event_id) DO UPDATE
       SET event_title = EXCLUDED.event_title,
           video_url = EXCLUDED.video_url,
           video_platform = EXCLUDED.video_platform,
           organizer_email = EXCLUDED.organizer_email,
           organizer_name = EXCLUDED.organizer_name,
           attendees = EXCLUDED.attendees,
           scheduled_at = EXCLUDED.scheduled_at,
           updated_at = now()
     RETURNING id, meeting_id::text, client_id`,
    [
      params.tenantId,
      params.eventId,
      params.eventTitle,
      params.videoLink,
      params.platform,
      params.organizer,
      params.organizerName,
      JSON.stringify(params.attendees),
      params.scheduledAt,
    ],
  );

  if (!rows[0]) return null;
  return {
    id: rows[0].id,
    meetingId: rows[0].meeting_id,
    clientId: rows[0].client_id,
  };
}

async function resolveClientForEvent(
  tenantId: string,
  event: any,
  attendees: Array<{ email?: string; displayName?: string }>,
  organizerEmail: string | null,
): Promise<ResolvedCalendarClient | null> {
  const explicit = await extractExplicitClientReference(tenantId, event);
  if (explicit) return explicit;

  const emails = [organizerEmail, ...attendees.map((a) => a.email)]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim().toLowerCase());

  if (emails.length) {
    const { rows } = await query<{ id: string; name: string }>(
      `SELECT c.id, c.name
         FROM client_contacts cc
         JOIN clients c ON c.id = cc.client_id
        WHERE cc.tenant_id = $1
          AND cc.active = true
          AND cc.email IS NOT NULL
          AND LOWER(cc.email) = ANY($2::text[])
        ORDER BY cc.is_primary DESC, cc.updated_at DESC
        LIMIT 1`,
      [tenantId, emails],
    ).catch(() => ({ rows: [] as Array<{ id: string; name: string }> }));
    if (rows[0]) {
      return {
        id: rows[0].id,
        name: rows[0].name,
        matchSource: 'client_contact_email',
      };
    }
  }

  if (emails.length && await clientsHaveContactEmailColumn()) {
    const { rows } = await query<{ id: string; name: string }>(
      `SELECT id, name
         FROM clients
        WHERE tenant_id = $1
          AND LOWER(contact_email) = ANY($2::text[])
        LIMIT 1`,
      [tenantId, emails],
    );
    if (rows[0]) {
      return {
        id: rows[0].id,
        name: rows[0].name,
        matchSource: 'client_email',
      };
    }
  }

  const haystack = normalizeLooseText([
    event.summary,
    event.description,
    organizerEmail,
    ...attendees.flatMap((a) => [a.displayName, a.email]),
  ].filter(Boolean).join(' '));

  if (!haystack) return null;

  const { rows } = await query<{ id: string; name: string }>(
    `SELECT id, name FROM clients WHERE tenant_id = $1`,
    [tenantId],
  );

  let best: ResolvedCalendarClient | null = null;
  let bestScore = 0;

  for (const client of rows) {
    const needle = normalizeLooseText(client.name);
    if (!needle || needle.length < 3) continue;
    if (!haystack.includes(needle)) continue;
    if (needle.length <= bestScore) continue;
    best = {
      id: client.id,
      name: client.name,
      matchSource: 'client_name',
    };
    bestScore = needle.length;
  }

  return best;
}

async function extractExplicitClientReference(
  tenantId: string,
  event: any,
): Promise<ResolvedCalendarClient | null> {
  const privateProps = event?.extendedProperties?.private ?? {};
  const explicitClientId = String(
    privateProps.edro_client_id ??
    privateProps.client_id ??
    '',
  ).trim();

  if (!explicitClientId) return null;

  const { rows } = await query<{ id: string; name: string }>(
    `SELECT id, name
       FROM clients
      WHERE tenant_id = $1
        AND id = $2
      LIMIT 1`,
    [tenantId, explicitClientId],
  ).catch(() => ({ rows: [] as Array<{ id: string; name: string }> }));

  if (!rows[0]) return null;

  return {
    id: rows[0].id,
    name: rows[0].name,
    matchSource: 'event_private_client_id',
  };
}

async function markCalendarWatchFailure(tenantId: string, message: string): Promise<void> {
  await query(
    `UPDATE google_calendar_channels
        SET last_watch_error = $2,
            watch_status = 'error',
            updated_at = now()
      WHERE tenant_id = $1`,
    [tenantId, message.slice(0, 500)],
  ).catch(() => {});
}

async function stopCalendarChannel(
  accessToken: string,
  channelId: string | null,
  resourceId: string | null,
): Promise<void> {
  if (!channelId || !resourceId) return;

  const res = await fetch(`${CALENDAR_API}/channels/stop`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: channelId,
      resourceId,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    console.warn(`[googleCalendarService] stop channel failed for ${channelId}: ${err.slice(0, 200)}`);
  }
}

async function clientsHaveContactEmailColumn(): Promise<boolean> {
  if (hasClientContactEmailColumn !== null) return hasClientContactEmailColumn;

  const { rows } = await query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'clients'
          AND column_name = 'contact_email'
     ) AS exists`,
  );

  hasClientContactEmailColumn = Boolean(rows[0]?.exists);
  return hasClientContactEmailColumn;
}

function normalizeLooseText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
