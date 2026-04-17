import { query } from '../db';
import { notifyEvent } from './notificationService';
import { getCreativeSessionContextBySessionId } from './jobs/creativeSessionService';

type StudioHandoffStatus =
  | 'needs_da_review'
  | 'ready_for_traffic'
  | 'accepted'
  | 'returned_for_changes'
  | 'exported'
  | 'sent';

type StudioHandoffActor = 'da' | 'traffic';

type StudioHandoffAssignmentStatus =
  | 'assigned'
  | 'unassigned'
  | 'fallback_to_traffic'
  | 'fallback_to_manager';

type StudioHandoffRecipient = {
  user_id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  specialty?: string | null;
  reason?: string | null;
  workload?: number | null;
  assignment_score?: number | null;
};

type StudioAutostartHandoffPacket = {
  generated_at: string;
  status: StudioHandoffStatus;
  next_actor: StudioHandoffActor;
  client_name: string | null;
  briefing_id: string | null;
  job_id: string | null;
  creative_session_id: string | null;
  studio_url: string | null;
  copy_id: string | null;
  copy_preview: string | null;
  layout: Record<string, any> | null;
  visual_strategy: Record<string, any> | null;
  image_prompt_preview: string | null;
  approval_url: string | null;
  assigned_user_id?: string | null;
  assigned_name?: string | null;
  assigned_email?: string | null;
  assigned_role?: string | null;
  assigned_at?: string | null;
  assignment_status?: StudioHandoffAssignmentStatus | null;
  assignment_reason?: string | null;
  assignment_score?: number | null;
  candidate_recipients?: StudioHandoffRecipient[];
  accepted_at?: string | null;
  accepted_by?: string | null;
  returned_at?: string | null;
  returned_by?: string | null;
  return_reason?: string | null;
  exported_at?: string | null;
  exported_by?: string | null;
  sent_at?: string | null;
  sent_by?: string | null;
};

type HandoffHistoryEntry = {
  status: StudioHandoffStatus;
  actor: StudioHandoffActor;
  at: string;
  by: string | null;
  note: string | null;
};

type HandoffTransitionAction = 'accept' | 'return_for_changes' | 'mark_exported' | 'mark_sent';

type StudioHandoffListFilters = {
  tenantId: string;
  userId?: string | null;
  role?: StudioHandoffActor | null;
  mine?: boolean;
  status?: StudioHandoffStatus | null;
  overdue?: boolean;
  clientId?: string | null;
  assignedUserId?: string | null;
  limit?: number;
};

type StudioHandoffInboxItem = {
  creative_session_id: string;
  job_id: string;
  briefing_id: string | null;
  client_id: string | null;
  client_name: string | null;
  job_title: string | null;
  deadline_at: string | null;
  priority_band: string | null;
  current_stage: string | null;
  next_actor: StudioHandoffActor;
  handoff_status: StudioHandoffStatus;
  assignment_status: StudioHandoffAssignmentStatus;
  assigned_user_id: string | null;
  assigned_name: string | null;
  assigned_email: string | null;
  assigned_role: string | null;
  assignment_reason: string | null;
  assignment_score: number | null;
  assigned_at: string | null;
  generated_at: string | null;
  accepted_at: string | null;
  returned_at: string | null;
  exported_at: string | null;
  sent_at: string | null;
  age_minutes: number;
  sla_bucket: 'on_track' | 'attention' | 'overdue';
  return_count: number;
  reassignment_count: number;
  time_to_accept_minutes: number | null;
  time_to_export_minutes: number | null;
  time_to_send_minutes: number | null;
  overdue: boolean;
  studio_url: string;
  copy_preview: string | null;
  candidate_recipients: StudioHandoffRecipient[];
};

type StudioHandoffInboxSummary = {
  unassigned: number;
  assigned: number;
  accepted: number;
  returned_for_changes: number;
  ready_for_traffic: number;
  exported: number;
  sent: number;
  overdue: number;
};

type StudioHandoffInboxMetrics = {
  total: number;
  accepted_rate: number;
  return_rate: number;
  reassignment_rate: number;
  avg_time_to_accept_minutes: number | null;
  avg_time_to_export_minutes: number | null;
  avg_time_to_send_minutes: number | null;
};

type StudioHandoffInboxResult = {
  items: StudioHandoffInboxItem[];
  summary: StudioHandoffInboxSummary;
  metrics: StudioHandoffInboxMetrics;
};

type StudioHandoffAgingRow = {
  tenant_id: string;
  creative_session_id: string;
  job_id: string;
  briefing_id: string | null;
  client_name: string | null;
  deadline_at: string | null;
  current_status: StudioHandoffStatus;
  next_actor: StudioHandoffActor;
  assigned_user_id: string | null;
  assigned_name: string | null;
  assigned_email: string | null;
  assigned_role: string | null;
  handoff: Record<string, any>;
};

function summarizeBody(packet: StudioAutostartHandoffPacket) {
  if (packet.status === 'ready_for_traffic') {
    return 'Copy, direção e peças já estão prontas no Studio. Abra a sessão para revisar/exportar e seguir com o envio.';
  }
  return 'Copy e direção de arte já estão prontas no Studio. O próximo passo é revisar/gerar mockup final com o DA.';
}

