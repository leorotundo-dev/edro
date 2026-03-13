import { createHash } from 'crypto';
import { query } from '../../db';
import { calculatePriority } from './priorityService';
import { estimateMinutes } from './estimationService';

type SyncCounter = {
  created: number;
  updated: number;
  skipped: number;
};

type SyncSummary = {
  meeting_actions: SyncCounter;
  whatsapp: SyncCounter;
  publication: SyncCounter;
  approval: SyncCounter;
  total_created: number;
  total_updated: number;
  total_skipped: number;
};

type SourceJobDraft = {
  clientId?: string | null;
  title: string;
  summary?: string | null;
  jobType: string;
  complexity: 's' | 'm' | 'l';
  channel?: string | null;
  source: string;
  impactLevel: number;
  dependencyLevel: number;
  requiredSkill?: string | null;
  ownerId?: string | null;
  deadlineAt?: string | null;
  estimatedMinutes?: number | null;
  isUrgent?: boolean;
  urgencyReason?: string | null;
  definitionOfDone?: string | null;
  status?: string;
  metadata?: Record<string, any>;
};

type OwnerLookup = {
  byEmail: Map<string, string>;
  byName: Map<string, string>;
};

const NO_OWNER_TOKENS = new Set([
  'agencia',
  'agência',
  'cliente',
  'interno',
  'interna',
  'time',
  'equipe',
  'jarvis',
  'edro',
]);

function emptyCounter(): SyncCounter {
  return { created: 0, updated: 0, skipped: 0 };
}

function normalizeText(value: unknown) {
  return String(value || '').trim();
}

