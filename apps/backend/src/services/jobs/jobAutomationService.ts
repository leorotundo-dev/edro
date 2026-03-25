/**
 * Job Automation Pipeline
 *
 * Orchestrates automatic copy generation, image creation, job assignment,
 * and ETA calculation. When a visual job is created, this service runs
 * the full AI pipeline in the background so the designer receives a
 * near-ready creative draft.
 */

import { query } from '../../db';
import { enqueueJob } from '../../jobs/jobQueue';
import { getClientById } from '../../repos/clientsRepo';
import {
  generateBehavioralDraft,
  type PersonaContext,
  type BehaviorIntentContext,
  type DraftContent,
} from '../ai/agentWriter';
import { auditDraftContent } from '../ai/agentAuditor';
import { runAgentDiretorArte } from '../ai/agentDiretorArte';
import { generateLayout } from '../layoutEngine';
import { generateImageWithFal } from '../ai/falAiService';
import { upsertJobAllocation } from './operationsRuntimeService';
import { notifyEvent } from '../notificationService';

// ─── Channel → format mapping ────────────────────────────────────────────────

const CHANNEL_FORMAT: Record<string, string> = {
  instagram: '1:1',
  stories: '9:16',
  reels: '9:16',
  tiktok: '9:16',
  youtube: '16:9',
  linkedin: '1:1',
  facebook: '1:1',
  blog: '16:9',
  site: '16:9',
  email: '1:1',
  whatsapp: '1:1',
};

const CHANNEL_PLATFORM: Record<string, string> = {
  instagram: 'Instagram',
  stories: 'Instagram',
  reels: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  blog: 'Blog',
  site: 'Site',
  email: 'Email',
  whatsapp: 'WhatsApp',
};

// ─── Eligible job types for auto-creative ────────────────────────────────────

const VISUAL_JOB_TYPES = new Set([
  'copy',
  'design_static',
  'design_carousel',
  'campaign',
]);

export function isEligibleForAutomation(jobType: string, clientId?: string | null): boolean {
  return VISUAL_JOB_TYPES.has(jobType) && Boolean(clientId);
}

// ─── Auto-Copy Generation ────────────────────────────────────────────────────

