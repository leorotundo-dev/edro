type AlertLevel = 'info' | 'warning' | 'critical';

type AlertPayload = {
  level: AlertLevel;
  message: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
};

const webhookUrl = process.env.ALERTS_SLACK_WEBHOOK || '';
const alertsEnabled = process.env.ALERTS_ENABLED !== 'false';
const dedupMinutes = Number.parseInt(process.env.ALERTS_DEDUP_MINUTES || '10', 10);
const dedupWindowMs = Number.isFinite(dedupMinutes) && dedupMinutes > 0 ? dedupMinutes * 60 * 1000 : 0;

const recentAlerts = new Map<string, number>();

const safeStringify = (value: unknown) => {
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable metadata]';
  }
};

const formatSlackText = (alert: AlertPayload) => {
  const levelLabel = alert.level.toUpperCase();
  const meta = alert.metadata ? `\n${safeStringify(alert.metadata)}` : '';
  return `[${levelLabel}] ${alert.message}${meta}`;
};

const shouldSend = (key: string) => {
  if (!dedupWindowMs) return true;
  const lastSent = recentAlerts.get(key);
  if (!lastSent) return true;
  return Date.now() - lastSent > dedupWindowMs;
};

const recordSend = (key: string) => {
  if (!dedupWindowMs) return;
  recentAlerts.set(key, Date.now());
};

async function sendSlack(alert: AlertPayload) {
  if (!webhookUrl || !alertsEnabled) return;
  const fetchFn = (globalThis as any).fetch as
    | ((url: string, init?: any) => Promise<any>)
    | undefined;

  if (!fetchFn) {
    console.warn('[alerts] fetch not available, skipping Slack delivery');
    return;
  }

  const payload = {
    text: formatSlackText(alert),
  };

  await fetchFn(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function notifyAlert(alert: AlertPayload) {
  const key = `${alert.level}:${alert.message}`;
  if (!shouldSend(key)) return;
  recordSend(key);

  try {
    await sendSlack(alert);
  } catch (err) {
    console.error('[alerts] Failed to send Slack alert:', err);
  }
}

export const AlertService = {
  notifyAlert,
};

export default AlertService;