function normalizeOwnerToken(value: unknown) {
  return normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function buildHashKey(parts: Array<string | number | null | undefined>) {
  return createHash('sha1')
    .update(parts.map((part) => String(part || '')).join('|'))
    .digest('hex');
}

function deriveStatus(draft: SourceJobDraft) {
  if (draft.status) return draft.status;
  return draft.ownerId && draft.deadlineAt && draft.requiredSkill ? 'ready' : 'planned';
}

function deriveSyncedStatus(existingStatus: string, draft: SourceJobDraft) {
  if (!draft.status) return existingStatus;
  if (['done', 'archived'].includes(existingStatus)) return existingStatus;
  if (['publication', 'approval'].includes(draft.source)) return draft.status;
  return existingStatus;
}

function isIntakeComplete(draft: SourceJobDraft) {
  return Boolean(
    draft.clientId &&
    draft.title &&
    draft.jobType &&
    draft.complexity &&
    draft.source &&
    draft.deadlineAt &&
    draft.requiredSkill &&
    draft.ownerId
  );
}

async function loadOwnerLookup(tenantId: string): Promise<OwnerLookup> {
  const { rows } = await query<{
    id: string;
    name: string | null;
    email: string | null;
  }>(
    `SELECT
       u.id,
       COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS name,
       u.email
     FROM tenant_users tu
     JOIN edro_users u ON u.id = tu.user_id
    WHERE tu.tenant_id = $1`,
    [tenantId],
  );

  const byEmail = new Map<string, string>();
  const byName = new Map<string, string>();

  for (const row of rows) {
    const email = normalizeOwnerToken(row.email);
    const name = normalizeOwnerToken(row.name);
    if (email) byEmail.set(email, row.id);
    if (name) byName.set(name, row.id);
  }

  return { byEmail, byName };
}

function resolveOwnerId(ownerLookup: OwnerLookup, rawValue: unknown) {
  const token = normalizeOwnerToken(rawValue);
  if (!token || NO_OWNER_TOKENS.has(token)) return null;
  if (ownerLookup.byEmail.has(token)) return ownerLookup.byEmail.get(token) || null;
  if (ownerLookup.byName.has(token)) return ownerLookup.byName.get(token) || null;

  if (token.includes('@')) {
    const localPart = token.split('@')[0];
    if (ownerLookup.byName.has(localPart)) return ownerLookup.byName.get(localPart) || null;
  }

  return null;
}

async function upsertSourceJob(
  tenantId: string,
  metadataKey: string,
  metadataValue: string,
  draft: SourceJobDraft,
): Promise<'created' | 'updated' | 'skipped'> {
  const { rows } = await query<any>(
    `SELECT *
       FROM jobs
      WHERE tenant_id = $1
        AND source = $2
        AND metadata ->> $3 = $4
      LIMIT 1`,
    [tenantId, draft.source, metadataKey, metadataValue],
  );

  const metadata = {
    ...(draft.metadata || {}),
    [metadataKey]: metadataValue,
  };

  const status = deriveStatus(draft);
  const priority = calculatePriority({
    deadlineAt: draft.deadlineAt,
    impactLevel: draft.impactLevel,
    dependencyLevel: draft.dependencyLevel,
    clientWeight: Number(metadata.client_weight ?? 3),
    isUrgent: draft.isUrgent,
    intakeComplete: isIntakeComplete({ ...draft, status }),
    blocked: status === 'blocked' || status === 'awaiting_approval',
  });

  const estimatedMinutes =
    draft.estimatedMinutes ??
    estimateMinutes({
      jobType: draft.jobType,
      complexity: draft.complexity,
      channel: draft.channel,
    });

  if (!rows.length) {
    const { rows: createdRows } = await query<any>(
      `INSERT INTO jobs (
         tenant_id,
         client_id,
         title,
         summary,
         job_type,
         complexity,
         channel,
         source,
         status,
         priority_score,
         priority_band,
         impact_level,
         dependency_level,
         required_skill,
         owner_id,
         deadline_at,
         estimated_minutes,
         is_urgent,
         urgency_reason,
         definition_of_done,
         metadata
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21::jsonb
       )
       RETURNING id, status`,
      [
        tenantId,
        draft.clientId ?? null,
        draft.title,
        draft.summary ?? null,
        draft.jobType,
        draft.complexity,
        draft.channel ?? null,
        draft.source,
        status,
        priority.priorityScore,
        priority.priorityBand,
        draft.impactLevel,
        draft.dependencyLevel,
        draft.requiredSkill ?? null,
        draft.ownerId ?? null,
        draft.deadlineAt ?? null,
        estimatedMinutes,
        Boolean(draft.isUrgent),
        draft.urgencyReason ?? null,
        draft.definitionOfDone ?? null,
        JSON.stringify(metadata),
      ],
    );

    await query(
      `INSERT INTO job_status_history (job_id, from_status, to_status, reason)
       VALUES ($1, $2, $3, $4)`,
      [createdRows[0].id, null, status, `${draft.source}_sync`],
    );

    return 'created';
  }

  const existing = rows[0];
  if (['done', 'archived'].includes(existing.status)) {
    return 'skipped';
  }

  const nextOwnerId = existing.owner_id ?? draft.ownerId ?? null;
  const nextRequiredSkill = existing.required_skill ?? draft.requiredSkill ?? null;
  const nextStatus = deriveSyncedStatus(existing.status, draft);
  const nextMetadata = {
    ...(existing.metadata || {}),
    ...metadata,
  };
  const nextPriority = calculatePriority({
    deadlineAt: draft.deadlineAt ?? existing.deadline_at,
    impactLevel: draft.impactLevel ?? existing.impact_level,
    dependencyLevel: draft.dependencyLevel ?? existing.dependency_level,
    clientWeight: Number(nextMetadata.client_weight ?? 3),
    isUrgent: draft.isUrgent ?? existing.is_urgent,
    intakeComplete: isIntakeComplete({
      ...draft,
      clientId: draft.clientId ?? existing.client_id,
      title: draft.title || existing.title,
      jobType: draft.jobType || existing.job_type,
      complexity: (draft.complexity || existing.complexity) as 's' | 'm' | 'l',
      source: draft.source || existing.source,
      deadlineAt: draft.deadlineAt ?? existing.deadline_at,
      requiredSkill: nextRequiredSkill,
      ownerId: nextOwnerId,
      status: nextStatus,
    }),
    blocked: nextStatus === 'blocked' || nextStatus === 'awaiting_approval',
  });

  await query(
    `UPDATE jobs
        SET client_id = $3,
            title = $4,
            summary = $5,
            job_type = $6,
            complexity = $7,
            channel = $8,
            priority_score = $9,
            priority_band = $10,
            impact_level = $11,
            dependency_level = $12,
            required_skill = $13,
            owner_id = $14,
            deadline_at = $15,
            estimated_minutes = $16,
            is_urgent = $17,
            urgency_reason = $18,
            definition_of_done = $19,
            metadata = $20::jsonb
      WHERE tenant_id = $1
        AND id = $2`,
    [
      tenantId,
      existing.id,
      draft.clientId ?? existing.client_id,
      draft.title || existing.title,
      draft.summary ?? existing.summary,
      draft.jobType || existing.job_type,
      draft.complexity || existing.complexity,
      draft.channel ?? existing.channel,
      nextPriority.priorityScore,
      nextPriority.priorityBand,
      draft.impactLevel ?? existing.impact_level,
      draft.dependencyLevel ?? existing.dependency_level,
      nextRequiredSkill,
      nextOwnerId,
      draft.deadlineAt ?? existing.deadline_at,
      estimatedMinutes ?? existing.estimated_minutes,
      draft.isUrgent ?? existing.is_urgent,
      draft.urgencyReason ?? existing.urgency_reason,
      draft.definitionOfDone ?? existing.definition_of_done,
      JSON.stringify(nextMetadata),
    ],
  );

  if (existing.status !== nextStatus) {
    await query(
      `INSERT INTO job_status_history (job_id, from_status, to_status, reason)
       VALUES ($1, $2, $3, $4)`,
      [existing.id, existing.status, nextStatus, `${draft.source}_sync`],
    );
  }

  return 'updated';
}

function mapMeetingActionToDraft(action: any, ownerLookup: OwnerLookup): SourceJobDraft | null {
  if (action.type === 'note') return null;

  let jobType: string = 'briefing';
  let requiredSkill: string = 'atendimento';
  let complexity: 's' | 'm' | 'l' = 'm';
  let impactLevel = 3;
  let dependencyLevel = 3;

  if (action.type === 'campaign') {
    jobType = 'campaign';
    requiredSkill = 'estrategia';
    complexity = 'l';
    impactLevel = 4;
    dependencyLevel = 4;
  } else if (action.type === 'pauta') {
    jobType = 'briefing';
    requiredSkill = 'copy';
    complexity = 's';
    impactLevel = 3;
    dependencyLevel = 2;
  } else if (action.type === 'task') {
    jobType = action.priority === 'high' ? 'urgent_request' : 'briefing';
    requiredSkill = 'operacao';
    complexity = action.priority === 'high' ? 'm' : 's';
    impactLevel = action.priority === 'high' ? 5 : 3;
    dependencyLevel = 3;
  }

  return {
    clientId: action.client_id,
    title: normalizeText(action.title),
    summary: [normalizeText(action.description), normalizeText(action.raw_excerpt)]
      .filter(Boolean)
      .join('\n\n')
      .trim(),
    jobType,
    complexity,
    source: 'meeting',
    impactLevel,
    dependencyLevel,
    requiredSkill,
    ownerId: resolveOwnerId(ownerLookup, action.responsible),
    deadlineAt: action.deadline ? new Date(action.deadline).toISOString() : null,
    estimatedMinutes: null,
    isUrgent: action.priority === 'high',
    urgencyReason: action.priority === 'high' ? 'Ação pendente extraída de reunião' : null,
    definitionOfDone: 'Demanda encaminhada e pronta para seguir o fluxo operacional.',
    metadata: {
      meeting_action_id: action.id,
      meeting_id: action.meeting_id,
      meeting_title: action.meeting_title,
      source_subtype: action.type,
      source_priority: action.priority,
      raw_excerpt: action.raw_excerpt ?? null,
    },
  };
}

function parseWhatsappPendingAction(raw: any) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    return {
      action: normalizeText(raw),
      owner: null,
      deadline: null,
    };
  }
  if (typeof raw === 'object') {
    return {
      action: normalizeText(raw.action || raw.title || raw.summary),
      owner: normalizeText(raw.owner || raw.responsible),
      deadline: normalizeText(raw.deadline || raw.due_at || raw.date),
    };
  }
  return null;
}

