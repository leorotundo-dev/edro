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
