'use client';

import { buildApiUrl } from '@/lib/api';

type NotificationStreamPayload = {
  id?: string;
  event_type?: string | null;
  [key: string]: unknown;
};

type NotificationStreamListener = (payload: NotificationStreamPayload) => void;

let stream: EventSource | null = null;
let subscribers = 0;
const listeners = new Set<NotificationStreamListener>();

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
