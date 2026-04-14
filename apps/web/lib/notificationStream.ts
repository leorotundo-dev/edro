'use client';

import { buildApiUrl } from '@/lib/api';

type NotificationStreamPayload = {
  id?: string;
  event_type?: string | null;
  title?: string | null;
  body?: string | null;
  link?: string | null;
  [key: string]: unknown;
};

type NotificationStreamListener = (payload: NotificationStreamPayload) => void;

let stream: EventSource | null = null;
let subscribers = 0;
const listeners = new Set<NotificationStreamListener>();
const browserNotificationIds = new Set<string>();

function shouldShowBrowserNotification(payload: NotificationStreamPayload) {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return false;
  if (document.visibilityState === 'visible') return false;
  if (Notification.permission !== 'granted') return false;
  if (window.localStorage.getItem('edro_browser_notifications_enabled') === 'false') return false;
  return Boolean(String(payload.title || '').trim());
}

function maybeShowBrowserNotification(payload: NotificationStreamPayload) {
  const notificationId = String(payload.id || '').trim();
  if (!shouldShowBrowserNotification(payload)) return;
  if (notificationId && browserNotificationIds.has(notificationId)) return;
  if (notificationId) browserNotificationIds.add(notificationId);

  const notification = new Notification(String(payload.title || 'Nova notificação'), {
    body: String(payload.body || '').trim() || undefined,
    tag: notificationId ? `edro:${notificationId}` : undefined,
  });

  notification.onclick = () => {
    window.focus();
    const link = String(payload.link || '').trim();
    if (link) window.location.href = link;
    notification.close();
  };
}

function ensureNotificationStream() {
  if (typeof window === 'undefined' || stream) return;

  stream = new EventSource(buildApiUrl('/notifications/stream'));
  stream.onmessage = (event) => {
    let payload: NotificationStreamPayload;
    try {
      payload = JSON.parse(event.data || '{}');
    } catch {
      return;
    }

    listeners.forEach((listener) => {
      listener(payload);
    });

    maybeShowBrowserNotification(payload);
    window.dispatchEvent(new CustomEvent('notifications:stream', { detail: payload }));
    if (String(payload.event_type || '').startsWith('jarvis_')) {
      window.dispatchEvent(new CustomEvent('jarvis-feed-refresh'));
    }
  };

  stream.onerror = () => {
    if (stream?.readyState === EventSource.CLOSED) {
      stream.close();
      stream = null;
      if (subscribers > 0) {
        window.setTimeout(() => ensureNotificationStream(), 3000);
      }
    }
  };
}

export function subscribeToNotificationStream(listener: NotificationStreamListener) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  subscribers += 1;
  listeners.add(listener);
  ensureNotificationStream();

  return () => {
    listeners.delete(listener);
    subscribers = Math.max(0, subscribers - 1);
    if (subscribers === 0 && stream) {
      stream.close();
      stream = null;
    }
  };
}
