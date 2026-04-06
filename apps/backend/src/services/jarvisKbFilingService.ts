/**
 * Jarvis KB Filing Service
 *
 * Responsible for extracting insights from JARVIS-generated outputs
 * (copy, briefings, campaign proposals, QA answers) and filing them
 * back as hypothesis-level entries in jarvis_kb_entries.
 *
 * Evidence always starts as 'hypothesis' when filed from output —
 * it needs performance confirmation to upgrade.
 *
 * Hooked into:
 *   - copyOrchestrator: after generating copy
 *   - autoBriefingFromOpportunityWorker: after creating briefings
 *   - jarvisProposalWorker: after creating proposals
 */

import { query } from '../db';

// ── Types ─────────────────────────────────────────────────────────────────────

export type OutputType = 'copy' | 'briefing' | 'campaign_proposal' | 'qa_answer';

export interface FilingContext {
  /** Which persona was used (name or ID) */
  persona?: string;
  /** Which triggers were used in this output */
  triggers?: string[];
  /** Target micro-behavior (AMD) that was set */
  micro_behavior?: string;
  /** Campaign phase: historia | prova | convite */
  phase?: string;
  /** Platform this output targets */
  platform?: string;
  /** Additional metadata (e.g., briefing_id, campaign_id) */
  metadata?: Record<string, any>;
}

