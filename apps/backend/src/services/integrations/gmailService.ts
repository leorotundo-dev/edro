/**
 * Gmail Service
 * OAuth2 + Gmail API for monitoring client email inboxes.
 *
 * ENV vars:
 *   GOOGLE_CLIENT_ID       — Google OAuth client ID
 *   GOOGLE_CLIENT_SECRET   — Google OAuth client secret
 *   GOOGLE_REDIRECT_URI    — e.g. https://edro-backend-production.up.railway.app/api/auth/google/callback
 *   GOOGLE_PUBSUB_TOPIC    — e.g. projects/my-project/topics/gmail-watch
 *   GOOGLE_PUBSUB_WEBHOOK_TOKEN — shared secret for /webhook/gmail when Pub/Sub push auth is enabled
 *
 * Flow:
 *   1. User clicks "Conectar Gmail" → GET /auth/google/start
 *   2. Google redirects to /auth/google/callback with code
 *   3. Exchange code for tokens → save to gmail_connections
 *   4. Call watch() to activate Pub/Sub push notifications
 *   5. Google POSTs to /webhook/gmail when new mail arrives
 *   6. A fallback poller keeps syncing via historyId even if Pub/Sub push stalls
 *   7. Handler decodes historyId → fetchNewMessages() → processMessage()
 */

import crypto from 'crypto';
import { query } from '../../db';
import { generateWithProvider } from '../ai/copyOrchestrator';
import { createBriefing } from '../../repositories/edroBriefingRepository';
import { env } from '../../env';
import { logActivity } from '../integrationMonitor';
import { hasClientDocumentHash, insertClientDocument } from '../../repos/clientIntelligenceRepo';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1';