function mapWhatsappActionToDraft(
  digest: any,
  clientName: string,
  item: { action: string; owner?: string | null; deadline?: string | null },
  ownerLookup: OwnerLookup,
): SourceJobDraft | null {
  if (!item.action) return null;
  const ownerToken = normalizeOwnerToken(item.owner);
  if (ownerToken === 'cliente') return null;

  const deadlineDate = item.deadline ? new Date(item.deadline) : null;
  const validDeadline = deadlineDate && !Number.isNaN(deadlineDate.getTime()) ? deadlineDate.toISOString() : null;
  const isUrgent = validDeadline ? deadlineDate!.getTime() - Date.now() <= 48 * 3600 * 1000 : /urgente|hoje|amanh[ãa]/i.test(item.action);

  return {
    clientId: digest.client_id,
    title: item.action,
    summary: digest.summary ? `${clientName}: ${digest.summary}` : `Ação captada do grupo de WhatsApp de ${clientName}.`,
    jobType: isUrgent ? 'urgent_request' : 'briefing',
    complexity: isUrgent ? 'm' : 's',
    source: 'whatsapp',
    impactLevel: isUrgent ? 4 : 3,
    dependencyLevel: 2,
    requiredSkill: isUrgent ? 'operacao' : 'atendimento',
    ownerId: resolveOwnerId(ownerLookup, item.owner),
    deadlineAt: validDeadline,
    estimatedMinutes: null,
    isUrgent,
    urgencyReason: isUrgent ? 'Ação pendente captada do WhatsApp' : null,
    definitionOfDone: 'Demanda recebida do cliente, triada e encaminhada no fluxo da operação.',
    metadata: {
      whatsapp_digest_id: digest.id,
      whatsapp_period: digest.period,
      source_subtype: 'pending_action',
    },
  };
}