export async function generateJobCopy(tenantId: string, jobId: string): Promise<void> {
  const job = await fetchJob(tenantId, jobId);
  if (!job || !job.client_id) return;

  await setAutomationStatus(tenantId, jobId, 'copy_pending');

  const client = await getClientById(tenantId, job.client_id);
  if (!client) {
    await insertDraft(tenantId, jobId, 'copy', 'failed', { error_message: 'Cliente não encontrado' });
    return;
  }

  const profile = client.profile || {};
  const channel = String(job.channel || 'instagram').toLowerCase();
  const platform = CHANNEL_PLATFORM[channel] || 'Instagram';

  // ── Load briefing (if approved) ───────────────────────────────────────────
  const { rows: briefRows } = await query<any>(
    `SELECT b.*, array_agg(
        jsonb_build_object(
          'format_type', p.format_type,
          'platform', p.platform,
          'versions', p.versions,
          'priority', p.priority,
          'notes', p.notes,
          'sort_order', p.sort_order
        ) ORDER BY p.sort_order
      ) FILTER (WHERE p.id IS NOT NULL) AS pieces
     FROM job_briefings b
     LEFT JOIN job_briefing_pieces p ON p.briefing_id = b.id
     WHERE b.job_id = $1 AND b.tenant_id = $2 AND b.status = 'approved'
     GROUP BY b.id`,
    [jobId, tenantId],
  );
  const briefing = briefRows[0] ?? null;
  const pieces: any[] = briefing?.pieces ?? [];

  // ── Layer 2: Client profile context ──────────────────────────────────────
  const kb = profile.knowledge_base ?? {};
  const bt = profile.brand_tokens ?? {};

  // Behavior clusters for targeted clusters (if specified in briefing)
  let behaviorClusters: any[] = [];
  if (briefing?.target_cluster_ids?.length) {
    const { rows: clusterRows } = await query<any>(
      `SELECT cluster_label, preferred_amd, preferred_triggers, preferred_format,
              avg_save_rate, avg_click_rate, avg_engagement_rate
         FROM client_behavior_profiles
        WHERE id = ANY($1::uuid[]) AND tenant_id = $2`,
      [briefing.target_cluster_ids, tenantId],
    );
    behaviorClusters = clusterRows;
  }

  // Learning rules
  const { rows: ruleRows } = await query<any>(
    `SELECT rule_type, rule_text, uplift_pct
       FROM learning_rules
      WHERE client_id = $1 AND tenant_id = $2 AND is_active = true
      ORDER BY uplift_pct DESC LIMIT 8`,
    [job.client_id, tenantId],
  );

  // Visual style
  const { rows: vsRows } = await query<any>(
    `SELECT style_summary FROM client_visual_style
      WHERE client_id = $1 AND tenant_id = $2
      ORDER BY analyzed_at DESC LIMIT 1`,
    [job.client_id, tenantId],
  );

  // ── Layer 2 block (client profile) ───────────────────────────────────────
  const toneBlock = briefing?.tone_override
    ? [
        briefing.tone_override.tone_profile ? `Tom: ${briefing.tone_override.tone_profile}` : '',
        briefing.tone_override.personality_traits?.length
          ? `Traços de personalidade: ${briefing.tone_override.personality_traits.join(', ')}`
          : '',
        briefing.tone_override.formality_level ? `Formalidade: ${briefing.tone_override.formality_level}` : '',
        briefing.tone_override.emoji_usage ? `Uso de emoji: ${briefing.tone_override.emoji_usage}` : '',
      ].filter(Boolean).join('\n')
    : [
        profile.tone_description ? `Tom de voz: ${profile.tone_description}` : '',
        profile.personality_traits?.length ? `Traços: ${profile.personality_traits.join(', ')}` : '',
        profile.formality_level ? `Formalidade: ${profile.formality_level}` : '',
        profile.emoji_usage ? `Emoji: ${profile.emoji_usage}` : '',
        bt.referenceStyles?.length ? `Referências de tom: ${bt.referenceStyles.join(', ')}` : '',
      ].filter(Boolean).join('\n');

  const clientProfileBlock = [
    `CLIENTE: ${client.name}`,
    kb.audience ? `Público-alvo: ${kb.audience}` : '',
    kb.brand_promise ? `Promessa de marca: ${kb.brand_promise}` : '',
    kb.differentiators ? `Diferenciais: ${kb.differentiators}` : '',
    kb.forbidden_claims?.length ? `Evitar: ${kb.forbidden_claims.join('; ')}` : '',
    profile.negative_keywords?.length ? `Palavras proibidas: ${profile.negative_keywords.join(', ')}` : '',
    profile.pillars?.length ? `Pilares de conteúdo: ${profile.pillars.join(', ')}` : '',
    vsRows[0]?.style_summary ? `Estilo visual: ${vsRows[0].style_summary}` : '',
    toneBlock,
    ruleRows.length
      ? `REGRAS DE APRENDIZADO (padrões com melhor performance):\n${ruleRows.map((r: any) => `- ${r.rule_text} (+${r.uplift_pct}%)`).join('\n')}`
      : '',
  ].filter(Boolean).join('\n\n');

  // ── Layer 3: Briefing context (job-specific) ──────────────────────────────
  const AMD_LABELS: Record<string, string> = {
    salvar: 'salvar o conteúdo',
    clicar: 'clicar no link',
    compartilhar: 'compartilhar',
    responder: 'comentar ou responder',
    marcar_amigo: 'marcar um amigo',
    proposta_direta: 'solicitar proposta ou orçamento',
  };
  const TRIGGER_LABELS: Record<string, string> = {
    lançamento_produto: 'Lançamento de produto/serviço',
    ativacao_sazonalidade: 'Ativação sazonal',
    oportunidade_tendencia: 'Oportunidade de tendência',
    demanda_cliente: 'Demanda do cliente',
    estrategia_proativa: 'Estratégia proativa',
    crise_reputacao: 'Gestão de crise/reputação',
  };
  const MOMENT_LABELS: Record<string, string> = {
    descobrindo_problema: 'descobrindo o problema',
    comparando_solucoes: 'comparando soluções',
    decidindo_compra: 'decidindo a compra',
    ja_cliente_upsell: 'já cliente (upsell)',
    pos_compra_retencao: 'pós-compra (retenção)',
  };

  const briefingBlock = briefing
    ? [
        '── BRIEFING DO JOB ──',
        briefing.context_trigger
          ? `Contexto: ${TRIGGER_LABELS[briefing.context_trigger] ?? briefing.context_trigger}`
          : '',
        briefing.consumer_moment
          ? `Momento do consumidor: ${MOMENT_LABELS[briefing.consumer_moment] ?? briefing.consumer_moment}`
          : '',
        briefing.main_objective ? `Objetivo: ${briefing.main_objective}` : '',
        briefing.success_metrics?.length ? `Métricas de sucesso: ${briefing.success_metrics.join(', ')}` : '',
        briefing.desired_amd
          ? `Ação desejada (AMD): ${AMD_LABELS[briefing.desired_amd] ?? briefing.desired_amd}`
          : '',
        briefing.message_structure ? `Estrutura da mensagem: ${briefing.message_structure}` : '',
        briefing.desired_emotion?.length ? `Emoção desejada: ${briefing.desired_emotion.join(', ')}` : '',
        briefing.main_risk ? `Risco a evitar: ${briefing.main_risk}` : '',
        briefing.specific_barriers?.length
          ? `Barreiras de conversão: ${briefing.specific_barriers.join(', ')}`
          : '',
        briefing.regulatory_flags?.length && !briefing.regulatory_flags.includes('sem_restricoes')
          ? `Restrições regulatórias: ${briefing.regulatory_flags.join(', ')}`
          : '',
        behaviorClusters.length
          ? `Clusters alvo:\n${behaviorClusters.map((c: any) => `  - ${c.cluster_label} (prefere: ${c.preferred_amd}, triggers: ${c.preferred_triggers?.join(', ')})`).join('\n')}`
          : '',
        briefing.ref_notes ? `Referências adicionais: ${briefing.ref_notes}` : '',
      ].filter(Boolean).join('\n')
    : '';

  // ── Build persona and behavior intent ────────────────────────────────────
  const persona: PersonaContext = {
    name: profile.personas?.[0]?.name || 'Público geral',
    role: profile.personas?.[0]?.role,
    language_style: profile.tone_description || profile.tone || undefined,
    forbidden_terms: [
      ...(profile.forbidden_terms || []),
      ...(kb.forbidden_claims || []),
    ],
    pain_points: profile.personas?.[0]?.pain_points || [],
  };

  const resolvedAmd = briefing?.desired_amd || (job.job_type === 'copy' ? 'compartilhar' : 'clicar');

  const behaviorIntent: BehaviorIntentContext = {
    amd: resolvedAmd,
    momento: briefing?.consumer_moment?.replace('descobrindo_problema', 'problema')
      .replace('comparando_solucoes', 'comparacao')
      .replace('decidindo_compra', 'decisao')
      ?? 'solucao',
    triggers: briefing?.message_structure ? [briefing.message_structure, job.title] : [job.title],
    target_behavior: briefing?.desired_amd
      ? `Levar o público a ${AMD_LABELS[briefing.desired_amd] ?? briefing.desired_amd}`
      : `Engajar com conteúdo de ${client.name} no ${platform}`,
  };

  // ── Combined knowledge block (Layers 2 + 3) ───────────────────────────────
  const knowledgeBlock = [
    clientProfileBlock,
    briefingBlock,
    job.summary ? `Contexto do job: ${job.summary}` : '',
    job.definition_of_done ? `Definição de pronto: ${job.definition_of_done}` : '',
  ].filter(Boolean).join('\n\n');

  // ── Layer 4: Generate per piece or single draft ───────────────────────────
  const effectivePieces = pieces.length
    ? pieces
    : [{ format_type: 'post_feed', platform: channel, versions: 1, priority: 'media', notes: null }];

  try {
    for (const [idx, piece] of effectivePieces.entries()) {
      const pieceLabel = `---PEÇA ${String(idx + 1).padStart(2, '0')}---`;
      const pieceInstruction = [
        pieceLabel,
        `Formato: ${piece.format_type}`,
        `Plataforma: ${piece.platform ?? platform}`,
        `Versões: ${piece.versions ?? 1}`,
        piece.notes ? `Instrução especial: ${piece.notes}` : '',
      ].filter(Boolean).join('\n');

      const piecePlatform = CHANNEL_PLATFORM[piece.platform ?? channel] ?? platform;
      const isCarousel = ['carrossel', 'design_carousel'].includes(piece.format_type);

      const draft: DraftContent = await generateBehavioralDraft({
        platform: piecePlatform,
        format: isCarousel ? 'Carrossel' : 'Post',
        persona,
        behaviorIntent,
        campaignObjective: job.title,
        clientName: client.name,
        clientSegment: profile.segment || undefined,
        knowledgeBlock: `${knowledgeBlock}\n\n${pieceInstruction}`,
      });

      const audit = await auditDraftContent({
        draft,
        persona,
        behaviorIntent,
        clientName: client.name,
      });

      await insertDraft(tenantId, jobId, 'copy', 'done', {
        hook_text: audit.approved_text || draft.hook_text,
        content_text: draft.content_text,
        cta_text: draft.cta_text,
        copy_approval_status: audit.approval_status,
        fogg_score: audit.fogg_score,
        model_used: 'claude',
        prompt_used: pieceInstruction,
      }, briefing?.id);
    }

    await setAutomationStatus(tenantId, jobId, 'copy_done');

    // Chain to image generation (for the first/primary piece)
    await enqueueJob(tenantId, 'job_automation', { jobId, step: 'image' });
  } catch (err: any) {
    await insertDraft(tenantId, jobId, 'copy', 'failed', {
      error_message: err?.message || 'Erro ao gerar copy',
    });
    await setAutomationStatus(tenantId, jobId, 'copy_done');
  }
}