function shortText(value: string | null | undefined, maxLength: number): string {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function decodeGmailBody(data?: string | null): string | null {
  const raw = String(data || '').trim();
  if (!raw) return null;
  try {
    const normalized = raw.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(normalized, 'base64').toString('utf-8');
  } catch {
    return null;
  }
}

function stripHtml(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractGmailBodyText(payload: any): string | null {
  const queue = Array.isArray(payload?.parts) && payload.parts.length
    ? [...payload.parts]
    : payload
      ? [payload]
      : [];
  let htmlFallback: string | null = null;

  while (queue.length > 0) {
    const part = queue.shift();
    if (!part) continue;
    if (Array.isArray(part.parts) && part.parts.length) {
      queue.unshift(...part.parts);
    }
    if (!part.body?.data) continue;

    const decoded = decodeGmailBody(part.body.data);
    if (!decoded) continue;

    if (part.mimeType === 'text/plain') {
      const clean = decoded.trim();
      if (clean) return clean;
    }

    if (part.mimeType === 'text/html' && !htmlFallback) {
      const clean = stripHtml(decoded);
      if (clean) htmlFallback = clean;
    }
  }

  if (payload?.body?.data) {
    const decoded = decodeGmailBody(payload.body.data);
    if (decoded?.trim()) return decoded.trim();
  }

  return htmlFallback;
}

async function updateGmailConnectionState(params: {
  tenantId: string;
  watchExpiry?: Date | null;
  historyId?: string | null;
  lastSyncAt?: Date | null;
  lastError?: string | null;
}) {
  const patch: string[] = [];
  const values: any[] = [params.tenantId];
  let idx = 2;

  if (params.watchExpiry !== undefined) {
    patch.push(`watch_expiry = $${idx++}`);
    values.push(params.watchExpiry);
  }
  if (params.historyId !== undefined) {
    patch.push(`history_id = $${idx++}`);
    values.push(params.historyId);
  }
  if (params.lastSyncAt !== undefined) {
    patch.push(`last_sync_at = $${idx++}`);
    values.push(params.lastSyncAt);
  }
  if (params.lastError !== undefined) {
    patch.push(`last_error = $${idx++}`);
    values.push(params.lastError ? String(params.lastError).slice(0, 500) : null);
  }
  if (!patch.length) return;

  await query(
    `UPDATE gmail_connections
        SET ${patch.join(', ')}
      WHERE tenant_id = $1`,
    values,
  ).catch(() => {});
}

async function resolveClientForInboundEmail(tenantId: string, emailAddress: string): Promise<string | null> {
  const email = String(emailAddress || '').trim().toLowerCase();
  if (!email) return null;

  const { rows } = await query<{ client_id: string }>(
    `SELECT client_id
       FROM (
         SELECT c.id AS client_id, 1 AS priority
           FROM clients c
          WHERE c.tenant_id = $1
            AND LOWER(COALESCE(c.email, '')) = $2
         UNION ALL
         SELECT cc.client_id, 2 AS priority
           FROM client_contacts cc
          WHERE cc.tenant_id = $1
            AND cc.active = true
            AND LOWER(COALESCE(cc.email, '')) = $2
         UNION ALL
         SELECT cc.client_id, 3 AS priority
           FROM client_contacts cc
           JOIN person_identities pi
             ON pi.person_id = cc.person_id
            AND pi.tenant_id = cc.tenant_id
          WHERE cc.tenant_id = $1
            AND cc.active = true
            AND pi.identity_type = 'email'
            AND pi.normalized_value = $2
       ) matches
      ORDER BY priority ASC
      LIMIT 1`,
    [tenantId, email],
  ).catch(() => ({ rows: [] as Array<{ client_id: string }> }));

  return rows[0]?.client_id ?? null;
}

async function persistGmailMessageMemory(params: {
  tenantId: string;
  clientId: string;
  gmailMessageId: string;
  gmailThreadId: string | null;
  fromEmail: string;
  fromName?: string | null;
  subject?: string | null;
  snippet?: string | null;
  bodyText?: string | null;
  receivedAt: Date;
}) {
  const content = [
    params.subject ? `Assunto: ${params.subject}` : null,
    params.bodyText ? params.bodyText : params.snippet,
  ].filter(Boolean).join('\n\n').trim();
  if (!content) return;

  const contentHash = crypto
    .createHash('sha256')
    .update(`gmail_message:${params.clientId}:${params.gmailMessageId}:${content}`)
    .digest('hex');

  const exists = await hasClientDocumentHash({
    tenantId: params.tenantId,
    clientId: params.clientId,
    contentHash,
  });
  if (exists) return;

  await insertClientDocument({
    tenantId: params.tenantId,
    clientId: params.clientId,
    sourceId: params.gmailMessageId,
    sourceType: 'gmail_message',
    platform: 'gmail',
    title: params.subject
      ? `${params.fromName || params.fromEmail} • ${params.subject}`
      : `${params.fromName || params.fromEmail} • Email`,
    contentText: content,
    contentExcerpt: shortText(params.bodyText || params.snippet || content, 320),
    language: 'pt-BR',
    publishedAt: params.receivedAt,
    contentHash,
    metadata: {
      source: 'gmail_message',
      from_email: params.fromEmail,
      from_name: params.fromName ?? null,
      subject: params.subject ?? null,
      gmail_message_id: params.gmailMessageId,
      gmail_thread_id: params.gmailThreadId,
    },
  });
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

function resolveGmailRedirectUri(): string {
  if (env.GOOGLE_REDIRECT_URI) {
    return env.GOOGLE_REDIRECT_URI;
  }
  const publicBase = env.PUBLIC_API_URL?.replace(/\/$/, '');
  if (!publicBase) {
    throw new Error('Configure GOOGLE_REDIRECT_URI ou PUBLIC_API_URL para o OAuth do Gmail.');
  }
  return `${publicBase}/api/auth/google/callback`;
}

// ── OAuth helpers ─────────────────────────────────────────────────────────

export function gmailOAuthUrl(tenantId: string): string {
  const clientId = env.GOOGLE_CLIENT_ID;
  const redirectUri = resolveGmailRedirectUri();
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID não configurado.');

  const state = signOAuthState({ tenantId, ts: Date.now() });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/contacts.readonly',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params}`;
}

export async function exchangeGmailCode(code: string, rawState: string): Promise<{
  tenantId: string;
  email: string;
}> {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  const redirectUri = resolveGmailRedirectUri();
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET não configurados.');
  }

  // Exchange code for tokens
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Gmail token exchange failed: ${err.slice(0, 200)}`);
  }
  const tokens = await tokenRes.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  // Get user email
  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = await userRes.json() as { email: string };
  const emailAddress = userInfo.email;

  let tenantId: string;
  try {
    tenantId = verifyOAuthState(rawState).tenantId;
  } catch {
    throw new Error('Invalid OAuth state');
  }

  const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);

  await query(
    `INSERT INTO gmail_connections (tenant_id, email_address, access_token, refresh_token, token_expiry)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tenant_id) DO UPDATE
       SET email_address = $2, access_token = $3,
           refresh_token = COALESCE($4, gmail_connections.refresh_token),
           token_expiry = $5, last_error = NULL`,
    [tenantId, emailAddress, tokens.access_token, tokens.refresh_token ?? null, tokenExpiry],
  );

  return { tenantId, email: emailAddress };
}

// ── Gmail watch (Pub/Sub push) ────────────────────────────────────────────

export async function watchGmailInbox(tenantId: string): Promise<void> {
  const pubsubTopic = env.GOOGLE_PUBSUB_TOPIC;
  if (!pubsubTopic) throw new Error('GOOGLE_PUBSUB_TOPIC não configurado.');

  try {
    const accessToken = await getValidAccessToken(tenantId);

    const res = await fetch(`${GMAIL_API}/users/me/watch`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topicName: pubsubTopic,
        labelIds: ['INBOX'],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gmail watch failed: ${err.slice(0, 200)}`);
    }
    const data = await res.json() as { historyId: string; expiration: string };

    const watchExpiry = new Date(parseInt(data.expiration));
    await updateGmailConnectionState({
      tenantId,
      watchExpiry,
      historyId: data.historyId,
      lastError: null,
    });

    logActivity({
      tenantId,
      service: 'gmail',
      event: 'watch_renewed',
      status: 'ok',
      meta: {
        history_id: data.historyId,
        watch_expiry: watchExpiry.toISOString(),
      },
    });
  } catch (error: any) {
    await updateGmailConnectionState({
      tenantId,
      lastError: error?.message ?? 'gmail_watch_failed',
    });
    logActivity({
      tenantId,
      service: 'gmail',
      event: 'watch_renewed',
      status: 'error',
      errorMsg: error?.message ?? 'gmail_watch_failed',
    });
    throw error;
  }
}

