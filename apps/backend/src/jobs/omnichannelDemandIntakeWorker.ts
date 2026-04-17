import { query } from '../db';
import { enqueueDemandIntake } from '../services/demandIntakeService';

let running = false;

function normalizeText(value: unknown, fallback = '') {
  return String(value ?? fallback).replace(/\s+/g, ' ').trim();
}

function truncate(value: string, max = 280) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function priorityFromCalendarScore(score: number) {
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

async function scanMeetingActions() {
  const { rows } = await query<{
    id: string;
    tenant_id: string;
    client_id: string | null;
    type: string | null;
    title: string | null;
    description: string | null;
    raw_excerpt: string | null;
    responsible: string | null;
    priority: string | null;
    deadline: string | null;
    created_at: string;
  }>(
    `SELECT id,
            tenant_id::text AS tenant_id,
            client_id::text AS client_id,
            type,
            title,
            description,
            raw_excerpt,
            responsible,
            priority,
            deadline::text AS deadline,
            created_at::text AS created_at
       FROM meeting_actions
      WHERE client_id IS NOT NULL
        AND status = 'pending'
        AND created_at >= NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
      LIMIT 5`,
  );

  for (const row of rows) {
    await enqueueDemandIntake({
      tenantId: row.tenant_id,
      clientId: row.client_id,
      source: {
        type: 'meeting_action',
        id: row.id,
        occurredAt: row.created_at,
        refs: {
          meeting_action_type: row.type,
          responsible: row.responsible,
        },
      },
      summary: {
        title: normalizeText(row.title, 'Ação extraída de reunião'),
        description: truncate(normalizeText(row.description || row.raw_excerpt)),
        objective: normalizeText(row.raw_excerpt || row.description),
        platform: null,
        deadline: row.deadline,
        priorityHint: normalizeText(row.priority),
      },
      payload: {
        origin: 'meeting_action',
        meeting_action_type: row.type,
        responsible: row.responsible,
      },
    }).catch(() => {});
  }
}

async function scanWhatsAppInsights() {
  const { rows } = await query<{
    id: string;
    tenant_id: string;
    client_id: string | null;
    insight_type: string | null;
    summary: string | null;
    urgency: string | null;
    sentiment: string | null;
    entities: any;
    created_at: string;
  }>(
    `SELECT id,
            tenant_id::text AS tenant_id,
            client_id::text AS client_id,
            insight_type,
            summary,
            urgency,
            sentiment,
            entities,
            created_at::text AS created_at
       FROM whatsapp_message_insights
      WHERE client_id IS NOT NULL
        AND actioned = false
        AND insight_type IN ('request', 'deadline', 'feedback', 'preference', 'complaint')
        AND created_at >= NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
      LIMIT 5`,
  );

  for (const row of rows) {
    const insightType = normalizeText(row.insight_type, 'request');
    const summaryText = normalizeText(row.summary, 'Novo sinal via WhatsApp');
    await enqueueDemandIntake({
      tenantId: row.tenant_id,
      clientId: row.client_id,
      source: {
        type: 'whatsapp_insight',
        id: row.id,
        occurredAt: row.created_at,
        refs: {
          insight_type: insightType,
          urgency: row.urgency,
          sentiment: row.sentiment,
        },
      },
      summary: {
        title: truncate(`WhatsApp: ${summaryText}`, 120),
        description: truncate(summaryText),
        objective: summaryText,
        platform: null,
        deadline: null,
        priorityHint: normalizeText(row.urgency),
      },
      payload: {
        origin: 'whatsapp_insight',
        insight_type: insightType,
        urgency: row.urgency,
        sentiment: row.sentiment,
        entities: row.entities ?? null,
      },
    }).catch(() => {});
  }
}

async function scanGmailThreads() {
  const { rows } = await query<{
    id: string;
    tenant_id: string;
    client_id: string | null;
    subject: string | null;
    snippet: string | null;
    body_text: string | null;
    from_email: string | null;
    from_name: string | null;
    received_at: string | null;
  }>(
    `SELECT id,
            tenant_id::text AS tenant_id,
            client_id::text AS client_id,
            subject,
            snippet,
            body_text,
            from_email,
            from_name,
            received_at::text AS received_at
       FROM gmail_threads
      WHERE client_id IS NOT NULL
        AND COALESCE(jarvis_processed, false) = false
        AND received_at >= NOW() - INTERVAL '30 days'
      ORDER BY received_at DESC NULLS LAST, created_at DESC
      LIMIT 5`,
  );

  for (const row of rows) {
    const content = normalizeText(row.body_text || row.snippet || row.subject);
    await enqueueDemandIntake({
      tenantId: row.tenant_id,
      clientId: row.client_id,
      source: {
        type: 'gmail_thread',
        id: row.id,
        occurredAt: row.received_at,
        refs: {
          from_email: row.from_email,
          from_name: row.from_name,
        },
      },
      summary: {
        title: normalizeText(row.subject, 'Email do cliente'),
        description: truncate(content),
        objective: content,
        platform: null,
        deadline: null,
        priorityHint: 'medium',
      },
      payload: {
        origin: 'gmail_thread',
        from_email: row.from_email,
        from_name: row.from_name,
      },
    }).catch(() => {});
  }
}

async function scanCalendarSignals() {
  const { rows } = await query<{
    tenant_id: string;
    client_id: string;
    calendar_event_id: string;
    event_name: string | null;
    event_date: string | null;
    relevance_score: number | null;
    relevance_reason: any;
  }>(
    `SELECT cer.tenant_id::text AS tenant_id,
            cer.client_id::text AS client_id,
            cer.calendar_event_id,
            e.name AS event_name,
            e.date AS event_date,
            cer.relevance_score,
            cer.relevance_reason
       FROM calendar_event_relevance cer
       JOIN events e ON e.id = cer.calendar_event_id
      WHERE cer.is_relevant = true
        AND COALESCE(cer.relevance_score, 0) >= 55
        AND e.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        AND e.date::date >= CURRENT_DATE
        AND e.date::date <= CURRENT_DATE + INTERVAL '45 days'
      ORDER BY cer.relevance_score DESC, e.date::date ASC
      LIMIT 5`,
  );

  for (const row of rows) {
    const score = Number(row.relevance_score || 0);
    const why = normalizeText(row.relevance_reason?.why || row.relevance_reason?.reason);
    await enqueueDemandIntake({
      tenantId: row.tenant_id,
      clientId: row.client_id,
      source: {
        type: 'calendar_signal',
        id: `${row.client_id}:${row.calendar_event_id}`,
        occurredAt: row.event_date,
        refs: {
          calendar_event_id: row.calendar_event_id,
          relevance_score: score,
        },
      },
      summary: {
        title: normalizeText(row.event_name, 'Data relevante do calendário'),
        description: truncate(why || `Data relevante detectada para ${row.event_date}`),
        objective: why || normalizeText(row.event_name),
        platform: null,
        deadline: row.event_date,
        priorityHint: priorityFromCalendarScore(score),
      },
      payload: {
        origin: 'calendar_signal',
        calendar_event_id: row.calendar_event_id,
        event_date: row.event_date,
        relevance_score: score,
        relevance_reason: row.relevance_reason ?? null,
      },
    }).catch(() => {});
  }
}

export async function runOmnichannelDemandIntakeWorkerOnce(): Promise<void> {
  if (running) return;
  running = true;

  try {
    await scanMeetingActions();
    await scanWhatsAppInsights();
    await scanGmailThreads();
    await scanCalendarSignals();
  } finally {
    running = false;
  }
}