// ─── Auto-Image Generation ───────────────────────────────────────────────────

export async function generateJobImage(tenantId: string, jobId: string): Promise<void> {
  const job = await fetchJob(tenantId, jobId);
  if (!job || !job.client_id) return;

  await setAutomationStatus(tenantId, jobId, 'image_pending');

  const client = await getClientById(tenantId, job.client_id);
  if (!client) {
    await insertDraft(tenantId, jobId, 'image', 'failed', { error_message: 'Cliente não encontrado' });
    return;
  }

  // Fetch the copy draft
  const copyDraft = await getLatestDraft(tenantId, jobId, 'copy');
  const headline = copyDraft?.hook_text || job.title;
  const body = copyDraft?.content_text || job.summary || '';
  const cta = copyDraft?.cta_text || 'Saiba mais';

  const profile = client.profile || {};
  const channel = String(job.channel || 'instagram').toLowerCase();
  const format = CHANNEL_FORMAT[channel] || '1:1';
  const platform = CHANNEL_PLATFORM[channel] || 'Instagram';
  const brandColors: string[] = profile.brand_colors || [];
  const logoUrl = profile.logo_url || client.logo_url;

  try {
    // Art direction
    const artResult = await runAgentDiretorArte({
      copy: headline,
      clientProfile: profile,
      platform,
      format: `Feed ${format}`,
    });

    const artDirection = {
      color_palette: brandColors.length ? brandColors : [artResult?.brandVisual?.primaryColor || '#E85219'],
      primary_color: artResult?.brandVisual?.primaryColor || brandColors[0] || '#E85219',
      accent_color: brandColors[1] || '#FFFFFF',
      typography: {
        headline_style: artResult?.brandVisual?.typography || 'bold sans-serif',
        body_style: 'regular sans-serif, 16px',
        cta_style: 'semi-bold, 14px',
      },
      photo_directive: artResult?.payload?.prompt || headline,
      mood: artResult?.brandVisual?.moodKeywords?.[0] || 'professional',
    };

    // Layout
    const layout = await generateLayout({
      copy: { headline, body, cta },
      artDirection,
      format,
      logoUrl,
      platform,
    });

    // Image generation with layout-aware prompt
    const imageResult = await generateImageWithFal({
      prompt: layout.imagePrompt || artDirection.photo_directive,
      aspectRatio: format,
      model: 'flux-pro',
    });

    // Persist
    await insertDraft(tenantId, jobId, 'image', 'done', {
      image_url: imageResult.imageUrl,
      image_urls: imageResult.imageUrls,
      layout: layout,
      art_direction: artDirection,
      prompt_used: layout.imagePrompt || artDirection.photo_directive,
      model_used: 'flux-pro',
    });

    await setAutomationStatus(tenantId, jobId, 'image_done');

    // If job has no owner, try to auto-assign
    if (!job.owner_id && job.required_skill) {
      await enqueueJob(tenantId, 'job_automation', { jobId, step: 'assign' });
    } else if (job.owner_id) {
      // Notify the assigned designer that creative is ready
      await notifyEvent({
        event: 'job_creative_ready',
        tenantId,
        userId: job.owner_id,
        title: `Rascunho IA pronto: ${job.title}`,
        body: `A IA gerou copy e imagem para "${job.title}" (${client.name}). Revise e aprove.`,
        link: `/admin/operacoes/jobs`,
      });
    }
  } catch (err: any) {
    await insertDraft(tenantId, jobId, 'image', 'failed', {
      error_message: err?.message || 'Erro ao gerar imagem',
    });
    await setAutomationStatus(tenantId, jobId, 'image_done');
  }
}