function mapPublicationToDraft(row: any): SourceJobDraft {
  const normalizedStatus = String(row.status || '').toLowerCase();
  const nextStatus =
    normalizedStatus === 'failed' ? 'blocked'
      : normalizedStatus === 'processing' ? 'scheduled'
        : 'scheduled';
  return {
    clientId: row.client_id ?? null,
    title: row.title ? `${row.title} · ${row.channel}` : `Publicação ${row.channel}`,
    summary: 'Publicação programada e acompanhada pela Central de Operações.',
    jobType: 'publication',
    complexity: 's',
    channel: row.channel,
    source: 'publication',
    status: nextStatus,
    impactLevel: 5,
    dependencyLevel: 4,
    requiredSkill: 'social',
    ownerId: null,
    deadlineAt: row.scheduled_for ? new Date(row.scheduled_for).toISOString() : null,
    estimatedMinutes: 30,
    isUrgent: row.scheduled_for ? new Date(row.scheduled_for).getTime() - Date.now() <= 24 * 3600 * 1000 : false,
    urgencyReason: 'Publicação programada na janela operacional',
    definitionOfDone: 'Conteúdo agendado ou publicado com confirmação.',
    metadata: {
      publication_schedule_id: row.id,
      publication_status: row.status,
      publication_scheduled_for: row.scheduled_for ? new Date(row.scheduled_for).toISOString() : null,
      briefing_id: row.briefing_id,
      source_subtype: row.channel,
    },
  };
}

