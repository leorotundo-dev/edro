type InAppNotificationPayload = {
  id: string;
  tenant_id?: string | null;
  user_id?: string | null;
  event_type?: string | null;
  title?: string | null;
  body?: string | null;
  link?: string | null;
  read_at?: string | null;
  created_at?: string | Date | null;
};

type Subscriber = {
  id: string;
  send: (payload: InAppNotificationPayload) => void;
};

const subscribersByUser = new Map<string, Map<string, Subscriber>>();

function nextSubscriberId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function subscribeToInAppNotifications(
  userId: string,
  send: (payload: InAppNotificationPayload) => void,
) {
  const subscriberId = nextSubscriberId();
  const subscribers = subscribersByUser.get(userId) ?? new Map<string, Subscriber>();
  subscribers.set(subscriberId, { id: subscriberId, send });
  subscribersByUser.set(userId, subscribers);

  return () => {
    const current = subscribersByUser.get(userId);
    if (!current) return;
    current.delete(subscriberId);
    if (current.size === 0) {
      subscribersByUser.delete(userId);
    }
  };
}

export function publishInAppNotification(
  userId: string,
  payload: InAppNotificationPayload,
) {
  const subscribers = subscribersByUser.get(userId);
  if (!subscribers?.size) return;

  for (const subscriber of subscribers.values()) {
    try {
      subscriber.send(payload);
    } catch {
      // Stream cleanup happens on connection close.
    }
  }
}
