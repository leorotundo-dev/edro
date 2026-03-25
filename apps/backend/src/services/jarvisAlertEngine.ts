/**
 * Jarvis Alert Engine — Sistema Nervoso Central
 *
 * Cruza 5 fontes e gera alertas sobre o GAP entre o que foi dito e o que está sendo feito.
 *
 * Tipos de alertas:
 *   card_stalled        — card em produção sem movimento > 48h
 *   meeting_no_card     — decisão de reunião sem card no Trello (72h)
 *   whatsapp_no_reply   — aprovação pendente sem resposta do cliente (48h)
 *   contract_expiring   — contrato renova em < 15 dias sem conversa iniciada
 *   market_opportunity  — clipping relevante sem card de posicionamento criado
 */

import { query } from '../db';

// ─── Types ────────────────────────────────────────────────────────────────────

export type JarvisAlertType =
  | 'card_stalled'
  | 'meeting_no_card'
  | 'whatsapp_no_reply'
  | 'contract_expiring'
  | 'market_opportunity'
  | 'job_no_briefing';

export type JarvisAlert = {
  tenant_id: string;
  client_id: string | null;
  alert_type: JarvisAlertType;
  title: string;
  body: string;
  source_refs: Record<string, string>;
  priority: 'urgent' | 'high' | 'medium' | 'low';
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function runJarvisAlertEngine(tenantId: string): Promise<number> {
  const alerts: JarvisAlert[] = [];

  const [stalledCards, pendingWhatsApp, expiringContracts, marketOpportunities, meetingNoCard, jobNoBriefing] = await Promise.allSettled([
    detectStalledCards(tenantId),
    detectWhatsAppNoReply(tenantId),
    detectExpiringContracts(tenantId),
    detectMarketOpportunities(tenantId),
    detectMeetingNoCard(tenantId),
    detectJobNoBriefing(tenantId),
  ]);

  if (stalledCards.status === 'fulfilled')        alerts.push(...stalledCards.value);
  if (pendingWhatsApp.status === 'fulfilled')     alerts.push(...pendingWhatsApp.value);
  if (expiringContracts.status === 'fulfilled')   alerts.push(...expiringContracts.value);
  if (marketOpportunities.status === 'fulfilled') alerts.push(...marketOpportunities.value);
  if (meetingNoCard.status === 'fulfilled')       alerts.push(...meetingNoCard.value);
  if (jobNoBriefing.status === 'fulfilled')       alerts.push(...jobNoBriefing.value);

  let saved = 0;
  for (const alert of alerts) {
    const inserted = await upsertAlert(alert);
    if (inserted) saved++;
  }

  return saved;
}

// ─── Detectors ────────────────────────────────────────────────────────────────

async function detectStalledCards(tenantId: string): Promise<JarvisAlert[]> {
  const res = await query<{
    card_id: string; card_title: string; board_id: string; board_name: string;
    list_name: string; client_id: string; client_name: string; stalled_hours: number;
  }>(
    `SELECT
       pc.id           AS card_id,
       pc.title        AS card_title,
       pb.id           AS board_id,
       pb.name         AS board_name,
       pl.name         AS list_name,
       pb.client_id,
       c.name          AS client_name,
       EXTRACT(EPOCH FROM (now() - pc.updated_at)) / 3600 AS stalled_hours
     FROM project_cards pc
     JOIN project_lists pl ON pl.id = pc.list_id
     JOIN project_boards pb ON pb.id = pc.board_id
     LEFT JOIN clients c ON c.id = pb.client_id
     WHERE pc.tenant_id = $1
       AND pc.is_archived = false
       AND pb.client_id IS NOT NULL
       AND (
         pl.name ILIKE '%ANDAMENTO%' OR pl.name ILIKE '%PRODUÇÃO%' OR
         pl.name ILIKE '%APROVAÇÃO%' OR pl.name ILIKE '%AGUARDANDO%'
       )
       AND pc.updated_at < now() - interval '48 hours'`,
    [tenantId],
  );

  return res.rows.map((r) => {
    const inApproval = r.list_name.toUpperCase().includes('APROVAÇÃO') || r.list_name.toUpperCase().includes('AGUARDANDO');
    const days = (r.stalled_hours / 24).toFixed(1);
    return {
      tenant_id: tenantId,
      client_id: r.client_id,
      alert_type: 'card_stalled',
      title: inApproval
        ? `${r.client_name}: cliente sem responder há ${days} dias`
        : `${r.client_name}: card parado há ${days} dias`,
      body: `"${r.card_title}" está em "${r.list_name}" sem movimentação há ${days} dias.`,
      source_refs: { ref_id: r.card_id, card_id: r.card_id, board_id: r.board_id },
      priority: r.stalled_hours > 96 ? 'high' : 'medium',
    };
  });
}

async function detectWhatsAppNoReply(tenantId: string): Promise<JarvisAlert[]> {
  const res = await query<{
    client_id: string; client_name: string;
    last_message: string; hours_since: number;
  }>(
    `SELECT
       c.id            AS client_id,
       c.name          AS client_name,
       wm.body         AS last_message,
       EXTRACT(EPOCH FROM (now() - wm.created_at)) / 3600 AS hours_since
     FROM whatsapp_messages wm
     JOIN clients c ON c.whatsapp_number = wm.from_number OR c.whatsapp_number = wm.to_number
     WHERE wm.tenant_id = $1
       AND wm.direction = 'outbound'
       AND wm.created_at < now() - interval '48 hours'
       AND NOT EXISTS (
         SELECT 1 FROM whatsapp_messages wm2
         WHERE wm2.tenant_id = $1
           AND (wm2.from_number = wm.to_number OR wm2.to_number = wm.from_number)
           AND wm2.direction = 'inbound'
           AND wm2.created_at > wm.created_at
       )
     ORDER BY wm.created_at ASC`,
    [tenantId],
  );

  return res.rows.map((r) => ({
    tenant_id: tenantId,
    client_id: r.client_id,
    alert_type: 'whatsapp_no_reply' as JarvisAlertType,
    title: `${r.client_name}: sem resposta no WhatsApp há ${(r.hours_since / 24).toFixed(0)} dias`,
    body: `Última mensagem enviada: "${r.last_message?.slice(0, 100)}..." — sem retorno.`,
    source_refs: { ref_id: r.client_id },
    priority: r.hours_since > 96 ? 'urgent' : 'high',
  }));
}

async function detectExpiringContracts(tenantId: string): Promise<JarvisAlert[]> {
  const res = await query<{
    client_id: string; client_name: string; contract_end: string; days_left: number;
  }>(
    `SELECT
       c.id              AS client_id,
       c.name            AS client_name,
       cf.contract_end_date AS contract_end,
       EXTRACT(DAY FROM (cf.contract_end_date - now())) AS days_left
     FROM client_financials cf
     JOIN clients c ON c.id = cf.client_id
     WHERE cf.tenant_id = $1
       AND cf.contract_end_date BETWEEN now() AND now() + interval '15 days'
       AND cf.status = 'active'`,
    [tenantId],
  );

  return res.rows.map((r) => ({
    tenant_id: tenantId,
    client_id: r.client_id,
    alert_type: 'contract_expiring' as JarvisAlertType,
    title: `${r.client_name}: contrato expira em ${Math.round(r.days_left)} dias`,
    body: `Contrato vence em ${new Date(r.contract_end).toLocaleDateString('pt-BR')}. Iniciar conversa de renovação.`,
    source_refs: { ref_id: `contract_${r.client_id}` },
    priority: r.days_left <= 5 ? 'urgent' : 'high',
  }));
}

async function detectMarketOpportunities(tenantId: string): Promise<JarvisAlert[]> {
  const res = await query<{
    client_id: string; client_name: string; item_id: string; item_title: string;
  }>(
    `SELECT
       c.id    AS client_id,
       c.name  AS client_name,
       ci.id   AS item_id,
       ci.title AS item_title
     FROM clipping_items ci
     JOIN clipping_sources cs ON cs.id = ci.source_id
     JOIN clients c ON c.id = cs.client_id
     WHERE ci.tenant_id = $1
       AND ci.published_at >= now() - interval '24 hours'
       AND ci.relevance_score >= 75
       AND ci.is_archived = false
       AND NOT EXISTS (
         SELECT 1 FROM project_cards pc
         JOIN project_boards pb ON pb.id = pc.board_id
         WHERE pb.client_id = c.id
           AND pc.tenant_id = $1
           AND pc.created_at > now() - interval '24 hours'
       )
     ORDER BY ci.relevance_score DESC`,
    [tenantId],
  );

  return res.rows.map((r) => ({
    tenant_id: tenantId,
    client_id: r.client_id,
    alert_type: 'market_opportunity' as JarvisAlertType,
    title: `${r.client_name}: oportunidade de mercado sem card`,
    body: `"${r.item_title}" — relevância alta. Nenhum card criado nas últimas 24h.`,
    source_refs: { ref_id: r.item_id, clipping_item_id: r.item_id },
    priority: 'medium',
  }));
}

/**
 * Detecta reuniões com ação/decisão registrada mas sem card criado no Trello nas últimas 72h.
 * Cruzamento: meeting_summaries (ou meeting_action_items) × project_cards.created_at
 */
async function detectMeetingNoCard(tenantId: string): Promise<JarvisAlert[]> {
  // meeting_summaries com action items WHERE no project_cards created after the meeting
  const res = await query<{
    meeting_id: string;
    meeting_title: string;
    client_id: string;
    client_name: string;
    meeting_date: string;
    hours_since: number;
  }>(
    `SELECT
       ms.id           AS meeting_id,
       ms.title        AS meeting_title,
       ms.client_id,
       c.name          AS client_name,
       ms.meeting_date::text,
       EXTRACT(EPOCH FROM (now() - ms.meeting_date)) / 3600 AS hours_since
     FROM meeting_summaries ms
     LEFT JOIN clients c ON c.id = ms.client_id
     WHERE ms.tenant_id = $1
       AND ms.meeting_date < now() - interval '72 hours'
       AND ms.meeting_date > now() - interval '7 days'
       AND ms.has_action_items = true
       AND ms.client_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM project_cards pc
         JOIN project_boards pb ON pb.id = pc.board_id
         WHERE pb.client_id = ms.client_id
           AND pc.tenant_id = $1
           AND pc.created_at > ms.meeting_date
       )
     ORDER BY ms.meeting_date ASC
     LIMIT 20`,
    [tenantId],
  );

  return res.rows.map((r) => ({
    tenant_id: tenantId,
    client_id: r.client_id,
    alert_type: 'meeting_no_card' as JarvisAlertType,
    title: `${r.client_name}: decisão de reunião sem card criado`,
    body: `"${r.meeting_title}" (${Math.round(r.hours_since)}h atrás) tem itens de ação sem card no Trello.`,
    source_refs: { ref_id: r.meeting_id, meeting_id: r.meeting_id },
    priority: r.hours_since > 96 ? 'high' : 'medium',
  }));
}

/**
 * Detecta jobs em estágio inicial (intake/briefing) sem briefing preenchido há mais de 24h.
 */
async function detectJobNoBriefing(tenantId: string): Promise<JarvisAlert[]> {
  const res = await query<{
    job_id: string;
    job_title: string;
    client_id: string;
    client_name: string;
    hours_old: number;
  }>(
    `SELECT
       j.id           AS job_id,
       j.title        AS job_title,
       j.client_id,
       c.name         AS client_name,
       EXTRACT(EPOCH FROM (now() - j.created_at)) / 3600 AS hours_old
     FROM jobs j
     LEFT JOIN clients c ON c.id = j.client_id
     WHERE j.tenant_id = $1
       AND j.status IN ('intake', 'briefing')
       AND j.created_at < now() - interval '24 hours'
       AND j.client_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM job_briefings jb WHERE jb.job_id = j.id
       )
     ORDER BY j.created_at ASC
     LIMIT 10`,
    [tenantId],
  );

  return res.rows.map((r) => ({
    tenant_id: tenantId,
    client_id: r.client_id,
    alert_type: 'job_no_briefing' as JarvisAlertType,
    title: `${r.client_name}: job sem briefing há ${Math.round(r.hours_old / 24)} dias`,
    body: `"${r.job_title}" está em intake/briefing sem briefing preenchido.`,
    source_refs: { ref_id: r.job_id, job_id: r.job_id },
    priority: r.hours_old > 48 ? 'high' : 'medium',
  }));
}

// ─── Persistence ──────────────────────────────────────────────────────────────

async function upsertAlert(alert: JarvisAlert): Promise<boolean> {
  try {
    const res = await query(
      `INSERT INTO jarvis_alerts (tenant_id, client_id, alert_type, title, body, source_refs, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tenant_id, client_id, alert_type, (source_refs->>'ref_id'))
       WHERE status = 'open'
       DO NOTHING
       RETURNING id`,
      [
        alert.tenant_id,
        alert.client_id,
        alert.alert_type,
        alert.title,
        alert.body,
        JSON.stringify(alert.source_refs),
        alert.priority,
      ],
    );
    return (res.rowCount ?? 0) > 0;
  } catch {
    return false;
  }
}

// ─── Query helpers ────────────────────────────────────────────────────────────

export async function getJarvisAlerts(
  tenantId: string,
  clientId?: string,
  limit = 20,
): Promise<any[]> {
  const where = clientId
    ? `WHERE ja.tenant_id = $1 AND ja.client_id = $2 AND ja.status = 'open'`
    : `WHERE ja.tenant_id = $1 AND ja.status = 'open'`;
  const params = clientId ? [tenantId, clientId] : [tenantId];

  const res = await query(
    `SELECT ja.*, c.name AS client_name
     FROM jarvis_alerts ja
     LEFT JOIN clients c ON c.id = ja.client_id
     ${where}
     ORDER BY CASE ja.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
              ja.created_at DESC
     LIMIT ${limit}`,
    params,
  );
  return res.rows;
}

export async function dismissAlert(alertId: string, tenantId: string): Promise<void> {
  await query(
    `UPDATE jarvis_alerts SET status = 'dismissed', updated_at = now()
     WHERE id = $1 AND tenant_id = $2`,
    [alertId, tenantId],
  );
}

export async function snoozeAlert(alertId: string, tenantId: string, hours: number): Promise<void> {
  await query(
    `UPDATE jarvis_alerts SET status = 'snoozed', snoozed_until = now() + ($3 || ' hours')::interval, updated_at = now()
     WHERE id = $1 AND tenant_id = $2`,
    [alertId, tenantId, hours],
  );
}
