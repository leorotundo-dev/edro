/**
 * signalService.ts — Unified operational signal feed
 *
 * Emits signals from all system domains into `operational_signals` table.
 * Called by the operationsRuntimeWorker after each rebuild cycle.
 */

import { query } from '../db';

type SignalAction = {
  label: string;
  href?: string;
  action_type?: string;
};

type SignalInput = {
  tenantId: string;
  domain: string;
  signalType: string;
  severity: number;
  title: string;
  summary?: string;
  entityType?: string;
  entityId?: string;
  clientId?: string;
  clientName?: string;
  actions?: SignalAction[];
  dedupKey: string;
  expiresAt?: string;
};

async function upsertSignal(input: SignalInput): Promise<void> {
  await query(
    `INSERT INTO operational_signals
       (tenant_id, domain, signal_type, severity, title, summary,
        entity_type, entity_id, client_id, client_name, actions, dedup_key, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (tenant_id, dedup_key) WHERE dedup_key IS NOT NULL AND resolved_at IS NULL
     DO UPDATE SET
       severity = EXCLUDED.severity,
       title = EXCLUDED.title,
       summary = EXCLUDED.summary,
       actions = EXCLUDED.actions,
       expires_at = EXCLUDED.expires_at`,
    [
      input.tenantId, input.domain, input.signalType, input.severity,
      input.title, input.summary || null,
      input.entityType || null, input.entityId || null,
      input.clientId || null, input.clientName || null,
      JSON.stringify(input.actions || []),
      input.dedupKey, input.expiresAt || null,
    ],
  );
}

async function resolveSignals(tenantId: string, dedupKeys: string[]): Promise<void> {
  if (!dedupKeys.length) return;
  await query(
    `UPDATE operational_signals
     SET resolved_at = now()
     WHERE tenant_id = $1
       AND dedup_key = ANY($2)
       AND resolved_at IS NULL`,
    [tenantId, dedupKeys],
  );
}

// ─── Signal emitters ───

async function emitJobSignals(tenantId: string): Promise<string[]> {
  const { rows: jobs } = await query<{
    id: string; title: string; status: string;
    priority_band: string; owner_id: string | null; owner_name: string | null;
    client_id: string | null; client_name: string | null;
    deadline_at: string | null; is_urgent: boolean;
  }>(
    `SELECT j.id, j.title, j.status, j.priority_band, j.owner_id,
            COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS owner_name,
            j.client_id, c.name AS client_name, j.deadline_at, j.is_urgent
     FROM jobs j
     LEFT JOIN clients c ON c.id = j.client_id
     LEFT JOIN edro_users u ON u.id::text = j.owner_id::text
     WHERE j.tenant_id = $1
       AND j.status NOT IN ('done','archived')
     ORDER BY j.priority_score DESC
     LIMIT 100`,
    [tenantId],
  );

  const emitted: string[] = [];

  for (const j of jobs) {
    const now = Date.now();
    const deadline = j.deadline_at ? new Date(j.deadline_at).getTime() : null;
    const hoursLeft = deadline ? (deadline - now) / 3600000 : null;

    // Blocked jobs
    if (j.status === 'blocked') {
      const key = `job-blocked-${j.id}`;
      emitted.push(key);
      await upsertSignal({
        tenantId, domain: 'jobs', signalType: 'decision', severity: 95,
        title: `${j.title} está bloqueado`,
        summary: `Responsável: ${j.owner_name || 'ninguém'}. Precisa de ação para desbloquear.`,
        entityType: 'job', entityId: j.id,
        clientId: j.client_id || undefined, clientName: j.client_name || undefined,
        actions: [
          { label: 'Resolver', href: `/admin/operacoes/jobs?highlight=${j.id}` },
          { label: 'Reatribuir', action_type: 'reassign' },
        ],
        dedupKey: key,
      });
    }

    // P0 without owner
    if (j.priority_band === 'p0' && !j.owner_id) {
      const key = `job-p0-no-owner-${j.id}`;
      emitted.push(key);
      await upsertSignal({
        tenantId, domain: 'jobs', signalType: 'decision', severity: 92,
        title: `${j.title} é P0 sem responsável`,
        summary: `Demanda crítica sem ninguém atribuído.`,
        entityType: 'job', entityId: j.id,
        clientId: j.client_id || undefined, clientName: j.client_name || undefined,
        actions: [{ label: 'Alocar', href: `/admin/operacoes/semana` }],
        dedupKey: key,
      });
    }

    // Overdue
    if (hoursLeft !== null && hoursLeft <= 0) {
      const key = `job-overdue-${j.id}`;
      emitted.push(key);
      await upsertSignal({
        tenantId, domain: 'jobs', signalType: 'decision', severity: 98,
        title: `${j.title} está atrasado`,
        summary: `Prazo expirou. ${j.owner_name ? `Responsável: ${j.owner_name}` : 'Sem responsável'}`,
        entityType: 'job', entityId: j.id,
        clientId: j.client_id || undefined, clientName: j.client_name || undefined,
        actions: [
          { label: 'Ver demanda', href: `/admin/operacoes/jobs?highlight=${j.id}` },
          { label: 'Adiar', action_type: 'postpone' },
        ],
        dedupKey: key,
      });
    }

    // Due in 24h
    if (hoursLeft !== null && hoursLeft > 0 && hoursLeft <= 24) {
      const key = `job-due24h-${j.id}`;
      emitted.push(key);
      await upsertSignal({
        tenantId, domain: 'jobs', signalType: 'attention', severity: 82,
        title: `${j.title} vence em menos de 24h`,
        entityType: 'job', entityId: j.id,
        clientId: j.client_id || undefined, clientName: j.client_name || undefined,
        actions: [{ label: 'Ver demanda', href: `/admin/operacoes/jobs?highlight=${j.id}` }],
        dedupKey: key,
      });
    }

    // Awaiting approval > 48h
    if (j.status === 'awaiting_approval') {
      const key = `job-approval-pending-${j.id}`;
      emitted.push(key);
      await upsertSignal({
        tenantId, domain: 'jobs', signalType: 'attention', severity: 76,
        title: `${j.title} aguardando aprovação`,
        summary: j.client_name ? `Cliente: ${j.client_name}` : undefined,
        entityType: 'job', entityId: j.id,
        clientId: j.client_id || undefined, clientName: j.client_name || undefined,
        actions: [
          { label: 'Cobrar', action_type: 'nudge_approval' },
          { label: 'Ver', href: `/admin/operacoes/jobs?highlight=${j.id}` },
        ],
        dedupKey: key,
      });
    }

    // Jobs without owner (non-P0)
    if (!j.owner_id && j.priority_band !== 'p0') {
      const key = `job-no-owner-${j.id}`;
      emitted.push(key);
      await upsertSignal({
        tenantId, domain: 'jobs', signalType: 'action', severity: 54,
        title: `${j.title} sem responsável`,
        entityType: 'job', entityId: j.id,
        clientId: j.client_id || undefined, clientName: j.client_name || undefined,
        actions: [{ label: 'Alocar', href: `/admin/operacoes/semana` }],
        dedupKey: key,
      });
    }
  }

  return emitted;
}

