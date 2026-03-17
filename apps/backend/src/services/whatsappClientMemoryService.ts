import crypto from 'crypto';
import { query } from '../db';
import {
  hasClientDocumentHash,
  insertClientDocument,
  insertClientInsight,
} from '../repos/clientIntelligenceRepo';

function hashText(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function shortText(value: string | null | undefined, limit: number) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, Math.max(0, limit - 1)).trim()}…`;
}

async function hasClientInsightPeriod(params: {
  tenantId: string;
  clientId: string;
  period: string;
}) {
  const { rows } = await query<{ id: string }>(
    `SELECT id
       FROM client_insights
      WHERE tenant_id = $1 AND client_id = $2 AND period = $3
      LIMIT 1`,
    [params.tenantId, params.clientId, params.period],
  );
  return Boolean(rows[0]?.id);
}

export async function persistWhatsAppMessageMemory(params: {
  tenantId: string;
  clientId: string;
  externalMessageId: string;
  text: string;
  senderName?: string | null;
  senderPhone?: string | null;
  direction: 'inbound' | 'outbound';
  messageType?: string | null;
  createdAt?: Date | null;
  channel?: 'cloud' | 'group' | 'manual';
}) {
  const text = String(params.text || '').trim();
  if (!text) return;

  const contentHash = hashText(
    `whatsapp_message:${params.clientId}:${params.externalMessageId}:${params.direction}:${text}`,
  );
  const exists = await hasClientDocumentHash({
    tenantId: params.tenantId,
    clientId: params.clientId,
    contentHash,
  });
  if (exists) return;

  await insertClientDocument({
    tenantId: params.tenantId,
    clientId: params.clientId,
    sourceId: null,
    sourceType: 'whatsapp_message',
    platform: 'whatsapp',
    title: params.senderName
      ? `${params.senderName} • WhatsApp`
      : params.direction === 'inbound'
        ? 'Mensagem de WhatsApp'
        : 'Mensagem enviada no WhatsApp',
    contentText: text,
    contentExcerpt: shortText(text, 280),
    language: 'pt-BR',
    publishedAt: params.createdAt ?? null,
    contentHash,
    metadata: {
      direction: params.direction,
      sender_name: params.senderName ?? null,
      sender_phone: params.senderPhone ?? null,
      message_type: params.messageType ?? null,
      channel: params.channel ?? 'cloud',
      external_message_id: params.externalMessageId,
      source: 'whatsapp_message',
    },
  });
}

export async function persistWhatsAppInsightMemory(params: {
  tenantId: string;
  clientId: string;
  insightId: string;
  messageId: string;
  messageExternalId?: string | null;
  senderName?: string | null;
  groupName?: string | null;
  messageContent?: string | null;
  insightType: string;
  summary: string;
  sentiment?: string | null;
  urgency?: string | null;
  entities?: Record<string, any> | null;
  actioned?: boolean;
  createdAt?: Date | null;
}) {
  const summary = String(params.summary || '').trim();
  if (!summary) return;

  const contentHash = hashText(`whatsapp_insight:${params.clientId}:${params.insightId}:${summary}`);
  const exists = await hasClientDocumentHash({
    tenantId: params.tenantId,
    clientId: params.clientId,
    contentHash,
  });

  if (!exists) {
    const contentText = [
      `Insight de WhatsApp: ${summary}`,
      params.messageContent ? `Mensagem origem: ${params.messageContent}` : null,
    ].filter(Boolean).join('\n\n');

    await insertClientDocument({
      tenantId: params.tenantId,
      clientId: params.clientId,
      sourceId: null,
      sourceType: 'whatsapp_insight',
      platform: 'whatsapp',
      title: params.groupName
        ? `Insight de WhatsApp • ${params.groupName}`
        : 'Insight de WhatsApp',
      contentText,
      contentExcerpt: shortText(summary, 280),
      language: 'pt-BR',
      publishedAt: params.createdAt ?? null,
      contentHash,
      metadata: {
        source: 'whatsapp_message_insight',
        insight_id: params.insightId,
        insight_type: params.insightType,
        sentiment: params.sentiment ?? null,
        urgency: params.urgency ?? null,
        entities: params.entities ?? {},
        actioned: params.actioned ?? false,
        message_id: params.messageId,
        external_message_id: params.messageExternalId ?? null,
        sender_name: params.senderName ?? null,
        group_name: params.groupName ?? null,
      },
    });
  }

  const period = `whatsapp-insight:${params.insightId}`;
  const insightExists = await hasClientInsightPeriod({
    tenantId: params.tenantId,
    clientId: params.clientId,
    period,
  });
  if (insightExists) return;

  await insertClientInsight({
    tenantId: params.tenantId,
    clientId: params.clientId,
    period,
    summary: {
      source: 'whatsapp_message_insight',
      insight_id: params.insightId,
      message_id: params.messageId,
      external_message_id: params.messageExternalId ?? null,
      summary_text: summary,
      insight_type: params.insightType,
      sentiment: params.sentiment ?? null,
      urgency: params.urgency ?? null,
      sender_name: params.senderName ?? null,
      group_name: params.groupName ?? null,
      entities: params.entities ?? {},
      actioned: params.actioned ?? false,
      updated_at: (params.createdAt ?? new Date()).toISOString(),
    },
  });
}

export async function persistWhatsAppDigestMemory(params: {
  tenantId: string;
  clientId: string;
  digestId: string;
  period: 'daily' | 'weekly';
  periodStart: Date;
  periodEnd: Date;
  summary: string;
  keyDecisions?: any[];
  pendingActions?: any[];
  messageCount?: number;
  insightCount?: number;
}) {
  const summary = String(params.summary || '').trim();
  if (!summary) return;

  const contentHash = hashText(
    `whatsapp_digest:${params.clientId}:${params.period}:${params.periodStart.toISOString()}:${summary}`,
  );
  const exists = await hasClientDocumentHash({
    tenantId: params.tenantId,
    clientId: params.clientId,
    contentHash,
  });

  if (!exists) {
    const decisions = Array.isArray(params.keyDecisions) ? params.keyDecisions : [];
    const pending = Array.isArray(params.pendingActions) ? params.pendingActions : [];
    const contentText = [
      summary,
      decisions.length
        ? `Decisões:\n${decisions.slice(0, 8).map((item: any) => `- ${item.decision || item}`).join('\n')}`
        : null,
      pending.length
        ? `Pendências:\n${pending.slice(0, 8).map((item: any) => `- ${item.action || item}`).join('\n')}`
        : null,
    ].filter(Boolean).join('\n\n');

    await insertClientDocument({
      tenantId: params.tenantId,
      clientId: params.clientId,
      sourceId: null,
      sourceType: 'whatsapp_digest',
      platform: 'whatsapp',
      title: `Digest de WhatsApp • ${params.period === 'daily' ? 'Diário' : 'Semanal'}`,
      contentText,
      contentExcerpt: shortText(summary, 280),
      language: 'pt-BR',
      publishedAt: params.periodEnd,
      contentHash,
      metadata: {
        source: 'whatsapp_group_digest',
        digest_id: params.digestId,
        period: params.period,
        period_start: params.periodStart.toISOString(),
        period_end: params.periodEnd.toISOString(),
        key_decisions: decisions,
        pending_actions: pending,
        message_count: params.messageCount ?? 0,
        insight_count: params.insightCount ?? 0,
      },
    });
  }

  const period = `whatsapp-digest:${params.digestId}`;
  const insightExists = await hasClientInsightPeriod({
    tenantId: params.tenantId,
    clientId: params.clientId,
    period,
  });
  if (insightExists) return;

  await insertClientInsight({
    tenantId: params.tenantId,
    clientId: params.clientId,
    period,
    summary: {
      source: 'whatsapp_group_digest',
      digest_id: params.digestId,
      period_label: params.period,
      period_start: params.periodStart.toISOString(),
      period_end: params.periodEnd.toISOString(),
      summary_text: summary,
      key_decisions: Array.isArray(params.keyDecisions) ? params.keyDecisions : [],
      pending_actions: Array.isArray(params.pendingActions) ? params.pendingActions : [],
      message_count: params.messageCount ?? 0,
      insight_count: params.insightCount ?? 0,
      updated_at: params.periodEnd.toISOString(),
    },
  });
}

export async function backfillWhatsAppClientMemory(params: {
  tenantId: string;
  clientId?: string | null;
}) {
  const hasClientFilter = Boolean(params.clientId);
  const values = hasClientFilter ? [params.tenantId, params.clientId] : [params.tenantId];

  const directMessagesSql = `
    SELECT wm.client_id, wm.wa_message_id, wm.raw_text, wm.direction, wm.type, wm.sender_phone, wm.created_at
      FROM whatsapp_messages wm
     WHERE wm.tenant_id = $1
       AND wm.client_id IS NOT NULL
       ${hasClientFilter ? 'AND wm.client_id = $2' : ''}
     ORDER BY wm.created_at ASC
  `;

  const groupMessagesSql = `
    SELECT wgm.client_id, wgm.wa_message_id, wgm.content, wgm.sender_name, wgm.sender_jid, wgm.type, wgm.created_at
      FROM whatsapp_group_messages wgm
     WHERE wgm.tenant_id = $1
       AND wgm.client_id IS NOT NULL
       ${hasClientFilter ? 'AND wgm.client_id = $2' : ''}
     ORDER BY wgm.created_at ASC
  `;

  const insightsSql = `
    SELECT
      wmi.client_id,
      wmi.id AS insight_id,
      wmi.message_id,
      wmi.insight_type,
      wmi.summary,
      wmi.sentiment,
      wmi.urgency,
      wmi.entities,
      wmi.actioned,
      wmi.created_at,
      wgm.wa_message_id AS message_external_id,
      wgm.sender_name,
      wgm.content AS message_content,
      wg.group_name
    FROM whatsapp_message_insights wmi
    LEFT JOIN whatsapp_group_messages wgm ON wgm.id = wmi.message_id
    LEFT JOIN whatsapp_groups wg ON wg.id = wgm.group_id
    WHERE wmi.tenant_id = $1
      AND wmi.client_id IS NOT NULL
      ${hasClientFilter ? 'AND wmi.client_id = $2' : ''}
    ORDER BY wmi.created_at ASC
  `;

  const digestsSql = `
    SELECT
      wgd.client_id,
      wgd.id AS digest_id,
      wgd.period,
      wgd.period_start,
      wgd.period_end,
      wgd.summary,
      wgd.key_decisions,
      wgd.pending_actions,
      wgd.message_count,
      wgd.insight_count
    FROM whatsapp_group_digests wgd
    WHERE wgd.tenant_id = $1
      AND wgd.client_id IS NOT NULL
      ${hasClientFilter ? 'AND wgd.client_id = $2' : ''}
    ORDER BY wgd.period_end ASC
  `;

  const [
    directMessagesResult,
    groupMessagesResult,
    insightsResult,
    digestsResult,
  ] = await Promise.all([
    query<{
      client_id: string;
      wa_message_id: string;
      raw_text: string | null;
      direction: 'inbound' | 'outbound';
      type: string | null;
      sender_phone: string | null;
      created_at: string;
    }>(directMessagesSql, values),
    query<{
      client_id: string;
      wa_message_id: string;
      content: string | null;
      sender_name: string | null;
      sender_jid: string | null;
      type: string | null;
      created_at: string;
    }>(groupMessagesSql, values),
    query<{
      client_id: string;
      insight_id: string;
      message_id: string;
      insight_type: string;
      summary: string | null;
      sentiment: string | null;
      urgency: string | null;
      entities: any;
      actioned: boolean | null;
      created_at: string;
      message_external_id: string | null;
      sender_name: string | null;
      message_content: string | null;
      group_name: string | null;
    }>(insightsSql, values),
    query<{
      client_id: string;
      digest_id: string;
      period: 'daily' | 'weekly';
      period_start: string;
      period_end: string;
      summary: string | null;
      key_decisions: any;
      pending_actions: any;
      message_count: number | null;
      insight_count: number | null;
    }>(digestsSql, values),
  ]);

  for (const row of directMessagesResult.rows) {
    await persistWhatsAppMessageMemory({
      tenantId: params.tenantId,
      clientId: row.client_id,
      externalMessageId: row.wa_message_id,
      text: row.raw_text || '',
      senderPhone: row.sender_phone,
      direction: row.direction,
      messageType: row.type,
      createdAt: row.created_at ? new Date(row.created_at) : null,
      channel: 'cloud',
    });
  }

  for (const row of groupMessagesResult.rows) {
    await persistWhatsAppMessageMemory({
      tenantId: params.tenantId,
      clientId: row.client_id,
      externalMessageId: row.wa_message_id,
      text: row.content || '',
      senderName: row.sender_name,
      senderPhone: row.sender_jid,
      direction: 'inbound',
      messageType: row.type,
      createdAt: row.created_at ? new Date(row.created_at) : null,
      channel: 'group',
    });
  }

  for (const row of insightsResult.rows) {
    await persistWhatsAppInsightMemory({
      tenantId: params.tenantId,
      clientId: row.client_id,
      insightId: row.insight_id,
      messageId: row.message_id,
      messageExternalId: row.message_external_id,
      senderName: row.sender_name,
      groupName: row.group_name,
      messageContent: row.message_content,
      insightType: row.insight_type,
      summary: row.summary || '',
      sentiment: row.sentiment,
      urgency: row.urgency,
      entities: row.entities || {},
      actioned: Boolean(row.actioned),
      createdAt: row.created_at ? new Date(row.created_at) : null,
    });
  }

  for (const row of digestsResult.rows) {
    await persistWhatsAppDigestMemory({
      tenantId: params.tenantId,
      clientId: row.client_id,
      digestId: row.digest_id,
      period: row.period,
      periodStart: new Date(row.period_start),
      periodEnd: new Date(row.period_end),
      summary: row.summary || '',
      keyDecisions: row.key_decisions || [],
      pendingActions: row.pending_actions || [],
      messageCount: row.message_count || 0,
      insightCount: row.insight_count || 0,
    });
  }

  return {
    directMessages: directMessagesResult.rows.length,
    groupMessages: groupMessagesResult.rows.length,
    insights: insightsResult.rows.length,
    digests: digestsResult.rows.length,
  };
}
