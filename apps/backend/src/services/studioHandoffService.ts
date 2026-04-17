import { query } from '../db';
import { notifyEvent } from './notificationService';

type StudioAutostartHandoffPacket = {
  generated_at: string;
  status: 'needs_da_review' | 'ready_for_traffic';
  next_actor: 'da' | 'traffic';
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
};

function summarizeBody(packet: StudioAutostartHandoffPacket) {
  if (packet.status === 'ready_for_traffic') {
    return 'Copy, direção e peças já estão prontas no Studio. Abra a sessão para revisar/exportar e seguir com o envio.';
  }
  return 'Copy e direção de arte já estão prontas no Studio. O próximo passo é revisar/gerar mockup final com o DA.';
}

async function listStudioHandoffRecipients(tenantId: string) {
  const { rows } = await query<{ id: string; email: string | null }>(
    `SELECT eu.id::text AS id, eu.email
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
  ).catch(() => ({ rows: [] as Array<{ id: string; email: string | null }> }));

  return rows;
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
  };
}

export async function notifyStudioAutostartHandoff(params: {
  tenantId: string;
  packet: StudioAutostartHandoffPacket;
}) {
  const recipients = await listStudioHandoffRecipients(params.tenantId);
  if (!recipients.length) return;

  const clientLabel = params.packet.client_name || 'cliente';
  const title =
    params.packet.status === 'ready_for_traffic'
      ? `Studio pronto para tráfego: ${clientLabel}`
      : `Studio pronto para revisão de DA: ${clientLabel}`;

  await Promise.allSettled(
    recipients.map((recipient) =>
      notifyEvent({
        event: params.packet.status === 'ready_for_traffic' ? 'studio_ready_for_traffic' : 'studio_ready_for_da_review',
        tenantId: params.tenantId,
        userId: recipient.id,
        title,
        body: summarizeBody(params.packet),
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