function buildHistoryEntry(
  status: StudioHandoffStatus,
  actor: StudioHandoffActor,
  by: string | null,
  note?: string | null,
): HandoffHistoryEntry {
  return {
    status,
    actor,
    at: new Date().toISOString(),
    by,
    note: note ? String(note).trim() : null,
  };
}

async function listFallbackHandoffRecipients(tenantId: string) {
  const { rows } = await query<StudioHandoffRecipient>(
    `SELECT eu.id::text AS user_id,
            COALESCE(NULLIF(eu.name, ''), split_part(eu.email, '@', 1)) AS name,
            eu.email,
            tu.role,
            NULL::text AS specialty,
            NULL::int AS workload,
            NULL::numeric AS assignment_score,
            'manager_fallback'::text AS reason
       FROM edro_users eu
       JOIN tenant_users tu ON tu.user_id = eu.id
      WHERE tu.tenant_id = $1
        AND tu.role IN ('admin', 'owner', 'manager', 'gestor', 'account_manager')
      ORDER BY
        CASE tu.role
          WHEN 'owner' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'manager' THEN 3
          WHEN 'gestor' THEN 4
          ELSE 5
        END,
        eu.created_at ASC
      LIMIT 5`,
    [tenantId],
  ).catch(() => ({ rows: [] as StudioHandoffRecipient[] }));

  return rows.map((recipient, index) => ({
    ...recipient,
    workload: null,
    assignment_score: normalizeAssignmentScore(0.64 - index * 0.04),
  }));
}

async function resolveTrafficOwnerRecipient(
  tenantId: string,
  briefingId?: string | null,
  reason = 'briefing_traffic_owner',
) {
  if (!briefingId) return null;
  const { rows } = await query<StudioHandoffRecipient>(
    `SELECT eu.id::text AS user_id,
            COALESCE(NULLIF(eu.name, ''), split_part(eu.email, '@', 1)) AS name,
            eu.email,
            tu.role,
            NULL::text AS specialty,
            NULL::int AS workload,
            NULL::numeric AS assignment_score,
            $3::text AS reason
       FROM edro_briefings b
       JOIN edro_users eu
         ON lower(eu.email) = lower(b.traffic_owner)
         OR lower(COALESCE(eu.name, '')) = lower(b.traffic_owner)
       LEFT JOIN tenant_users tu ON tu.user_id = eu.id AND tu.tenant_id = b.tenant_id
      WHERE b.tenant_id = $1
        AND b.id = $2
        AND COALESCE(b.traffic_owner, '') <> ''
      LIMIT 1`,
    [tenantId, briefingId, reason],
  ).catch(() => ({ rows: [] as StudioHandoffRecipient[] }));
  return rows[0]
    ? {
        ...rows[0],
        workload: null,
        assignment_score: normalizeAssignmentScore(0.82),
      }
    : null;
}

async function resolveAvailableDaRecipients(tenantId: string) {
  const { rows } = await query<StudioHandoffRecipient>(
    `SELECT eu.id::text AS user_id,
            COALESCE(NULLIF(fp.display_name, ''), NULLIF(eu.name, ''), split_part(eu.email, '@', 1)) AS name,
            eu.email,
            COALESCE(tu.role, 'member') AS role,
            fp.specialty,
            COALESCE(wl.active_jobs, 0)::int AS workload,
            NULL::numeric AS assignment_score,
            'available_da'::text AS reason
       FROM freelancer_profiles fp
       JOIN edro_users eu ON eu.id = fp.user_id
       JOIN tenant_users tu ON tu.user_id = fp.user_id AND tu.tenant_id = $1
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS active_jobs
           FROM jobs j
          WHERE j.tenant_id = $1
            AND j.owner_id = fp.user_id
            AND j.status IN ('allocated', 'in_progress', 'in_review', 'awaiting_approval')
       ) wl ON true
      WHERE fp.is_active = true
        AND (
          lower(COALESCE(fp.specialty, '')) LIKE '%design%'
          OR lower(COALESCE(fp.role_title, '')) LIKE '%design%'
          OR EXISTS (
            SELECT 1
              FROM unnest(COALESCE(fp.skills, ARRAY[]::text[])) skill
             WHERE lower(skill) IN ('design', 'direcao_de_arte', 'direcao_arte', 'criativo')
          )
        )
      ORDER BY COALESCE(wl.active_jobs, 0) ASC, COALESCE(fp.approval_rate, 0) DESC, COALESCE(fp.punctuality_score, 0) DESC
      LIMIT 3`,
    [tenantId],
  ).catch(() => ({ rows: [] as StudioHandoffRecipient[] }));
  return rows.map((recipient, index) => ({
    ...recipient,
    assignment_score: normalizeAssignmentScore(0.94 - index * 0.08 - Math.min(Math.max(Number(recipient.workload || 0), 0), 4) * 0.05),
  }));
}