// ── Process Gmail history (incremental sync) ──────────────────────────────

export async function processGmailHistory(tenantId: string, newHistoryId: string): Promise<void> {
  const { rows } = await query(
    `SELECT history_id, email_address FROM gmail_connections WHERE tenant_id = $1`,
    [tenantId],
  );
  if (!rows.length) return;

  const { history_id: startHistoryId, email_address: agencyEmail } = rows[0];
  if (!startHistoryId) {
    // First time — just save historyId for next time
    await updateGmailConnectionState({
      tenantId,
      historyId: newHistoryId,
      lastError: null,
    });
    logActivity({
      tenantId,
      service: 'gmail',
      event: 'history_cursor_initialized',
      status: 'ok',
      meta: {
        history_id: newHistoryId,
      },
    });
    return;
  }

  try {
    const accessToken = await getValidAccessToken(tenantId);

    // Fetch history since last known historyId
    const historyRes = await fetch(
      `${GMAIL_API}/users/me/history?startHistoryId=${startHistoryId}&historyTypes=messageAdded&labelId=INBOX`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!historyRes.ok) {
      if (historyRes.status === 404) {
        await updateGmailConnectionState({
          tenantId,
          historyId: newHistoryId,
          lastSyncAt: new Date(),
          lastError: null,
        });
        logActivity({
          tenantId,
          service: 'gmail',
          event: 'history_cursor_reset',
          status: 'ok',
          meta: {
            old_history_id: startHistoryId,
            history_id: newHistoryId,
            email: agencyEmail,
          },
        });
        return;
      }
      const err = await historyRes.text().catch(() => '');
      throw new Error(`gmail_history_fetch_failed: ${err.slice(0, 200)}`);
    }
    const historyData = await historyRes.json() as { history?: any[] };

    const messages: any[] = [];
    for (const h of historyData.history ?? []) {
      for (const ma of h.messagesAdded ?? []) {
        messages.push(ma.message);
      }
    }

    // Update historyId
    await updateGmailConnectionState({
      tenantId,
      historyId: newHistoryId,
      lastSyncAt: new Date(),
      lastError: null,
    });

    // Process each new message
    for (const msg of messages) {
      try {
        await processGmailMessage(tenantId, agencyEmail, msg.id, accessToken);
      } catch (err: any) {
        console.error('[gmailService] processMessage failed:', err?.message);
      }
    }

    logActivity({
      tenantId,
      service: 'gmail',
      event: 'sync',
      status: 'ok',
      records: messages.length,
      meta: {
        history_id: newHistoryId,
        email: agencyEmail,
      },
    });
  } catch (error: any) {
    await updateGmailConnectionState({
      tenantId,
      lastError: error?.message ?? 'gmail_sync_failed',
    });
    logActivity({
      tenantId,
      service: 'gmail',
      event: 'sync',
      status: 'error',
      errorMsg: error?.message ?? 'gmail_sync_failed',
      meta: {
        history_id: newHistoryId,
        email: agencyEmail,
      },
    });
    throw error;
  }
}