function mapApprovalToDraft(row: any): SourceJobDraft {
  const decision = String(row.latest_decision || '').toLowerCase();
  const hasDecision = decision === 'approved' || decision === 'rejected';
  const nextStatus =
    decision === 'approved' ? 'approved'
      : decision === 'rejected' ? 'blocked'
        : 'awaiting_approval';

  const deadlineAt = row.due_at
    ? new Date(row.due_at).toISOString()
    : row.expires_at
      ? new Date(row.expires_at).toISOString()
      : null;

  const feedback = normalizeText(row.latest_feedback);
  const approvalLabel = hasDecision
    ? decision === 'approved' ? 'Aprovação concluída pelo cliente' : 'Aprovação rejeitada pelo cliente'
    : 'Aprovação pendente do cliente';

  return {
    clientId: row.client_id ?? null,
    title: row.title ? `Aprovação · ${row.title}` : 'Aprovação do cliente',
    summary: [
      approvalLabel,
      normalizeText(row.client_name) ? `Cliente: ${normalizeText(row.client_name)}` : '',
      feedback ? `Feedback: ${feedback}` : '',
    ].filter(Boolean).join('\n'),
    jobType: 'approval',
    complexity: 's',
    source: 'approval',
    status: nextStatus,
    impactLevel: decision === 'rejected' ? 5 : 4,
    dependencyLevel: 5,
    requiredSkill: 'atendimento',
    ownerId: null,
    deadlineAt,
    estimatedMinutes: 30,
    isUrgent: !hasDecision && Boolean(deadlineAt && new Date(deadlineAt).getTime() - Date.now() <= 24 * 3600 * 1000),
    urgencyReason: !hasDecision ? 'Cliente ainda precisa aprovar a entrega.' : null,
    definitionOfDone: decision === 'approved'
      ? 'Aprovação registrada e pronta para seguir o fluxo.'
      : decision === 'rejected'
        ? 'Revisão registrada e aguardando reencaminhamento.'
        : 'Cliente aprovou ou devolveu a peça para a operação seguir.',
    metadata: {
      pipeline_share_token: row.token,
      briefing_id: row.briefing_id,
      client_approval_section: row.latest_section ?? null,
      client_approval_decision: decision || null,
      client_approval_feedback: feedback || null,
      approval_expires_at: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      approval_decided_at: row.latest_decided_at ? new Date(row.latest_decided_at).toISOString() : null,
      source_subtype: 'pipeline_client_approval',
    },
  };
}

async function syncMeetingActions(tenantId: string, ownerLookup: OwnerLookup) {
  const counter = emptyCounter();
  const { rows } = await query<any>(
    `SELECT
       ma.id,
       ma.meeting_id,
       ma.client_id,
       ma.type,
       ma.title,
       ma.description,
       ma.responsible,
       ma.deadline,
       ma.priority,
       ma.raw_excerpt,
       m.title AS meeting_title
     FROM meeting_actions ma
     JOIN meetings m ON m.id = ma.meeting_id
    WHERE ma.tenant_id = $1
      AND ma.status = 'pending'
      AND ma.type <> 'note'
    ORDER BY ma.created_at DESC`,
    [tenantId],
  );

  for (const row of rows) {
    const draft = mapMeetingActionToDraft(row, ownerLookup);
    if (!draft) {
      counter.skipped += 1;
      continue;
    }
    const result = await upsertSourceJob(tenantId, 'meeting_action_id', row.id, draft);
    counter[result] += 1;
  }

  return counter;
}

async function syncWhatsappDigests(tenantId: string, ownerLookup: OwnerLookup) {
  const counter = emptyCounter();
  const { rows } = await query<any>(
    `SELECT DISTINCT ON (d.client_id)
       d.id,
       d.client_id,
       d.period,
       d.summary,
       d.pending_actions,
       d.created_at,
       c.name AS client_name
     FROM whatsapp_group_digests d
     LEFT JOIN clients c ON c.id = d.client_id
    WHERE d.tenant_id = $1
      AND d.created_at > NOW() - INTERVAL '21 days'
    ORDER BY d.client_id, d.created_at DESC`,
    [tenantId],
  );

  for (const digest of rows) {
    const pendingActions = Array.isArray(digest.pending_actions) ? digest.pending_actions : [];
    for (const rawAction of pendingActions) {
      const parsed = parseWhatsappPendingAction(rawAction);
      if (!parsed?.action) {
        counter.skipped += 1;
        continue;
      }

      const actionKey = buildHashKey([digest.id, parsed.action, parsed.owner, parsed.deadline]);
      const draft = mapWhatsappActionToDraft(
        digest,
        digest.client_name || digest.client_id || 'Cliente',
        parsed,
        ownerLookup,
      );
      if (!draft) {
        counter.skipped += 1;
        continue;
      }
      draft.metadata = {
        ...(draft.metadata || {}),
        whatsapp_action_key: actionKey,
      };
      const result = await upsertSourceJob(tenantId, 'whatsapp_action_key', actionKey, draft);
      counter[result] += 1;
    }
  }

  return counter;
}