export interface FilingResult {
  entries_filed: number;
  topics: string[];
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * fileOutputToKb — extract insights from a JARVIS output and file them to KB.
 *
 * @param tenantId  tenant_id
 * @param clientId  clients.id (TEXT)
 * @param output    the generated text (copy / briefing / proposal / answer)
 * @param outputType one of 'copy' | 'briefing' | 'campaign_proposal' | 'qa_answer'
 * @param ctx       behavioral context (triggers, persona, micro_behavior, etc.)
 */
export async function fileOutputToKb(
  tenantId: string,
  clientId: string,
  output: string,
  outputType: OutputType,
  ctx: FilingContext = {}
): Promise<FilingResult> {
  const entries: Array<{ topic: string; content: string; category: string; source_data: Record<string, any> }> = [];

  // ── 1. File trigger usage ────────────────────────────────────────────────
  if (ctx.triggers?.length) {
    for (const trigger of ctx.triggers) {
      const topic = `trigger_used:${trigger}:${outputType}`;
      const content = buildTriggerUsageContent(trigger, outputType, ctx, output);
      entries.push({ topic, content, category: 'trigger', source_data: { trigger, output_type: outputType, persona: ctx.persona, phase: ctx.phase } });
    }
  }

  // ── 2. File persona usage ────────────────────────────────────────────────
  if (ctx.persona) {
    const topic = `persona_used:${ctx.persona}:${outputType}`;
    const content = buildPersonaUsageContent(ctx.persona, outputType, ctx, output);
    entries.push({ topic, content, category: 'persona', source_data: { persona: ctx.persona, output_type: outputType, phase: ctx.phase } });
  }

  // ── 3. File AMD / micro_behavior ─────────────────────────────────────────
  if (ctx.micro_behavior) {
    const topic = `amd_used:${ctx.micro_behavior}:${outputType}`;
    const content = buildAmdUsageContent(ctx.micro_behavior, outputType, ctx, output);
    entries.push({ topic, content, category: 'amd', source_data: { amd: ctx.micro_behavior, output_type: outputType, phase: ctx.phase } });
  }

  // ── 4. File platform usage (for copy specifically) ───────────────────────
  if (ctx.platform && outputType === 'copy') {
    const topic = `platform_copy:${ctx.platform}:${ctx.micro_behavior ?? 'generic'}`;
    const content = buildPlatformCopyContent(ctx.platform, ctx, output);
    entries.push({ topic, content, category: 'platform', source_data: { platform: ctx.platform, amd: ctx.micro_behavior, triggers: ctx.triggers } });
  }

  // ── 5. File campaign proposal ────────────────────────────────────────────
  if (outputType === 'campaign_proposal') {
    const topic = `proposal_filed:${Date.now()}`;
    const summary = output.length > 300 ? output.slice(0, 300) + '...' : output;
    const content = `[hipótese] Proposta de campanha gerada para fase "${ctx.phase ?? 'desconhecida'}". Persona: ${ctx.persona ?? 'não especificada'}. AMD: ${ctx.micro_behavior ?? 'não especificado'}. Gatilhos: ${(ctx.triggers ?? []).join(', ') || 'nenhum'}. Resumo: ${summary}`;
    entries.push({ topic, content, category: 'proposal', source_data: { output_type: outputType, ...ctx.metadata } });
  }

  if (!entries.length) return { entries_filed: 0, topics: [] };

  const topics: string[] = [];

  for (const entry of entries) {
    try {
      await query(
        `INSERT INTO jarvis_kb_entries
           (tenant_id, client_id, topic, category, content, evidence_level, source, source_data)
         VALUES ($1,$2,$3,$4,$5,'hypothesis',$6,$7::jsonb)
         ON CONFLICT (tenant_id, client_id, topic)
         DO UPDATE SET
           content    = EXCLUDED.content,
           source_data = EXCLUDED.source_data,
           updated_at = now()`,
        [
          tenantId, clientId,
          entry.topic, entry.category, entry.content,
          `jarvis_output:${outputType}`,
          JSON.stringify(entry.source_data),
        ]
      );
      topics.push(entry.topic);
    } catch (err) {
      console.error(`[jarvisKbFilingService] Failed to file entry "${entry.topic}":`, err);
    }
  }

  return { entries_filed: topics.length, topics };
}

// ── Content builders ──────────────────────────────────────────────────────────

function buildTriggerUsageContent(
  trigger: string,
  outputType: OutputType,
  ctx: FilingContext,
  output: string
): string {
  const outputLabel: Record<OutputType, string> = {
    copy: 'copy',
    briefing: 'briefing',
    campaign_proposal: 'proposta de campanha',
    qa_answer: 'resposta IA',
  };
  const phaseNote = ctx.phase ? ` (fase: ${ctx.phase})` : '';
  const personaNote = ctx.persona ? ` para persona "${ctx.persona}"` : '';
  const amdNote = ctx.micro_behavior ? ` com AMD "${ctx.micro_behavior}"` : '';
  const preview = output.length > 150 ? output.slice(0, 150) + '...' : output;

  return `[hipótese] Gatilho "${trigger}" utilizado em ${outputLabel[outputType]}${phaseNote}${personaNote}${amdNote}. Preview: "${preview}"`;
}

function buildPersonaUsageContent(
  persona: string,
  outputType: OutputType,
  ctx: FilingContext,
  output: string
): string {
  const triggersNote = ctx.triggers?.length ? ` Gatilhos: ${ctx.triggers.join(', ')}.` : '';
  const amdNote = ctx.micro_behavior ? ` AMD: ${ctx.micro_behavior}.` : '';
  const preview = output.length > 150 ? output.slice(0, 150) + '...' : output;
  return `[hipótese] Persona "${persona}" usada em ${outputType}.${triggersNote}${amdNote} Preview: "${preview}"`;
}

function buildAmdUsageContent(
  amd: string,
  outputType: OutputType,
  ctx: FilingContext,
  output: string
): string {
  const phaseNote = ctx.phase ? ` fase "${ctx.phase}"` : '';
  const triggersNote = ctx.triggers?.length ? ` Gatilhos utilizados: ${ctx.triggers.join(', ')}.` : '';
  const preview = output.length > 150 ? output.slice(0, 150) + '...' : output;
  return `[hipótese] AMD "${amd}" aplicado em ${outputType}${phaseNote}.${triggersNote} Preview: "${preview}"`;
}

function buildPlatformCopyContent(
  platform: string,
  ctx: FilingContext,
  output: string
): string {
  const amdNote = ctx.micro_behavior ? ` AMD: ${ctx.micro_behavior}.` : '';
  const triggersNote = ctx.triggers?.length ? ` Gatilhos: ${ctx.triggers.join(', ')}.` : '';
  const preview = output.length > 150 ? output.slice(0, 150) + '...' : output;
  return `[hipótese] Copy gerado para plataforma "${platform}".${amdNote}${triggersNote} Preview: "${preview}"`;
}