async function emitWhatsAppSignals(tenantId: string): Promise<string[]> {
  // Unanswered client messages (groups with recent messages not replied by team)
  const { rows } = await query<{
    client_id: string; client_name: string; msg_count: number; last_at: string;
  }>(
    `SELECT wgm.client_id, c.name AS client_name,
            COUNT(*) AS msg_count,
            MAX(wgm.created_at) AS last_at
     FROM whatsapp_group_messages wgm
     JOIN clients c ON c.id = wgm.client_id
     WHERE wgm.tenant_id = $1
       AND wgm.created_at > now() - INTERVAL '48 hours'
       AND wgm.sender_is_team = false
     GROUP BY wgm.client_id, c.name
     HAVING COUNT(*) >= 3
     ORDER BY msg_count DESC
     LIMIT 10`,
    [tenantId],
  ).catch(() => ({ rows: [] as any[] }));

  const emitted: string[] = [];
  for (const r of rows) {
    const key = `whatsapp-attention-${r.client_id}`;
    emitted.push(key);
    await upsertSignal({
      tenantId, domain: 'whatsapp', signalType: 'attention', severity: 72,
      title: `${r.client_name}: ${r.msg_count} mensagens recentes no grupo`,
      summary: `Últimas 48h sem resposta da equipe.`,
      entityType: 'client', entityId: r.client_id,
      clientId: r.client_id, clientName: r.client_name,
      actions: [
        { label: 'Ver conversa', href: `/clients/${r.client_id}/whatsapp` },
        { label: 'Responder', action_type: 'reply' },
      ],
      dedupKey: key,
    });
  }
  return emitted;
}

async function emitMeetingSignals(tenantId: string): Promise<string[]> {
  const { rows } = await query<{
    id: string; title: string; client_name: string | null; action_count: number;
  }>(
    `SELECT m.id, m.title, c.name AS client_name,
            COUNT(ma.id) AS action_count
     FROM meetings m
     LEFT JOIN clients c ON c.id = m.client_id
     LEFT JOIN meeting_actions ma ON ma.meeting_id = m.id AND ma.status = 'pending'
     WHERE m.tenant_id = $1
       AND m.created_at > now() - INTERVAL '7 days'
     GROUP BY m.id, m.title, c.name
     HAVING COUNT(ma.id) > 0
     ORDER BY action_count DESC
     LIMIT 10`,
    [tenantId],
  ).catch(() => ({ rows: [] as any[] }));

  const emitted: string[] = [];
  for (const r of rows) {
    const key = `meeting-actions-${r.id}`;
    emitted.push(key);
    await upsertSignal({
      tenantId, domain: 'meeting', signalType: 'action', severity: 65,
      title: `Reunião "${r.title}" tem ${r.action_count} ações pendentes`,
      summary: r.client_name ? `Cliente: ${r.client_name}` : undefined,
      entityType: 'meeting', entityId: r.id,
      actions: [
        { label: 'Ver ações', href: `/admin/reunioes` },
        { label: 'Criar jobs', action_type: 'create_jobs' },
      ],
      dedupKey: key,
    });
  }
  return emitted;
}

