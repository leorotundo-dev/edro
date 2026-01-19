import { addToQueue, SendNotificationJob } from './queueService';
import {
  evaluateNotificationRule,
  logNotification,
  shouldSendNotification,
  updateNotificationStatus,
  NotificationChannel,
  NotificationEvent,
} from './notificationService';

type DispatchResult = {
  queued: boolean;
  skipped?: boolean;
  reason?: string;
  nextAllowedAt?: Date | null;
  logId?: string | null;
};

export async function dispatchNotification(params: {
  userId: string;
  eventType: NotificationEvent;
  channel: NotificationChannel;
  title?: string;
  body?: string;
  metadata?: Record<string, any>;
  delayMs?: number;
}): Promise<DispatchResult> {
  const rule = evaluateNotificationRule(params.eventType, params.metadata, {
    title: params.title,
    body: params.body,
  });

  if (!rule.allowed) {
    await logNotification({
      userId: params.userId,
      eventType: params.eventType,
      channel: params.channel,
      title: params.title,
      body: params.body,
      status: 'skipped',
      reason: rule.reason,
      metadata: params.metadata,
    });

    return { queued: false, skipped: true, reason: rule.reason };
  }

  const rate = await shouldSendNotification({
    userId: params.userId,
    channel: params.channel,
    eventType: params.eventType,
  });

  if (!rate.allowed) {
    await logNotification({
      userId: params.userId,
      eventType: params.eventType,
      channel: params.channel,
      title: rule.title ?? params.title,
      body: rule.body ?? params.body,
      status: 'skipped',
      reason: rate.reason,
      metadata: params.metadata,
    });

    return {
      queued: false,
      skipped: true,
      reason: rate.reason,
      nextAllowedAt: rate.nextAllowedAt,
    };
  }

  const resolvedTitle = rule.title ?? params.title ?? 'Notificacao';
  const resolvedBody = rule.body ?? params.body ?? '';

  if (params.channel === 'inapp') {
    await logNotification({
      userId: params.userId,
      eventType: params.eventType,
      channel: params.channel,
      title: resolvedTitle,
      body: resolvedBody,
      status: 'sent',
      sentAt: new Date(),
      metadata: params.metadata,
    });

    return { queued: false };
  }

  const logId = await logNotification({
    userId: params.userId,
    eventType: params.eventType,
    channel: params.channel,
    title: resolvedTitle,
    body: resolvedBody,
    status: 'queued',
    metadata: {
      ...(params.metadata || {}),
      delayMs: params.delayMs ?? 0,
    },
  });

  const job = await addToQueue<SendNotificationJob>(
    'sendNotifications',
    {
      userId: params.userId,
      type: params.channel === 'inapp' ? 'push' : params.channel,
      title: resolvedTitle,
      body: resolvedBody,
      logId,
    },
    { delay: params.delayMs }
  );

  if (!job && logId) {
    await updateNotificationStatus({
      id: logId,
      status: 'failed',
      reason: 'queue_unavailable',
    });
  }

  return { queued: Boolean(job), logId };
}

export default {
  dispatchNotification,
};