async function resolvePreferredRecipients(params: {
  tenantId: string;
  nextActor: StudioHandoffActor;
  briefingId?: string | null;
}) {
  if (params.nextActor === 'da') {
    const daRecipients = await resolveAvailableDaRecipients(params.tenantId);
    if (daRecipients.length) return daRecipients;

    const trafficOwner = await resolveTrafficOwnerRecipient(
      params.tenantId,
      params.briefingId || null,
      'traffic_owner_fallback_for_da',
    );
    if (trafficOwner) return [trafficOwner];
  }

  if (params.nextActor === 'traffic') {
    const trafficOwner = await resolveTrafficOwnerRecipient(params.tenantId, params.briefingId || null);
    if (trafficOwner) return [trafficOwner];
  }

  return listFallbackHandoffRecipients(params.tenantId);
}

function normalizeAssignmentScore(score: number | null | undefined) {
  if (!Number.isFinite(score)) return null;
  return Math.max(0, Math.min(0.99, Number(score!.toFixed(2))));
}

function classifyAssignmentStatus(
  nextActor: StudioHandoffActor,
  primary: StudioHandoffRecipient | null,
): StudioHandoffAssignmentStatus {
  if (!primary) return 'unassigned';

  const reason = String(primary.reason || '').trim();
  if (nextActor === 'da' && reason === 'traffic_owner_fallback_for_da') {
    return 'fallback_to_traffic';
  }
  if (reason === 'manager_fallback') {
    return 'fallback_to_manager';
  }
  return 'assigned';
}

function buildAssignmentPatch(
  nextActor: StudioHandoffActor,
  recipients: StudioHandoffRecipient[],
  assignedAt = new Date().toISOString(),
): Partial<StudioAutostartHandoffPacket> {
  const primary = recipients[0] || null;
  const assignmentStatus = classifyAssignmentStatus(nextActor, primary);

  return {
    assigned_user_id: primary?.user_id || null,
    assigned_name: primary?.name || null,
    assigned_email: primary?.email || null,
    assigned_role: primary?.role || null,
    assigned_at: primary ? assignedAt : null,
    assignment_status: assignmentStatus,
    assignment_reason: primary?.reason || null,
    assignment_score: primary?.assignment_score ?? null,
    candidate_recipients: recipients,
  };
}

async function getSessionMetadata(tenantId: string, sessionId: string) {
  const { rows } = await query<{ metadata: Record<string, any> }>(
    `SELECT COALESCE(metadata, '{}'::jsonb) AS metadata
       FROM creative_sessions
      WHERE tenant_id = $1
        AND id = $2
      LIMIT 1`,
    [tenantId, sessionId],
  );
  return rows[0]?.metadata || {};
}

async function setSessionMetadata(tenantId: string, sessionId: string, metadata: Record<string, any>) {
  await query(
    `UPDATE creative_sessions
        SET metadata = $3::jsonb,
            updated_at = NOW()
      WHERE tenant_id = $1
        AND id = $2`,
    [tenantId, sessionId, JSON.stringify(metadata || {})],
  );
}

function stripRecipientCandidates(value?: StudioHandoffRecipient[] | null) {
  return Array.isArray(value)
    ? value.map((item) => ({
        user_id: item.user_id,
        name: item.name,
        email: item.email,
        role: item.role,
        specialty: item.specialty || null,
        reason: item.reason || null,
        workload: Number.isFinite(item.workload) ? Number(item.workload) : null,
        assignment_score: item.assignment_score ?? null,
      }))
    : [];
}

async function persistHandoffMetadata(params: {
  tenantId: string;
  packet: StudioAutostartHandoffPacket;
}) {
  if (!params.packet.creative_session_id) return;

  const metadata = await getSessionMetadata(params.tenantId, params.packet.creative_session_id);
  const currentHistory = Array.isArray(metadata?.handoff?.history) ? metadata.handoff.history : [];
  const nextHistory = [
    ...currentHistory,
    buildHistoryEntry(params.packet.status, params.packet.next_actor, null, 'studio_autostart_initialized'),
  ];

  metadata.handoff = {
    current_status: params.packet.status,
    next_actor: params.packet.next_actor,
    assigned_user_id: params.packet.assigned_user_id || null,
    assigned_name: params.packet.assigned_name || null,
    assigned_email: params.packet.assigned_email || null,
    assigned_role: params.packet.assigned_role || null,
    assigned_at: params.packet.assigned_at || null,
    assignment_status: params.packet.assignment_status || null,
    assignment_reason: params.packet.assignment_reason || null,
    assignment_score: params.packet.assignment_score ?? null,
    candidate_recipients: stripRecipientCandidates(params.packet.candidate_recipients),
    accepted_at: params.packet.accepted_at || null,
    accepted_by: params.packet.accepted_by || null,
    returned_at: params.packet.returned_at || null,
    returned_by: params.packet.returned_by || null,
    return_reason: params.packet.return_reason || null,
    exported_at: params.packet.exported_at || null,
    exported_by: params.packet.exported_by || null,
    sent_at: params.packet.sent_at || null,
    sent_by: params.packet.sent_by || null,
    history: nextHistory,
  };

  await setSessionMetadata(params.tenantId, params.packet.creative_session_id, metadata);
}

function buildTransitionResultPacket(base: any, patch: Partial<StudioAutostartHandoffPacket>) {
  return {
    ...(base || {}),
    ...patch,
    candidate_recipients: patch.candidate_recipients ?? base?.candidate_recipients ?? [],
  } as StudioAutostartHandoffPacket;
}