async function emitConnectorSignals(tenantId: string): Promise<string[]> {
  const { rows } = await query<{
    id: string; platform: string; client_name: string; client_id: string;
  }>(
    `SELECT cn.id, cn.platform, c.name AS client_name, c.id AS client_id
     FROM connectors cn
     JOIN clients c ON c.id = cn.client_id
     WHERE cn.tenant_id = $1
       AND cn.status = 'expired'`,
    [tenantId],
  ).catch(() => ({ rows: [] as any[] }));

  const emitted: string[] = [];
  for (const r of rows) {
    const key = `connector-expired-${r.id}`;
    emitted.push(key);
    await upsertSignal({
      tenantId, domain: 'health', signalType: 'health', severity: 45,
      title: `Connector ${r.platform} de ${r.client_name} expirou`,
      entityType: 'connector', entityId: r.id,
      clientId: r.client_id, clientName: r.client_name,
      actions: [
        { label: 'Reconectar', href: `/clients/${r.client_id}/connectors` },
      ],
      dedupKey: key,
    });
  }
  return emitted;
}

async function emitInsightSignals(tenantId: string): Promise<string[]> {
  // One signal per client with pending unconfirmed WhatsApp insights
  const { rows } = await query<{
    client_id: string; client_name: string | null; pending_count: string;
  }>(
    `SELECT i.client_id, c.name AS client_name, COUNT(*) AS pending_count
       FROM whatsapp_message_insights i
       LEFT JOIN clients c ON c.id::text = i.client_id
      WHERE i.tenant_id = $1
        AND i.confirmation_status = 'pending'
        AND i.created_at > now() - INTERVAL '7 days'
      GROUP BY i.client_id, c.name
     HAVING COUNT(*) >= 1
      ORDER BY pending_count DESC
      LIMIT 10`,
    [tenantId],
  ).catch(() => ({ rows: [] as any[] }));

  const emitted: string[] = [];
  for (const r of rows) {
    const cnt = Number(r.pending_count);
    const key = `insights-pending-${r.client_id}`;
    emitted.push(key);
    await upsertSignal({
      tenantId, domain: 'whatsapp', signalType: 'insights_pending', severity: 68,
      title: `${r.client_name ?? 'Cliente'}: ${cnt} insight${cnt !== 1 ? 's' : ''} aguardando confirmação`,
      summary: `Interpretações do WhatsApp precisam ser revisadas para virar memória permanente.`,
      entityType: 'client', entityId: r.client_id,
      clientId: r.client_id, clientName: r.client_name ?? undefined,
      actions: [
        { label: 'Revisar insights', href: `/clients/${r.client_id}/whatsapp` },
      ],
      dedupKey: key,
    });
  }
  return emitted;
}

// ─── Main orchestrator ───

export async function rebuildOperationalSignals(tenantId: string): Promise<void> {
  const allEmittedKeys: string[] = [];

  try {
    const jobKeys = await emitJobSignals(tenantId);
    allEmittedKeys.push(...jobKeys);
  } catch (err: any) {
    console.error(`[signals] emitJobSignals failed:`, err?.message);
  }

  try {
    const waKeys = await emitWhatsAppSignals(tenantId);
    allEmittedKeys.push(...waKeys);
  } catch (err: any) {
    console.error(`[signals] emitWhatsAppSignals failed:`, err?.message);
  }

  try {
    const insightKeys = await emitInsightSignals(tenantId);
    allEmittedKeys.push(...insightKeys);
  } catch (err: any) {
    console.error(`[signals] emitInsightSignals failed:`, err?.message);
  }

  try {
    const meetKeys = await emitMeetingSignals(tenantId);
    allEmittedKeys.push(...meetKeys);
  } catch (err: any) {
    console.error(`[signals] emitMeetingSignals failed:`, err?.message);
  }

  try {
    const connKeys = await emitConnectorSignals(tenantId);
    allEmittedKeys.push(...connKeys);
  } catch (err: any) {
    console.error(`[signals] emitConnectorSignals failed:`, err?.message);
  }

  // Auto-resolve signals whose source condition is no longer true
  if (allEmittedKeys.length) {
    await query(
      `UPDATE operational_signals
       SET resolved_at = now()
       WHERE tenant_id = $1
         AND resolved_at IS NULL
         AND dedup_key IS NOT NULL
         AND dedup_key NOT IN (SELECT unnest($2::text[]))
         AND created_at < now() - INTERVAL '2 minutes'`,
      [tenantId, allEmittedKeys],
    ).catch(() => {});
  }

  // Expire old signals
  await query(
    `UPDATE operational_signals
     SET resolved_at = now()
     WHERE tenant_id = $1
       AND resolved_at IS NULL
       AND expires_at IS NOT NULL
       AND expires_at < now()`,
    [tenantId],
  ).catch(() => {});
}