async function syncPublicationSchedule(tenantId: string) {
  const counter = emptyCounter();
  const { rows } = await query<any>(
    `SELECT
       ps.id,
       ps.briefing_id,
       ps.channel,
       ps.status,
       ps.scheduled_for,
       b.title,
       COALESCE(b.main_client_id, fallback.id) AS client_id
     FROM edro_publish_schedule ps
     JOIN edro_briefings b ON b.id = ps.briefing_id
     LEFT JOIN edro_clients ec ON ec.id = b.client_id
     LEFT JOIN clients fallback ON LOWER(fallback.name) = LOWER(ec.name) AND fallback.tenant_id = $1
    WHERE ps.status IN ('scheduled', 'processing', 'failed')
      AND ps.scheduled_for >= NOW() - INTERVAL '2 days'
      AND ps.scheduled_for <= NOW() + INTERVAL '30 days'
    ORDER BY ps.scheduled_for ASC`,
    [tenantId],
  );

  for (const row of rows) {
    const draft = mapPublicationToDraft(row);
    const result = await upsertSourceJob(tenantId, 'publication_schedule_id', row.id, draft);
    counter[result] += 1;
  }

  return counter;
}

async function syncPipelineApprovals(tenantId: string) {
  const counter = emptyCounter();
  const { rows } = await query<any>(
    `SELECT
       pst.token,
       pst.briefing_id,
       pst.client_name,
       pst.client_email,
       pst.expires_at,
       pst.created_at,
       b.title,
       b.due_at,
       COALESCE(b.main_client_id, fallback.id) AS client_id,
       latest.decision AS latest_decision,
       latest.feedback AS latest_feedback,
       latest.section AS latest_section,
       latest.created_at AS latest_decided_at
     FROM pipeline_share_tokens pst
     JOIN edro_briefings b ON b.id = pst.briefing_id
     LEFT JOIN edro_clients ec ON ec.id = b.client_id
     LEFT JOIN clients fallback
       ON LOWER(fallback.name) = LOWER(ec.name)
      AND fallback.tenant_id = $1
     LEFT JOIN LATERAL (
       SELECT decision, feedback, section, created_at
       FROM pipeline_client_approvals pca
       WHERE pca.briefing_id = pst.briefing_id
         AND pca.share_token = pst.token
       ORDER BY pca.created_at DESC
       LIMIT 1
     ) latest ON true
    WHERE pst.tenant_id = $1
      AND pst.created_at >= NOW() - INTERVAL '45 days'
      AND (
        pst.expires_at > NOW() - INTERVAL '7 days'
        OR latest.created_at IS NOT NULL
      )
    ORDER BY COALESCE(latest.created_at, pst.created_at) DESC`,
    [tenantId],
  );

  for (const row of rows) {
    const draft = mapApprovalToDraft(row);
    const result = await upsertSourceJob(tenantId, 'pipeline_share_token', row.token, draft);
    counter[result] += 1;
  }

  return counter;
}

export async function syncOperationalSources(tenantId: string): Promise<SyncSummary> {
  const ownerLookup = await loadOwnerLookup(tenantId);

  const [meetingActions, whatsapp, publication, approval] = await Promise.all([
    syncMeetingActions(tenantId, ownerLookup),
    syncWhatsappDigests(tenantId, ownerLookup),
    syncPublicationSchedule(tenantId),
    syncPipelineApprovals(tenantId),
  ]);

  return {
    meeting_actions: meetingActions,
    whatsapp,
    publication,
    approval,
    total_created: meetingActions.created + whatsapp.created + publication.created + approval.created,
    total_updated: meetingActions.updated + whatsapp.updated + publication.updated + approval.updated,
    total_skipped: meetingActions.skipped + whatsapp.skipped + publication.skipped + approval.skipped,
  };
}