function parseRecipientCandidates(value: any): StudioHandoffRecipient[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      return {
        user_id: String(item.user_id || '').trim(),
        name: item.name ? String(item.name) : null,
        email: item.email ? String(item.email) : null,
        role: item.role ? String(item.role) : null,
        specialty: item.specialty ? String(item.specialty) : null,
        reason: item.reason ? String(item.reason) : null,
        workload: Number.isFinite(item.workload) ? Number(item.workload) : null,
        assignment_score: normalizeAssignmentScore(Number(item.assignment_score)),
      } satisfies StudioHandoffRecipient;
    })
    .filter((item) => Boolean(item?.user_id)) as StudioHandoffRecipient[];
}

function isHandoffOverdue(deadlineAt: string | null, status: StudioHandoffStatus) {
  if (!deadlineAt || status === 'exported' || status === 'sent') return false;
  const due = new Date(deadlineAt);
  return Number.isFinite(due.getTime()) && due.getTime() < Date.now();
}

function buildEmptyInboxSummary(): StudioHandoffInboxSummary {
  return {
    unassigned: 0,
    assigned: 0,
    accepted: 0,
    returned_for_changes: 0,
    ready_for_traffic: 0,
    exported: 0,
    sent: 0,
    overdue: 0,
  };
}

function buildEmptyInboxMetrics(): StudioHandoffInboxMetrics {
  return {
    total: 0,
    accepted_rate: 0,
    return_rate: 0,
    reassignment_rate: 0,
    avg_time_to_accept_minutes: null,
    avg_time_to_export_minutes: null,
    avg_time_to_send_minutes: null,
  };
}

function getHandoffAgeMinutes(handoff: Record<string, any>) {
  const anchor = String(handoff.accepted_at || handoff.assigned_at || handoff.generated_at || '').trim();
  if (!anchor) return 0;
  const startedAt = new Date(anchor);
  if (!Number.isFinite(startedAt.getTime())) return 0;
  return Math.max(0, Math.round((Date.now() - startedAt.getTime()) / 60000));
}

