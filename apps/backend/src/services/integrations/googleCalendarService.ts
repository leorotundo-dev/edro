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

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

// ── OAuth ─────────────────────────────────────────────────────────────────

export function calendarOAuthUrl(tenantId: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
  if (!clientId || !redirectUri) throw new Error('GOOGLE_CLIENT_ID/CALENDAR_REDIRECT_URI não configurados.');

  const state = Buffer.from(JSON.stringify({ tenantId, ts: Date.now() })).toString('base64url');

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
    tenantId = JSON.parse(Buffer.from(rawState, 'base64url').toString()).tenantId;
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

  // Idempotency
  const { rows: existing } = await query(
    `SELECT id FROM calendar_auto_joins WHERE calendar_event_id = $1`,
    [eventId],
  );
  if (existing.length) return;

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

  const { rows: inserted } = await query(
    `INSERT INTO calendar_auto_joins
       (tenant_id, calendar_event_id, event_title, video_url, video_platform,
        organizer_email, attendees, scheduled_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (calendar_event_id) DO NOTHING
     RETURNING id`,
    [
      tenantId,
      eventId,
      event.summary ?? 'Reunião',
      videoLink,
      platform,
      organizer,
      JSON.stringify(attendees),
      scheduledAt,
    ],
  );

  if (!inserted.length) return; // conflict — already exists

  console.log(`[googleCalendarService] Detected video meeting: "${event.summary}" at ${scheduledAt.toISOString()} — ${platform} — ${videoLink}`);

  // Enqueue meet-bot job (async — fire and forget)
  await enqueueMeetBotJob(tenantId, inserted[0].id, videoLink, event.summary ?? 'Reunião', scheduledAt)
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
): Promise<void> {
  // Insert into jobs table (same pattern as meetings.ts)
  const { rows } = await query(
    `INSERT INTO jobs
       (tenant_id, type, payload, status, run_at)
     VALUES ($1, 'meet-bot', $2, 'pending', $3)
     RETURNING id`,
    [
      tenantId,
      JSON.stringify({
        videoUrl,
        eventTitle,
        scheduledAt: scheduledAt.toISOString(),
        autoJoinId,
        source: 'google_calendar',
      }),
      // Schedule job 5 minutes before the meeting
      new Date(scheduledAt.getTime() - 5 * 60 * 1000),
    ],
  );

  await query(
    `UPDATE calendar_auto_joins SET job_enqueued_at = now() WHERE id = $1`,
    [autoJoinId],
  );

  console.log(`[googleCalendarService] Enqueued meet-bot job ${rows[0]?.id} for "${eventTitle}"`);
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