// ─── Auto-Assignment (least-loaded owner with matching skill) ────────────────

export async function autoAssignJob(tenantId: string, jobId: string): Promise<void> {
  const job = await fetchJob(tenantId, jobId);
  if (!job || job.owner_id) return; // already assigned

  const skill = job.required_skill;
  if (!skill) return;

  // Find owners with matching skill and their current load + contact info
  const { rows: owners } = await query<{
    id: string;
    name: string;
    email: string | null;
    whatsapp_jid: string | null;
    committed_minutes: number;
  }>(
    `SELECT
       u.id,
       COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS name,
       u.email,
       fp.whatsapp_jid,
       COALESCE(SUM(CASE
         WHEN j.status IN ('allocated', 'in_progress', 'in_review')
         THEN j.estimated_minutes ELSE 0 END
       ), 0)::int AS committed_minutes
     FROM edro_users u
     JOIN tenant_users tu ON tu.user_id = u.id AND tu.tenant_id::text = $1
     LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
     LEFT JOIN jobs j ON j.owner_id = u.id AND j.tenant_id = $1
       AND j.status NOT IN ('done', 'archived', 'blocked')
     WHERE tu.role IN ('member', 'admin', 'manager')
     GROUP BY u.id, u.name, u.email, fp.whatsapp_jid
     ORDER BY committed_minutes ASC
     LIMIT 5`,
    [tenantId],
  );

  if (!owners.length) return;

  // Pick least-loaded owner
  const chosen = owners[0];

  try {
    await upsertJobAllocation(tenantId, {
      jobId,
      ownerId: chosen.id,
      status: 'tentative',
      plannedMinutes: job.estimated_minutes || null,
      changedBy: null, // system
    });

    // Notify the chosen designer via in-app + WhatsApp
    const deadline = job.deadline_at ? new Date(job.deadline_at).toLocaleDateString('pt-BR') : null;
    await notifyEvent({
      event: 'job_assigned',
      tenantId,
      userId: chosen.id,
      title: `Novo job: ${job.title}`,
      body: [
        job.client_name ? `Cliente: ${job.client_name}` : null,
        deadline ? `Prazo: ${deadline}` : 'Sem prazo definido',
      ].filter(Boolean).join('\n'),
      link: '/admin/operacoes/jobs',
      recipientEmail: chosen.email ?? undefined,
      recipientPhone: chosen.whatsapp_jid ?? undefined,
    });

    // Calculate ETA
    await recalculateOwnerETAs(tenantId, chosen.id);
  } catch {
    // Assignment failed — leave unassigned for manual intervention
  }
}

