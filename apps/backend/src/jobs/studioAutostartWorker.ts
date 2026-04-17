import { fetchJobs, markJob, mergeJobPayload } from './jobQueue';
import { query } from '../db';
import { runCreatePostPipelineNow, type ToolContext } from '../services/ai/toolExecutor';
import { buildStudioAutostartHandoffPacket, initializeStudioAutostartHandoff } from '../services/studioHandoffService';

let running = false;

function buildAutostartRequest(packet: any) {
  const parts = [
    packet.title ? `Demanda: ${packet.title}` : null,
    packet.objective ? `Objetivo: ${packet.objective}` : null,
    packet.summary ? `Resumo: ${packet.summary}` : null,
    packet.execution_profile ? `Perfil de execução: ${packet.execution_profile}` : null,
    Array.isArray(packet.internal_questions) && packet.internal_questions.length
      ? `Resolver internamente durante a execução: ${packet.internal_questions.map((item: any) => item.prompt || item.field).join(' | ')}`
      : null,
  ].filter(Boolean);
  return parts.join('\n');
}

async function resolveEdroClientId(tenantId: string, clientId: string) {
  const { rows } = await query<{ id: string }>(
    `SELECT id
       FROM edro_clients
      WHERE tenant_id = $1
        AND client_id = $2
      LIMIT 1`,
    [tenantId, clientId],
  ).catch(() => ({ rows: [] as Array<{ id: string }> }));
  return rows[0]?.id ?? null;
}

export async function runStudioAutostartWorkerOnce(): Promise<void> {
  if (running) return;
  running = true;

  try {
    const jobs = await fetchJobs('studio_autostart', 2);
    if (!jobs.length) return;

    for (const job of jobs) {
      const claimed = await markJob(job.id, 'processing');
      if (!claimed) continue;

      try {
        const payload = (job.payload || {}) as any;
        const packet = payload.briefing_packet || null;
        const clientId = String(packet?.client_id || '').trim();
        const autostartMode = String(packet?.autostart_recommendation?.mode || '').trim();
        const canAutostart =
          autostartMode === 'auto_run'
          || autostartMode === 'auto_run_with_da_review'
          || packet?.readiness === 'ready';
        if (!packet || !canAutostart || !clientId) {
          throw new Error('studio_autostart_not_ready');
        }

        const edroClientId = await resolveEdroClientId(job.tenant_id, clientId);
        if (!edroClientId) {
          throw new Error('studio_autostart_missing_edro_client');
        }

        const ctx: ToolContext = {
          tenantId: job.tenant_id,
          clientId,
          edroClientId,
          userId: 'system',
          userEmail: 'jarvis@edro.system',
          role: 'admin',
          conversationRoute: 'planning',
          explicitConfirmation: true,
        };

        const result = await runCreatePostPipelineNow({
          request: buildAutostartRequest(packet),
          title: packet.title || null,
          objective: packet.objective || 'engajamento',
          platform: packet.platform || 'instagram',
          format: packet.format || 'post',
          deadline: packet.deadline || null,
          generate_approval_link: false,
        }, ctx);

        await mergeJobPayload(job.id, {
          studio_autostart_profile: {
            readiness: packet.readiness || null,
            execution_profile: packet.execution_profile || null,
            autostart_mode: autostartMode || null,
            autostart_confidence: packet.autostart_recommendation?.confidence ?? null,
          },
          studio_autostart_result: result.success ? result.data || null : null,
          studio_autostart_error: result.success ? null : result.error || 'studio_autostart_failed',
        });

        if (!result.success) {
          await markJob(job.id, 'failed', result.error || 'studio_autostart_failed');
          continue;
        }

        const handoffPacket = await initializeStudioAutostartHandoff({
          tenantId: job.tenant_id,
          packet: buildStudioAutostartHandoffPacket(result.data || null, packet.client_name || null),
        });
        await mergeJobPayload(job.id, {
          studio_handoff_packet: handoffPacket,
        }).catch(() => {});

        await markJob(job.id, 'done');
      } catch (error: any) {
        await mergeJobPayload(job.id, {
          studio_autostart_error: error?.message || 'studio_autostart_failed',
        }).catch(() => {});
        await markJob(job.id, 'failed', error?.message || 'studio_autostart_failed');
      }
    }
  } finally {
    running = false;
  }
}