function getElapsedMinutes(startAt?: string | null, endAt?: string | null) {
  if (!startAt || !endAt) return null;
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return null;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

function averageMinutes(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => Number.isFinite(value as number));
  if (!valid.length) return null;
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

function parseHandoffHistory(handoff: Record<string, any>) {
  return Array.isArray(handoff.history) ? handoff.history : [];
}

function roundPercent(value: number) {
  return Math.round(value * 1000) / 10;
}

function resolveHandoffSlaBucket(
  deadlineAt: string | null,
  handoffStatus: StudioHandoffStatus,
  ageMinutes: number,
  escalationMinutes: number,
) {
  if (isHandoffOverdue(deadlineAt, handoffStatus)) return 'overdue';
  if (ageMinutes >= escalationMinutes) return 'attention';
  return 'on_track';
}

function pickEscalationRecipient(
  recipients: StudioHandoffRecipient[],
  currentAssignedUserId?: string | null,
) {
  return recipients.find((recipient) => recipient.user_id !== currentAssignedUserId) || recipients[0] || null;
}

async function notifyHandoffRecipients(params: {
  tenantId: string;
  packet: StudioAutostartHandoffPacket;
  event: string;
  title: string;
  body: string;
}) {
  const recipients = params.packet.assigned_user_id
    ? [{
        user_id: params.packet.assigned_user_id,
        name: params.packet.assigned_name || null,
        email: params.packet.assigned_email || null,
        role: params.packet.assigned_role || null,
        assignment_score: params.packet.assignment_score ?? null,
        reason: params.packet.assignment_reason || null,
      }]
    : (params.packet.candidate_recipients || []);

  if (!recipients.length) return;

  await Promise.allSettled(
    recipients.map((recipient) =>
      notifyEvent({
        event: params.event,
        tenantId: params.tenantId,
        userId: recipient.user_id,
        title: params.title,
        body: params.body,
        link: params.packet.studio_url || undefined,
        recipientEmail: recipient.email || undefined,
        payload: {
          handoff_packet: params.packet,
          creative_session_id: params.packet.creative_session_id,
          briefing_id: params.packet.briefing_id,
          job_id: params.packet.job_id,
          next_actor: params.packet.next_actor,
        },
      }),
    ),
  );
}

export async function listStudioHandoffs(filters: StudioHandoffListFilters): Promise<StudioHandoffInboxResult> {
  const escalationMinutes = Number(process.env.STUDIO_HANDOFF_ESCALATION_MINUTES || 240);
  const { rows } = await query<{
    creative_session_id: string;
    job_id: string;
    briefing_id: string | null;
    client_id: string | null;
    client_name: string | null;
    job_title: string | null;
    deadline_at: string | null;
    priority_band: string | null;
    current_stage: string | null;
    handoff: Record<string, any>;
  }>(
    `SELECT cs.id::text AS creative_session_id,
            cs.job_id::text AS job_id,
            cs.briefing_id::text AS briefing_id,
            j.client_id::text AS client_id,
            COALESCE(j.client_name, c.name) AS client_name,
            j.title AS job_title,
            j.deadline_at,
            j.priority_band,
            cs.current_stage,
            COALESCE(cs.metadata->'handoff', '{}'::jsonb) AS handoff
       FROM creative_sessions cs
       JOIN jobs j
         ON j.tenant_id = cs.tenant_id
        AND j.id = cs.job_id
       LEFT JOIN clients c ON c.id = j.client_id
      WHERE cs.tenant_id = $1
        AND cs.metadata ? 'handoff'
      ORDER BY COALESCE(cs.updated_at, cs.created_at) DESC
      LIMIT $2`,
    [filters.tenantId, Math.max(50, Math.min(filters.limit || 100, 250))],
  ).catch(() => ({
    rows: [] as Array<{
      creative_session_id: string;
      job_id: string;
      briefing_id: string | null;
      client_id: string | null;
      client_name: string | null;
      job_title: string | null;
      deadline_at: string | null;
      priority_band: string | null;
      current_stage: string | null;
      handoff: Record<string, any>;
    }>,
  }));

  const items = rows
    .map((row) => {
      const handoff = row.handoff || {};
      const history = parseHandoffHistory(handoff);
      const handoffStatus = String(handoff.current_status || '').trim() as StudioHandoffStatus;
      if (!handoffStatus) return null;

      const nextActor = String(handoff.next_actor || '').trim() === 'traffic' ? 'traffic' : 'da';
      const assignmentStatus = (
        ['assigned', 'unassigned', 'fallback_to_traffic', 'fallback_to_manager'].includes(String(handoff.assignment_status || ''))
          ? handoff.assignment_status
          : handoff.assigned_user_id
          ? 'assigned'
          : 'unassigned'
      ) as StudioHandoffAssignmentStatus;
      const ageMinutes = Number.isFinite(Number(handoff.age_minutes))
        ? Number(handoff.age_minutes)
        : getHandoffAgeMinutes(handoff);
      const slaBucket = (
        ['on_track', 'attention', 'overdue'].includes(String(handoff.sla_bucket || ''))
          ? String(handoff.sla_bucket)
          : resolveHandoffSlaBucket(row.deadline_at, handoffStatus, ageMinutes, escalationMinutes)
      ) as 'on_track' | 'attention' | 'overdue';
      const returnCount = history.filter((entry) => String(entry?.status || '') === 'returned_for_changes').length;
      const reassignmentCount = history.filter((entry) => {
        const note = String(entry?.note || '').trim();
        return note === 'studio_handoff_escalated' || note === 'studio_handoff_deadline_escalated';
      }).length;
      const item: StudioHandoffInboxItem = {
        creative_session_id: row.creative_session_id,
        job_id: row.job_id,
        briefing_id: row.briefing_id,
        client_id: row.client_id,
        client_name: row.client_name,
        job_title: row.job_title,
        deadline_at: row.deadline_at,
        priority_band: row.priority_band,
        current_stage: row.current_stage,
        next_actor: nextActor,
        handoff_status: handoffStatus,
        assignment_status: assignmentStatus,
        assigned_user_id: handoff.assigned_user_id ? String(handoff.assigned_user_id) : null,
        assigned_name: handoff.assigned_name ? String(handoff.assigned_name) : null,
        assigned_email: handoff.assigned_email ? String(handoff.assigned_email) : null,
        assigned_role: handoff.assigned_role ? String(handoff.assigned_role) : null,
        assignment_reason: handoff.assignment_reason ? String(handoff.assignment_reason) : null,
        assignment_score: normalizeAssignmentScore(Number(handoff.assignment_score)),
        assigned_at: handoff.assigned_at ? String(handoff.assigned_at) : null,
        generated_at: handoff.generated_at ? String(handoff.generated_at) : null,
        accepted_at: handoff.accepted_at ? String(handoff.accepted_at) : null,
        returned_at: handoff.returned_at ? String(handoff.returned_at) : null,
        exported_at: handoff.exported_at ? String(handoff.exported_at) : null,
        sent_at: handoff.sent_at ? String(handoff.sent_at) : null,
        age_minutes: ageMinutes,
        sla_bucket: slaBucket,
        return_count: returnCount,
        reassignment_count: reassignmentCount,
        time_to_accept_minutes: getElapsedMinutes(handoff.assigned_at || handoff.generated_at, handoff.accepted_at),
        time_to_export_minutes: getElapsedMinutes(handoff.accepted_at || handoff.generated_at, handoff.exported_at),
        time_to_send_minutes: getElapsedMinutes(
          handoff.exported_at || handoff.accepted_at || handoff.generated_at,
          handoff.sent_at,
        ),
        overdue: isHandoffOverdue(row.deadline_at, handoffStatus),
        studio_url:
          handoff.studio_url && String(handoff.studio_url).trim()
            ? String(handoff.studio_url)
            : `/studio/editor?jobId=${row.job_id}&sessionId=${row.creative_session_id}`,
        copy_preview: handoff.copy_preview ? String(handoff.copy_preview) : null,
        candidate_recipients: parseRecipientCandidates(handoff.candidate_recipients),
      };
      return item;
    })
    .filter((item): item is StudioHandoffInboxItem => Boolean(item))
    .filter((item) => {
      if (filters.role && item.next_actor !== filters.role) return false;
      if (filters.mine && filters.userId && item.assigned_user_id !== filters.userId) return false;
      if (filters.status && item.handoff_status !== filters.status) return false;
      if (typeof filters.overdue === 'boolean' && item.overdue !== filters.overdue) return false;
      if (filters.clientId && item.client_id !== filters.clientId) return false;
      if (filters.assignedUserId && item.assigned_user_id !== filters.assignedUserId) return false;
      return true;
    })
    .slice(0, Math.min(filters.limit || 100, 200));

  const summary = items.reduce<StudioHandoffInboxSummary>((acc, item) => {
    if (item.overdue) acc.overdue += 1;
    if (item.assignment_status === 'unassigned') acc.unassigned += 1;
    if (item.handoff_status === 'ready_for_traffic') acc.ready_for_traffic += 1;
    if (item.handoff_status === 'accepted') acc.accepted += 1;
    if (item.handoff_status === 'returned_for_changes') acc.returned_for_changes += 1;
    if (item.handoff_status === 'exported') acc.exported += 1;
    if (item.handoff_status === 'sent') acc.sent += 1;
    if (
      item.assignment_status !== 'unassigned'
      && (item.handoff_status === 'needs_da_review' || item.handoff_status === 'ready_for_traffic')
    ) {
      acc.assigned += 1;
    }
    return acc;
  }, buildEmptyInboxSummary());

  const total = items.length;
  const metrics: StudioHandoffInboxMetrics = {
    total,
    accepted_rate: total ? roundPercent(items.filter((item) => Boolean(item.accepted_at)).length / total) : 0,
    return_rate: total ? roundPercent(items.filter((item) => item.return_count > 0).length / total) : 0,
    reassignment_rate: total ? roundPercent(items.filter((item) => item.reassignment_count > 0).length / total) : 0,
    avg_time_to_accept_minutes: averageMinutes(items.map((item) => item.time_to_accept_minutes)),
    avg_time_to_export_minutes: averageMinutes(items.map((item) => item.time_to_export_minutes)),
    avg_time_to_send_minutes: averageMinutes(items.map((item) => item.time_to_send_minutes)),
  };

  return { items, summary, metrics: total ? metrics : buildEmptyInboxMetrics() };
}

export async function processStudioHandoffAgingBatch(limit = 20) {
  const warningMinutes = Number(process.env.STUDIO_HANDOFF_WARNING_MINUTES || 90);
  const escalationMinutes = Number(process.env.STUDIO_HANDOFF_ESCALATION_MINUTES || 240);
  const { rows } = await query<StudioHandoffAgingRow>(
    `SELECT cs.tenant_id::text AS tenant_id,
            cs.id::text AS creative_session_id,
            cs.job_id::text AS job_id,
            cs.briefing_id::text AS briefing_id,
            COALESCE(j.client_name, c.name) AS client_name,
            j.deadline_at,
            COALESCE(cs.metadata->'handoff'->>'current_status', 'needs_da_review')::text AS current_status,
            CASE
              WHEN COALESCE(cs.metadata->'handoff'->>'next_actor', 'da') = 'traffic' THEN 'traffic'
              ELSE 'da'
            END::text AS next_actor,
            cs.metadata->'handoff'->>'assigned_user_id' AS assigned_user_id,
            cs.metadata->'handoff'->>'assigned_name' AS assigned_name,
            cs.metadata->'handoff'->>'assigned_email' AS assigned_email,
            cs.metadata->'handoff'->>'assigned_role' AS assigned_role,
            COALESCE(cs.metadata->'handoff', '{}'::jsonb) AS handoff
       FROM creative_sessions cs
       JOIN jobs j
         ON j.tenant_id = cs.tenant_id
        AND j.id = cs.job_id
       LEFT JOIN clients c ON c.id = j.client_id
      WHERE cs.metadata ? 'handoff'
        AND COALESCE(cs.metadata->'handoff'->>'current_status', '') IN ('needs_da_review', 'ready_for_traffic', 'accepted')
      ORDER BY COALESCE((cs.metadata->'handoff'->>'assigned_at')::timestamptz, cs.updated_at, cs.created_at) ASC
      LIMIT $1`,
    [Math.max(1, Math.min(limit, 100))],
  ).catch(() => ({ rows: [] as StudioHandoffAgingRow[] }));

  for (const row of rows) {
    const metadata = await getSessionMetadata(row.tenant_id, row.creative_session_id).catch(() => null);
    if (!metadata) continue;

    const handoff = metadata.handoff || {};
    const history = Array.isArray(handoff.history) ? handoff.history : [];
    const ageMinutes = getHandoffAgeMinutes(handoff);
    const overdue = isHandoffOverdue(row.deadline_at, row.current_status);
    const slaBucket = resolveHandoffSlaBucket(row.deadline_at, row.current_status, ageMinutes, escalationMinutes);
    const nowIso = new Date().toISOString();

    metadata.handoff = {
      ...handoff,
      age_minutes: ageMinutes,
      overdue,
      sla_bucket: slaBucket,
      last_aged_at: nowIso,
    };

    let changed = false;

    if (
      row.current_status !== 'accepted'
      && !handoff.aging_warning_at
      && ageMinutes >= warningMinutes
    ) {
      metadata.handoff.aging_warning_at = nowIso;
      metadata.handoff.history = [
        ...history,
        buildHistoryEntry(row.current_status, row.next_actor, null, 'studio_handoff_aging_warning'),
      ];
      changed = true;

      if (row.assigned_user_id) {
        await notifyEvent({
          event: 'studio_handoff_aging_warning',
          tenantId: row.tenant_id,
          userId: row.assigned_user_id,
          title: `Handoff parado: ${row.client_name || 'cliente'}`,
          body: 'O handoff do Studio ainda não foi assumido. Revise ou aceite a peça.',
          link: `/studio/editor?jobId=${row.job_id}&sessionId=${row.creative_session_id}`,
          recipientEmail: row.assigned_email || undefined,
          payload: {
            creative_session_id: row.creative_session_id,
            job_id: row.job_id,
            handoff_status: row.current_status,
          },
          defaultChannels: ['in_app'],
        }).catch(() => {});
      }
    }

    if (!handoff.escalated_at && (overdue || (row.current_status !== 'accepted' && ageMinutes >= escalationMinutes))) {
      const refreshedRecipients = await resolvePreferredRecipients({
        tenantId: row.tenant_id,
        nextActor: row.next_actor,
        briefingId: row.briefing_id,
      });
      const reassignee = pickEscalationRecipient(refreshedRecipients, row.assigned_user_id);
      const orderedRecipients = reassignee
        ? [reassignee, ...refreshedRecipients.filter((recipient) => recipient.user_id !== reassignee.user_id)]
        : refreshedRecipients;

      metadata.handoff = {
        ...metadata.handoff,
        ...buildAssignmentPatch(row.next_actor, orderedRecipients, nowIso),
        escalated_at: nowIso,
        escalated_reason: overdue ? 'deadline_passed' : 'handoff_unaccepted',
        history: [
          ...(Array.isArray(metadata.handoff.history) ? metadata.handoff.history : history),
          buildHistoryEntry(row.current_status, row.next_actor, null, overdue ? 'studio_handoff_deadline_escalated' : 'studio_handoff_escalated'),
        ],
      };
      changed = true;

      if (metadata.handoff.assigned_user_id) {
        await notifyEvent({
          event: 'studio_handoff_escalated',
          tenantId: row.tenant_id,
          userId: String(metadata.handoff.assigned_user_id),
          title: `Handoff escalado: ${row.client_name || 'cliente'}`,
          body: overdue
            ? 'A peça passou do prazo e foi escalada automaticamente.'
            : 'A peça ficou tempo demais sem aceite e foi escalada automaticamente.',
          link: `/studio/editor?jobId=${row.job_id}&sessionId=${row.creative_session_id}`,
          recipientEmail: metadata.handoff.assigned_email || undefined,
          payload: {
            creative_session_id: row.creative_session_id,
            job_id: row.job_id,
            escalated_reason: metadata.handoff.escalated_reason,
          },
          defaultChannels: ['in_app', 'email'],
        }).catch(() => {});
      }
    }

    if (changed) {
      await setSessionMetadata(row.tenant_id, row.creative_session_id, metadata).catch(() => {});
    }
  }
}

export function buildStudioAutostartHandoffPacket(resultData: any, clientName?: string | null): StudioAutostartHandoffPacket {
  const hasSelectedAsset = Boolean(
    resultData?.selected_asset_id
    || resultData?.asset_id
    || (typeof resultData?.asset_count === 'number' && resultData.asset_count > 0),
  );

  return {
    generated_at: new Date().toISOString(),
    status: hasSelectedAsset ? 'ready_for_traffic' : 'needs_da_review',
    next_actor: hasSelectedAsset ? 'traffic' : 'da',
    client_name: clientName || null,
    briefing_id: resultData?.briefing_id || null,
    job_id: resultData?.job_id || null,
    creative_session_id: resultData?.creative_session_id || null,
    studio_url: resultData?.studio_url || null,
    copy_id: resultData?.copy_id || null,
    copy_preview: resultData?.copy_preview || null,
    layout: resultData?.layout || null,
    visual_strategy: resultData?.visual_strategy || null,
    image_prompt_preview: resultData?.image_prompt_preview || null,
    approval_url: resultData?.approvalUrl || null,
    candidate_recipients: [],
  };
}

export async function initializeStudioAutostartHandoff(params: {
  tenantId: string;
  packet: StudioAutostartHandoffPacket;
}) {
  const recipients = await resolvePreferredRecipients({
    tenantId: params.tenantId,
    nextActor: params.packet.next_actor,
    briefingId: params.packet.briefing_id,
  });

  const packet = buildTransitionResultPacket(
    params.packet,
    buildAssignmentPatch(params.packet.next_actor, recipients),
  );

  await persistHandoffMetadata({
    tenantId: params.tenantId,
    packet,
  }).catch(() => {});

  const clientLabel = packet.client_name || 'cliente';
  const title =
    packet.status === 'ready_for_traffic'
      ? `Studio pronto para tráfego: ${clientLabel}`
      : `Studio pronto para revisão de DA: ${clientLabel}`;

  await notifyHandoffRecipients({
    tenantId: params.tenantId,
    packet,
    event: packet.status === 'ready_for_traffic' ? 'studio_ready_for_traffic' : 'studio_ready_for_da_review',
    title,
    body: summarizeBody(packet),
  }).catch(() => {});

  return packet;
}

export async function transitionStudioHandoffState(params: {
  tenantId: string;
  sessionId: string;
  jobId: string;
  userId: string | null;
  action: HandoffTransitionAction;
  note?: string | null;
  nextActor?: StudioHandoffActor | null;
}) {
  const sessionContext = await getCreativeSessionContextBySessionId(params.tenantId, params.sessionId);
  if (!sessionContext) throw new Error('Sessão criativa não encontrada.');
  if (sessionContext.session.job_id !== params.jobId) throw new Error('Sessão criativa não pertence ao job informado.');

  const metadata = await getSessionMetadata(params.tenantId, params.sessionId);
  const handoff = metadata?.handoff || {};
  const currentStatus = String(handoff.current_status || '').trim() as StudioHandoffStatus;
  const currentActor = String(handoff.next_actor || '').trim() === 'traffic' ? 'traffic' : 'da';
  const history = Array.isArray(handoff.history) ? handoff.history : [];

  if (!currentStatus) {
    throw new Error('handoff_state_not_initialized');
  }

  let nextStatus: StudioHandoffStatus = currentStatus;
  let nextActor: StudioHandoffActor = currentActor;
  const patch: Partial<StudioAutostartHandoffPacket> = {};

  if (params.action === 'accept') {
    nextStatus = 'accepted';
    patch.accepted_at = new Date().toISOString();
    patch.accepted_by = params.userId || null;
  } else if (params.action === 'return_for_changes') {
    nextStatus = 'returned_for_changes';
    nextActor = params.nextActor || currentActor;
    patch.returned_at = new Date().toISOString();
    patch.returned_by = params.userId || null;
    patch.return_reason = params.note ? String(params.note).trim() : null;

    const recipients = await resolvePreferredRecipients({
      tenantId: params.tenantId,
      nextActor,
      briefingId: sessionContext.session.briefing_id,
    });
    Object.assign(patch, buildAssignmentPatch(nextActor, recipients));

    await query(
      `UPDATE creative_sessions
          SET current_stage = 'arte',
              status = 'active',
              updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2`,
      [params.tenantId, params.sessionId],
    ).catch(() => {});
  } else if (params.action === 'mark_exported') {
    nextStatus = 'exported';
    nextActor = 'traffic';
    patch.exported_at = new Date().toISOString();
    patch.exported_by = params.userId || null;
  } else if (params.action === 'mark_sent') {
    nextStatus = 'sent';
    nextActor = 'traffic';
    patch.sent_at = new Date().toISOString();
    patch.sent_by = params.userId || null;
  }

  metadata.handoff = {
    ...handoff,
    current_status: nextStatus,
    next_actor: nextActor,
    ...patch,
    history: [
      ...history,
      buildHistoryEntry(nextStatus, nextActor, params.userId || null, params.note || null),
    ],
  };

  await setSessionMetadata(params.tenantId, params.sessionId, metadata);

  const packet = buildTransitionResultPacket({
    generated_at: handoff.generated_at || new Date().toISOString(),
    status: nextStatus,
    next_actor: nextActor,
    client_name: sessionContext.job.client_name || null,
    briefing_id: sessionContext.session.briefing_id || null,
    job_id: sessionContext.job.id,
    creative_session_id: params.sessionId,
    studio_url: `/studio/editor?jobId=${sessionContext.job.id}&sessionId=${params.sessionId}`,
    copy_id: handoff.copy_id || null,
    copy_preview: handoff.copy_preview || null,
    layout: handoff.layout || null,
    visual_strategy: handoff.visual_strategy || null,
    image_prompt_preview: handoff.image_prompt_preview || null,
    approval_url: handoff.approval_url || null,
    assigned_user_id: handoff.assigned_user_id || null,
    assigned_name: handoff.assigned_name || null,
    assigned_email: handoff.assigned_email || null,
    assigned_role: handoff.assigned_role || null,
    assigned_at: handoff.assigned_at || null,
    assignment_status: handoff.assignment_status || null,
    assignment_reason: handoff.assignment_reason || null,
    assignment_score: handoff.assignment_score ?? null,
    candidate_recipients: handoff.candidate_recipients || [],
  }, {
    status: nextStatus,
    next_actor: nextActor,
    ...patch,
  });

  if (params.action === 'return_for_changes') {
    await notifyHandoffRecipients({
      tenantId: params.tenantId,
      packet,
      event: 'studio_handoff_returned',
      title: `Studio devolvido para ajustes: ${packet.client_name || 'cliente'}`,
      body: params.note
        ? `A peça voltou para ajustes. Motivo: ${params.note}`
        : 'A peça voltou para ajustes no Studio.',
    }).catch(() => {});
  }

  return getCreativeSessionContextBySessionId(params.tenantId, params.sessionId);
}