// ─── ETA Calculation ─────────────────────────────────────────────────────────

export async function calculateJobETA(
  tenantId: string,
  jobId: string,
  ownerId: string,
): Promise<Date | null> {
  // Get all active jobs for this owner, ordered by priority (highest first)
  const { rows: ownerJobs } = await query<{
    id: string;
    estimated_minutes: number;
    priority_score: number;
  }>(
    `SELECT j.id, COALESCE(j.estimated_minutes, 60) AS estimated_minutes, j.priority_score
     FROM jobs j
     WHERE j.tenant_id = $1
       AND j.owner_id = $2
       AND j.status IN ('allocated', 'in_progress')
     ORDER BY j.priority_score DESC, j.created_at ASC`,
    [tenantId, ownerId],
  );

  if (!ownerJobs.length) return null;

  // Sum minutes of all jobs ahead in queue (higher priority or earlier)
  let minutesAhead = 0;
  for (const oj of ownerJobs) {
    if (oj.id === jobId) break;
    minutesAhead += oj.estimated_minutes;
  }

  // Add this job's own time
  const thisJob = ownerJobs.find((j) => j.id === jobId);
  if (!thisJob) return null;
  const totalMinutes = minutesAhead + thisJob.estimated_minutes;

  // Project ETA into business hours (9h-18h, Mon-Fri, 540 min/day)
  const WORK_MINUTES_PER_DAY = 540; // 9h
  const now = new Date();
  let remainingMinutes = totalMinutes;
  const eta = new Date(now);

  // Advance to next business hour if outside work hours
  advanceToBusinessHours(eta);

  while (remainingMinutes > 0) {
    const endOfDay = new Date(eta);
    endOfDay.setHours(18, 0, 0, 0);
    const minutesLeftToday = Math.max(0, (endOfDay.getTime() - eta.getTime()) / 60000);

    if (remainingMinutes <= minutesLeftToday) {
      eta.setMinutes(eta.getMinutes() + remainingMinutes);
      remainingMinutes = 0;
    } else {
      remainingMinutes -= minutesLeftToday;
      // Move to next business day 9:00
      eta.setDate(eta.getDate() + 1);
      eta.setHours(9, 0, 0, 0);
      skipWeekend(eta);
    }
  }

  return eta;
}