export async function syncGmailInboxFallback(tenantId: string): Promise<'initialized' | 'noop' | 'synced'> {
  const { rows } = await query<{ history_id: string | null }>(
    `SELECT history_id
       FROM gmail_connections
      WHERE tenant_id = $1
      LIMIT 1`,
    [tenantId],
  );
  if (!rows.length) {
    throw new Error('Gmail não configurado para este tenant.');
  }

  const currentHistoryId = rows[0]?.history_id ? String(rows[0].history_id) : null;
  const accessToken = await getValidAccessToken(tenantId);

  const profileRes = await fetch(`${GMAIL_API}/users/me/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profileRes.ok) {
    const err = await profileRes.text().catch(() => '');
    throw new Error(`gmail_profile_fetch_failed: ${err.slice(0, 200)}`);
  }

  const profile = await profileRes.json() as { historyId?: string };
  const latestHistoryId = profile.historyId ? String(profile.historyId) : null;
  if (!latestHistoryId) {
    throw new Error('gmail_profile_missing_history_id');
  }

  if (!currentHistoryId) {
    await updateGmailConnectionState({
      tenantId,
      historyId: latestHistoryId,
      lastSyncAt: new Date(),
      lastError: null,
    });
    logActivity({
      tenantId,
      service: 'gmail',
      event: 'fallback_cursor_initialized',
      status: 'ok',
      meta: { history_id: latestHistoryId },
    });
    return 'initialized';
  }

  if (currentHistoryId === latestHistoryId) {
    await updateGmailConnectionState({
      tenantId,
      lastSyncAt: new Date(),
      lastError: null,
    });
    return 'noop';
  }

  await processGmailHistory(tenantId, latestHistoryId);
  logActivity({
    tenantId,
    service: 'gmail',
    event: 'fallback_sync',
    status: 'ok',
    meta: {
      old_history_id: currentHistoryId,
      history_id: latestHistoryId,
    },
  });
  return 'synced';
}

async function processGmailMessage(
  tenantId: string,
  agencyEmail: string,
  messageId: string,
  accessToken: string,
) {
  // Idempotency
  const { rows: existing } = await query(
    `SELECT id FROM gmail_threads WHERE gmail_message_id = $1`,
    [messageId],
  );
  if (existing.length) return;

  // Fetch full message
  const msgRes = await fetch(
    `${GMAIL_API}/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!msgRes.ok) return;
  const msgData = await msgRes.json() as any;

  const headers: Record<string, string> = {};
  for (const h of msgData.payload?.headers ?? []) {
    headers[h.name.toLowerCase()] = h.value;
  }

  const fromHeader = headers['from'] ?? '';
  const fromMatch = fromHeader.match(/^(?:"?(.+?)"?\s+)?<?([^>]+)>?$/);
  const fromName = fromMatch?.[1]?.trim() ?? null;
  const fromEmail = fromMatch?.[2]?.trim() ?? fromHeader;
  const subject = headers['subject'] ?? null;
  const snippet = msgData.snippet ?? null;
  const threadId = msgData.threadId ?? null;
  const receivedAt = msgData.internalDate
    ? new Date(parseInt(msgData.internalDate))
    : new Date();

  // Skip emails from the agency itself
  if (fromEmail.toLowerCase() === agencyEmail.toLowerCase()) return;

  // Extract plain text body
  const bodyText = extractGmailBodyText(msgData.payload);

  // Find matching client by email
  const clientId = await resolveClientForInboundEmail(tenantId, fromEmail);

  // Persist thread
  const { rows: inserted } = await query(
    `INSERT INTO gmail_threads
       (tenant_id, client_id, gmail_thread_id, gmail_message_id, from_email, from_name,
        subject, snippet, body_text, received_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [tenantId, clientId, threadId, messageId, fromEmail, fromName,
     subject, snippet, bodyText, receivedAt],
  );
  const threadDbId = inserted[0]?.id;

  if (clientId) {
    await persistGmailMessageMemory({
      tenantId,
      clientId,
      gmailMessageId: messageId,
      gmailThreadId: threadId,
      fromEmail,
      fromName,
      subject,
      snippet,
      bodyText,
      receivedAt,
    }).catch((err: any) => console.error('[gmailService] persistMemory failed:', err?.message));
  }

  // Create briefing via Jarvis if content exists
  const textForBriefing = bodyText ?? snippet ?? subject;
  if (!textForBriefing || !clientId) return;

  await autoCreateBriefingFromEmail({
    tenantId,
    clientId,
    fromName: fromName ?? fromEmail,
    subject: subject ?? 'Email sem assunto',
    content: textForBriefing,
    threadDbId,
  }).catch(err => console.error('[gmailService] briefing creation failed:', err?.message));
}

// ── Auto-briefing from email ──────────────────────────────────────────────

const EMAIL_BRIEFING_PROMPT = `Você é um assistente de agência. Um email chegou de um cliente.
Extraia um briefing conciso se houver uma solicitação de trabalho/conteúdo.
Retorne APENAS JSON: { "title": "...", "objective": "...", "notes": "..." }
Se for apenas uma pergunta ou saudação, retorne { "skip": true }.`;

async function autoCreateBriefingFromEmail(params: {
  tenantId: string;
  clientId: string;
  fromName: string;
  subject: string;
  content: string;
  threadDbId: string;
}) {
  const { tenantId, clientId, fromName, subject, content, threadDbId } = params;

  const result = await generateWithProvider('gemini', {
    prompt: `Email de ${fromName}, assunto: "${subject}"\n\n${content.slice(0, 2000)}`,
    systemPrompt: EMAIL_BRIEFING_PROMPT,
    temperature: 0.1,
    maxTokens: 512,
  });

  const jsonMatch = result.output.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return;
  const parsed = JSON.parse(jsonMatch[0]);
  if (parsed.skip) return;

  const { rows: edroRows } = await query(
    `SELECT id FROM edro_clients WHERE client_id = $1 AND tenant_id = $2 LIMIT 1`,
    [clientId, tenantId],
  );
  if (!edroRows.length) return;

  const briefing = await createBriefing({
    clientId: edroRows[0].id,
    title: parsed.title,
    status: 'draft',
    payload: {
      objective: parsed.objective,
      notes: `${parsed.notes ?? ''}\n\nOrigem: Email de ${fromName} — "${content.slice(0, 300)}"`,
      origin: 'gmail',
      from_name: fromName,
      gmail_thread_db_id: threadDbId,
    },
    createdBy: 'jarvis-gmail',
  });

  await query(
    `UPDATE gmail_threads SET briefing_id = $1, jarvis_processed = true WHERE id = $2`,
    [briefing.id, threadDbId],
  );
}

// ── Token refresh ─────────────────────────────────────────────────────────

export async function getValidAccessToken(tenantId: string): Promise<string> {
  const { rows } = await query(
    `SELECT access_token, refresh_token, token_expiry FROM gmail_connections WHERE tenant_id = $1`,
    [tenantId],
  );
  if (!rows.length) throw new Error('Gmail não configurado para este tenant.');

  const { access_token, refresh_token, token_expiry } = rows[0];

  // If token is still valid (with 2-minute buffer), return it
  if (token_expiry && new Date(token_expiry).getTime() > Date.now() + 120_000) {
    return access_token;
  }

  // Refresh
  if (!refresh_token) {
    await updateGmailConnectionState({
      tenantId,
      lastError: 'Refresh token não disponível. Reconecte o Gmail.',
    });
    throw new Error('Refresh token não disponível. Reconecte o Gmail.');
  }

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
  if (!refreshRes.ok) {
    await updateGmailConnectionState({
      tenantId,
      lastError: 'Falha ao renovar token Gmail.',
    });
    throw new Error('Falha ao renovar token Gmail.');
  }
  const newTokens = await refreshRes.json() as { access_token: string; expires_in: number };

  const newExpiry = new Date(Date.now() + newTokens.expires_in * 1000);
  await query(
    `UPDATE gmail_connections
        SET access_token = $1,
            token_expiry = $2,
            last_error = NULL
      WHERE tenant_id = $3`,
    [newTokens.access_token, newExpiry, tenantId],
  );

  return newTokens.access_token;
}
