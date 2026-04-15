import webpush from 'web-push';
import { query } from '../db/db';

const DEFAULT_VAPID_SUBJECT = 'mailto:noreply@edro.digital';
const DEFAULT_CONFIG_KEY = 'default';

type WebPushConfigRow = {
  config_key: string;
  vapid_public_key: string;
  vapid_private_key: string;
  vapid_subject: string;
};

type WebPushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  expiration_time: number | string | null;
};

export type WebPushSubscriptionInput = {
  endpoint?: string | null;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string | null;
    auth?: string | null;
  } | null;
};

let cachedConfig: WebPushConfigRow | null = null;

function normalizeSubscription(input: WebPushSubscriptionInput) {
  const endpoint = String(input.endpoint || '').trim();
  const p256dh = String(input.keys?.p256dh || '').trim();
  const auth = String(input.keys?.auth || '').trim();
  if (!endpoint || !p256dh || !auth) {
    throw new Error('web_push_subscription_invalid');
  }
  return {
    endpoint,
    p256dh,
    auth,
    expirationTime: input.expirationTime ?? null,
  };
}

async function getOrCreateWebPushConfig(): Promise<WebPushConfigRow> {
  if (cachedConfig) return cachedConfig;

  const existing = await query<WebPushConfigRow>(
    `SELECT config_key, vapid_public_key, vapid_private_key, vapid_subject
       FROM web_push_config
      WHERE config_key = $1
      LIMIT 1`,
    [DEFAULT_CONFIG_KEY],
  );
  if (existing.rows[0]) {
    cachedConfig = existing.rows[0];
    return existing.rows[0];
  }

  const generated = webpush.generateVAPIDKeys();
  await query(
    `INSERT INTO web_push_config (config_key, vapid_public_key, vapid_private_key, vapid_subject)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (config_key) DO NOTHING`,
    [DEFAULT_CONFIG_KEY, generated.publicKey, generated.privateKey, DEFAULT_VAPID_SUBJECT],
  );

  const created = await query<WebPushConfigRow>(
    `SELECT config_key, vapid_public_key, vapid_private_key, vapid_subject
       FROM web_push_config
      WHERE config_key = $1
      LIMIT 1`,
    [DEFAULT_CONFIG_KEY],
  );
  if (!created.rows[0]) {
    throw new Error('web_push_config_unavailable');
  }
  cachedConfig = created.rows[0];
  return created.rows[0];
}

export async function getWebPushPublicConfig(userId: string) {
  const config = await getOrCreateWebPushConfig();
  const { rows } = await query<{ subscribed: boolean }>(
    `SELECT EXISTS(
        SELECT 1
          FROM web_push_subscriptions
         WHERE user_id = $1
           AND deactivated_at IS NULL
      ) AS subscribed`,
    [userId],
  );
  return {
    supported: true,
    publicKey: config.vapid_public_key,
    subscribed: Boolean(rows[0]?.subscribed),
  };
}

export async function upsertWebPushSubscription(input: {
  tenantId: string;
  userId: string;
  subscription: WebPushSubscriptionInput;
  userAgent?: string | null;
}) {
  const normalized = normalizeSubscription(input.subscription);
  const config = await getOrCreateWebPushConfig();

  await query(
    `INSERT INTO web_push_subscriptions (
        tenant_id,
        user_id,
        endpoint,
        p256dh,
        auth,
        expiration_time,
        user_agent
      )
      VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7)
      ON CONFLICT (endpoint) DO UPDATE SET
        tenant_id = EXCLUDED.tenant_id,
        user_id = EXCLUDED.user_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        expiration_time = EXCLUDED.expiration_time,
        user_agent = EXCLUDED.user_agent,
        deactivated_at = NULL,
        last_error = NULL,
        updated_at = now()`,
    [
      input.tenantId,
      input.userId,
      normalized.endpoint,
      normalized.p256dh,
      normalized.auth,
      normalized.expirationTime,
      input.userAgent || null,
    ],
  );

  return {
    publicKey: config.vapid_public_key,
    subscribed: true,
  };
}

export async function deactivateWebPushSubscription(input: {
  userId: string;
  endpoint: string;
}) {
  await query(
    `UPDATE web_push_subscriptions
        SET deactivated_at = now(),
            updated_at = now()
      WHERE user_id = $1
        AND endpoint = $2
        AND deactivated_at IS NULL`,
    [input.userId, input.endpoint],
  );
}

export async function sendWebPushNotification(input: {
  userId: string;
  title: string;
  body?: string;
  link?: string;
  eventType: string;
  payload?: Record<string, any> | null;
}) {
  const config = await getOrCreateWebPushConfig();
  const { rows } = await query<WebPushSubscriptionRow>(
    `SELECT id, endpoint, p256dh, auth, expiration_time
       FROM web_push_subscriptions
      WHERE user_id = $1
        AND deactivated_at IS NULL`,
    [input.userId],
  );
  if (!rows.length) {
    return { sent: 0, failed: 0, deactivated: 0 };
  }

  webpush.setVapidDetails(
    config.vapid_subject || DEFAULT_VAPID_SUBJECT,
    config.vapid_public_key,
    config.vapid_private_key,
  );

  let sent = 0;
  let failed = 0;
  let deactivated = 0;
  const payload = JSON.stringify({
    title: input.title,
    body: input.body || '',
    link: input.link || '/jarvis',
    eventType: input.eventType,
    payload: input.payload || null,
  });

  for (const row of rows) {
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          expirationTime: row.expiration_time == null ? null : Number(row.expiration_time),
          keys: {
            p256dh: row.p256dh,
            auth: row.auth,
          },
        },
        payload,
      );
      sent += 1;
      await query(
        `UPDATE web_push_subscriptions
            SET last_sent_at = now(),
                last_error = NULL,
                updated_at = now()
          WHERE id = $1`,
        [row.id],
      );
    } catch (error: any) {
      const statusCode = Number(error?.statusCode || error?.status || 0) || 0;
      if (statusCode === 404 || statusCode === 410) {
        deactivated += 1;
        await query(
          `UPDATE web_push_subscriptions
              SET deactivated_at = now(),
                  last_error = $2,
                  updated_at = now()
            WHERE id = $1`,
          [row.id, error?.message || 'web_push_subscription_expired'],
        );
        continue;
      }

      failed += 1;
      await query(
        `UPDATE web_push_subscriptions
            SET last_error = $2,
                updated_at = now()
          WHERE id = $1`,
        [row.id, error?.message || 'web_push_send_failed'],
      );
    }
  }

  return { sent, failed, deactivated };
}