export async function recalculateOwnerETAs(tenantId: string, ownerId: string): Promise<void> {
  const { rows: ownerJobs } = await query<{
    id: string;
    estimated_minutes: number;
    priority_score: number;
  }>(
    `SELECT j.id, COALESCE(j.estimated_minutes, 60) AS estimated_minutes, j.priority_score
     FROM jobs j
     WHERE j.tenant_id = $1
       AND j.owner_id = $2
       AND j.status IN ('allocated', 'in_progress')
     ORDER BY j.priority_score DESC, j.created_at ASC`,
    [tenantId, ownerId],
  );

  const now = new Date();
  let cumulativeMinutes = 0;

  for (let i = 0; i < ownerJobs.length; i++) {
    const job = ownerJobs[i];
    cumulativeMinutes += job.estimated_minutes;
    const eta = projectETA(now, cumulativeMinutes);

    await query(
      `UPDATE job_allocations
         SET queue_position = $1, estimated_delivery_at = $2
       WHERE tenant_id = $3 AND job_id = $4 AND allocation_kind = 'primary'`,
      [i + 1, eta.toISOString(), tenantId, job.id],
    );
  }
}

// ─── Next Job for Owner (when designer finishes) ─────────────────────────────

export async function getNextJobForOwner(
  tenantId: string,
  ownerId: string,
): Promise<{ id: string; title: string; client_name?: string } | null> {
  const { rows } = await query<{ id: string; title: string; client_name?: string }>(
    `SELECT j.id, j.title, c.name AS client_name
     FROM jobs j
     LEFT JOIN clients c ON c.id = j.client_id
     WHERE j.tenant_id = $1
       AND j.owner_id = $2
       AND j.status = 'allocated'
     ORDER BY j.priority_score DESC, j.created_at ASC
     LIMIT 1`,
    [tenantId, ownerId],
  );

  return rows[0] || null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchJob(tenantId: string, jobId: string) {
  const { rows } = await query<any>(
    `SELECT j.*, c.name AS client_name
     FROM jobs j
     LEFT JOIN clients c ON c.id = j.client_id
     WHERE j.id = $1 AND j.tenant_id = $2`,
    [jobId, tenantId],
  );
  return rows[0] || null;
}

async function setAutomationStatus(tenantId: string, jobId: string, status: string) {
  await query(
    `UPDATE jobs SET automation_status = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3`,
    [status, jobId, tenantId],
  );
}

async function insertDraft(
  tenantId: string,
  jobId: string,
  draftType: string,
  status: string,
  data: Record<string, any>,
  briefingId?: string | null,
) {
  await query(
    `INSERT INTO job_creative_drafts (
       tenant_id, job_id, draft_type, status,
       hook_text, content_text, cta_text, copy_approval_status, fogg_score,
       image_url, image_urls, layout, art_direction,
       prompt_used, model_used, error_message, briefing_id, generated_at
     ) VALUES (
       $1, $2, $3, $4,
       $5, $6, $7, $8, $9::jsonb,
       $10, $11, $12::jsonb, $13::jsonb,
       $14, $15, $16, $17, ${status === 'done' ? 'now()' : 'NULL'}
     )`,
    [
      tenantId,
      jobId,
      draftType,
      status,
      data.hook_text ?? null,
      data.content_text ?? null,
      data.cta_text ?? null,
      data.copy_approval_status ?? null,
      data.fogg_score ? JSON.stringify(data.fogg_score) : null,
      data.image_url ?? null,
      data.image_urls ?? null,
      data.layout ? JSON.stringify(data.layout) : null,
      data.art_direction ? JSON.stringify(data.art_direction) : null,
      data.prompt_used ?? null,
      data.model_used ?? null,
      data.error_message ?? null,
      briefingId ?? null,
    ],
  );
}

async function getLatestDraft(tenantId: string, jobId: string, draftType: string) {
  const { rows } = await query<any>(
    `SELECT * FROM job_creative_drafts
     WHERE tenant_id = $1 AND job_id = $2 AND draft_type = $3 AND status = 'done'
     ORDER BY created_at DESC LIMIT 1`,
    [tenantId, jobId, draftType],
  );
  return rows[0] || null;
}

function advanceToBusinessHours(d: Date) {
  skipWeekend(d);
  if (d.getHours() < 9) d.setHours(9, 0, 0, 0);
  if (d.getHours() >= 18) {
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    skipWeekend(d);
  }
}

function skipWeekend(d: Date) {
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
}

function projectETA(from: Date, totalMinutes: number): Date {
  const WORK_MINUTES_PER_DAY = 540;
  const eta = new Date(from);
  let remaining = totalMinutes;

  advanceToBusinessHours(eta);

  while (remaining > 0) {
    const endOfDay = new Date(eta);
    endOfDay.setHours(18, 0, 0, 0);
    const minutesLeftToday = Math.max(0, (endOfDay.getTime() - eta.getTime()) / 60000);

    if (remaining <= minutesLeftToday) {
      eta.setMinutes(eta.getMinutes() + remaining);
      remaining = 0;
    } else {
      remaining -= minutesLeftToday;
      eta.setDate(eta.getDate() + 1);
      eta.setHours(9, 0, 0, 0);
      skipWeekend(eta);
    }
  }

  return eta;
}
