/**
 * Google Calendar Service
 * OAuth2 + Calendar API watch for auto-detecting meetings with video links.
 *
 * ENV vars:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 *   GOOGLE_CALENDAR_REDIRECT_URI  — e.g. https://api.edro.digital/auth/google/calendar/callback
 *   GOOGLE_CALENDAR_WEBHOOK_URL   — e.g. https://api.edro.digital/webhook/google-calendar
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

// ── OAuth state helpers (signed to prevent forgery) ───────────────────────

function signOAuthState(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const secret = process.env.GOOGLE_CLIENT_SECRET ?? 'no-secret';
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyOAuthState(rawState: string): { tenantId: string } {
  const dotIndex = rawState.lastIndexOf('.');
  if (dotIndex < 0) throw new Error('Invalid OAuth state format');
  const data = rawState.slice(0, dotIndex);
  const sig = rawState.slice(dotIndex + 1);
  const secret = process.env.GOOGLE_CLIENT_SECRET ?? 'no-secret';
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  if (sig !== expected) throw new Error('Invalid OAuth state signature');
  return JSON.parse(Buffer.from(data, 'base64url').toString());
}

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
let hasClientContactEmailColumn: boolean | null = null;

// ── OAuth ─────────────────────────────────────────────────────────────────

export function calendarOAuthUrl(tenantId: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
  if (!clientId || !redirectUri) throw new Error('GOOGLE_CLIENT_ID/CALENDAR_REDIRECT_URI não configurados.');

  const state = signOAuthState({ tenantId, ts: Date.now() });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: [
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
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI!;

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
  const webhookUrl = process.env.GOOGLE_CALENDAR_WEBHOOK_URL;
  if (!webhookUrl) throw new Error('GOOGLE_CALENDAR_WEBHOOK_URL não configurado.');

  const { rows } = await query(
    `SELECT channel_id, access_token, refresh_token, token_expiry FROM google_calendar_channels WHERE tenant_id = $1`,
    [tenantId],
  );
  if (!rows.length) throw new Error('Calendário não configurado para este tenant.');

  const accessToken = await getCalendarAccessToken(tenantId);
  const channelId = rows[0].channel_id;

  // Calendar watch expires after 1 week max
  const expiration = Date.now() + 6 * 24 * 60 * 60 * 1000; // 6 days

  const res = await fetch(`${CALENDAR_API}/calendars/primary/events/watch`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: channelId,
      type: 'web_hook',
      address: webhookUrl,
      expiration: expiration.toString(),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Calendar watch failed: ${err.slice(0, 200)}`);
  }
  const data = await res.json() as { resourceId: string };

  await query(
    `UPDATE google_calendar_channels
     SET resource_id = $1, expires_at = $2
     WHERE tenant_id = $3`,
    [data.resourceId, new Date(expiration), tenantId],
  );
}

// ── Process calendar notification ─────────────────────────────────────────

export async function processCalendarNotification(channelId: string): Promise<void> {
  const { rows } = await query(
    `SELECT tenant_id FROM google_calendar_channels WHERE channel_id = $1`,
    [channelId],
  );
  if (!rows.length) return;

  const { tenant_id: tenantId } = rows[0];
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
    }),
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!eventsRes.ok) return;

  const eventsData = await eventsRes.json() as { items?: any[] };

  for (const event of eventsData.items ?? []) {
    try {
      await processCalendarEvent(tenantId, event);
    } catch (err: any) {
      console.error('[googleCalendarService] processEvent failed:', err?.message);
    }
  }
}

async function processCalendarEvent(tenantId: string, event: any) {
  const eventId = event.id as string;
  if (!eventId) return;

  const videoLink = extractVideoLink(event);
  if (!videoLink) return; // Not a video meeting, skip

  const scheduledAt = new Date(
    event.start?.dateTime ?? event.start?.date ?? Date.now(),
  );

  // Skip past events
  if (scheduledAt.getTime() < Date.now() - 5 * 60 * 1000) return;

  const platform = detectPlatform(videoLink);
  const organizer = event.organizer?.email ?? null;
  const attendees = (event.attendees ?? []).map((a: any) => ({
    email: a.email,
    displayName: a.displayName,
    responseStatus: a.responseStatus,
  }));

  const { rows: existing } = await query(
    `SELECT id, job_enqueued_at, meeting_id
       FROM calendar_auto_joins
      WHERE calendar_event_id = $1`,
    [eventId],
  );

  // Always upsert — handles both INSERT (new events) and UPDATE (changed events).
  // The ON CONFLICT DO UPDATE in upsertAutoJoin makes the separate UPDATE redundant.
  const autoJoinId = await upsertAutoJoin({
    tenantId,
    eventId,
    eventTitle: event.summary ?? 'Reunião',
    videoLink,
    platform,
    organizer,
    attendees,
    scheduledAt,
  });

  if (!autoJoinId) return;

  console.log(`[googleCalendarService] Detected video meeting: "${event.summary}" at ${scheduledAt.toISOString()} — ${platform} — ${videoLink}`);

  if (existing[0]?.job_enqueued_at || existing[0]?.meeting_id) return;

  const resolvedClient = await resolveClientForEvent(tenantId, event, attendees, organizer);
  if (!resolvedClient) {
    console.warn(`[googleCalendarService] No client match for "${event.summary}" (${eventId})`);
    return;
  }

  // Enqueue scheduling now; Recall handles the future join_at internally.
  await enqueueMeetBotJob(
    tenantId,
    autoJoinId,
    videoLink,
    event.summary ?? 'Reunião',
    scheduledAt,
    platform,
    resolvedClient,
  )
    .catch(err => console.error('[googleCalendarService] enqueueMeetBot failed:', err?.message));
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
  client: { id: string; name: string },
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
    `UPDATE calendar_auto_joins SET job_enqueued_at = now() WHERE id = $1`,
    [autoJoinId],
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
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
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

async function upsertAutoJoin(params: {
  tenantId: string;
  eventId: string;
  eventTitle: string;
  videoLink: string;
  platform: string;
  organizer: string | null;
  attendees: Array<{ email?: string; displayName?: string; responseStatus?: string }>;
  scheduledAt: Date;
}): Promise<string | null> {
  const { rows } = await query(
    `INSERT INTO calendar_auto_joins
       (tenant_id, calendar_event_id, event_title, video_url, video_platform,
        organizer_email, attendees, scheduled_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
     ON CONFLICT (calendar_event_id) DO UPDATE
       SET event_title = EXCLUDED.event_title,
           video_url = EXCLUDED.video_url,
           video_platform = EXCLUDED.video_platform,
           organizer_email = EXCLUDED.organizer_email,
           attendees = EXCLUDED.attendees,
           scheduled_at = EXCLUDED.scheduled_at
     RETURNING id`,
    [
      params.tenantId,
      params.eventId,
      params.eventTitle,
      params.videoLink,
      params.platform,
      params.organizer,
      JSON.stringify(params.attendees),
      params.scheduledAt,
    ],
  );

  return rows[0]?.id ?? null;
}

async function resolveClientForEvent(
  tenantId: string,
  event: any,
  attendees: Array<{ email?: string; displayName?: string }>,
  organizerEmail: string | null,
): Promise<{ id: string; name: string } | null> {
  const emails = [organizerEmail, ...attendees.map((a) => a.email)]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim().toLowerCase());

  if (emails.length && await clientsHaveContactEmailColumn()) {
    const { rows } = await query<{ id: string; name: string }>(
      `SELECT id, name
         FROM clients
        WHERE tenant_id = $1
          AND LOWER(contact_email) = ANY($2::text[])
        LIMIT 1`,
      [tenantId, emails],
    );
    if (rows[0]) return rows[0];
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

  let best: { id: string; name: string } | null = null;
  let bestScore = 0;

  for (const client of rows) {
    const needle = normalizeLooseText(client.name);
    if (!needle || needle.length < 3) continue;
    if (!haystack.includes(needle)) continue;
    if (needle.length <= bestScore) continue;
    best = client;
    bestScore = needle.length;
  }

  return best;
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
