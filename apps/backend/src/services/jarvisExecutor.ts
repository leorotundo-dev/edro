/**
 * jarvisExecutor.ts
 *
 * Orchestrator that assembles the CCO once and passes it to the full
 * copy + visual generation chain in parallel.
 *
 * Flow:
 *   assembleCreativeContext()        ← 1 DB roundtrip, all sources parallel
 *     → runAgentConceito()           ← generates 5 concepts, returns chosen spine
 *     → generateVisualBrief()        ← derives visual from tensão (not from copy)
 *     → runAgentRedator() in parallel with runAgentDiretorArte()
 *     → returns JarvisExecutorResult
 *
 * This is the entry point when Jarvis initiates autonomous creation.
 * For manual Studio pipeline, each node calls its own endpoint directly.
 */

import {
  assembleCreativeContext,
  generateVisualBrief,
  toConceitoParams,
  toRedatorParams,
  type CreativeContextObject,
  type VisualBrief,
} from './creativeContextService';
import type { BriefingDiagnostics } from './briefingDiagnosticService';
import { runAgentConceito, type AgentConceitoResult, type CreativeConcept } from './ai/agentConceito';
import { runAgentRedator, type AgentRedatorResult } from './ai/agentRedator';
import { runAgentDiretorArte, type AgentDiretorArteResult } from './ai/agentDiretorArte';

// ── Types ─────────────────────────────────────────────────────────────────────

export type JarvisExecutorParams = {
  briefingId: string;
  clientId?: string | null;
  tenantId: string;
  platform?: string | null;
  format?: string | null;
  conceptIndex?: number;        // Which concept to use (default: recommended)
  skipArte?: boolean;           // Skip image generation (text-only jobs)
  onProgress?: (step: string, data: object) => void;
};

export type JarvisExecutorResult = {
  cco: CreativeContextObject;
  conceito: AgentConceitoResult & { chosen: CreativeConcept };
  visual_brief: VisualBrief;
  copy: AgentRedatorResult;
  arte: AgentDiretorArteResult | null;
  briefing_diagnostics: BriefingDiagnostics | null;
  duration_ms: number;
  sources_used: string[];
};

// ── Main ──────────────────────────────────────────────────────────────────────

export async function runJarvisExecutor(params: JarvisExecutorParams): Promise<JarvisExecutorResult> {
  const t0 = Date.now();
  const emit = params.onProgress ?? (() => {});

  // ── Step 1: Assemble CCO ────────────────────────────────────────────────
  emit('cco_start', { briefingId: params.briefingId });
  const cco = await assembleCreativeContext({
    briefingId: params.briefingId,
    clientId: params.clientId,
    tenantId: params.tenantId,
  });

  if (!cco) throw new Error('cco_not_found');
  emit('cco_done', { clienteNome: cco.cliente.nome, learningRules: cco.comportamento.learningRules.length });

  // Track which sources were available
  const sources_used: string[] = ['briefing'];
  if (cco.cliente.nome !== 'Não informado') sources_used.push('cliente');
  if (cco.comportamento.amd !== 'salvar') sources_used.push('comportamento');
  if (cco.comportamento.learningRules.length > 0) sources_used.push('learning');
  if (cco.cultura) sources_used.push('cultura');
  if (cco.memoria.copiesAnteriores.length > 0) sources_used.push('memoria');
  if (cco.memoria.diagnosticoBriefing) sources_used.push('diagnostico_briefing');

  // ── Step 2: Generate Conceito (spine) ───────────────────────────────────
  emit('conceito_start', {});
  const conceitoResult = await runAgentConceito(toConceitoParams(cco));
  const chosenIdx = params.conceptIndex ?? conceitoResult.recommended_index ?? 0;
  const chosen = conceitoResult.concepts[chosenIdx];
  emit('conceito_done', { chosen: chosen.headline_concept, total: conceitoResult.concepts.length });

  // Build concept block to inject into Redator
  const conceptBlock = `
CONCEITO CRIATIVO APROVADO:
- Ideia central: ${chosen.headline_concept}
- Verdade emocional: ${chosen.emotional_truth}
- Ângulo cultural: ${chosen.cultural_angle}
- Estrutura sugerida: ${chosen.suggested_structure}
- Direção visual: ${chosen.visual_direction}`.trim();

  // ── Step 3: Visual Brief from tensão ────────────────────────────────────
  emit('visual_brief_start', {});
  const visual_brief = await generateVisualBrief({
    conceito: chosen,
    artDirectionContext: cco.visual.artDirectionContext,
    plataforma: params.platform ?? cco.briefing.plataforma,
    formato: params.format ?? cco.briefing.formato,
  });
  emit('visual_brief_done', { cena: visual_brief.cena.slice(0, 60) });

  // ── Step 4: Copy + Arte in parallel ─────────────────────────────────────
  emit('generation_start', { skipArte: params.skipArte ?? false });

  const redatorParams = toRedatorParams(cco, conceptBlock);
  const daParams = {
    briefing: { title: cco.briefing.titulo, payload: cco.briefing.payload },
    clientProfile: cco.cliente.raw,
    platform: params.platform ?? cco.briefing.plataforma ?? undefined,
    format: params.format ?? cco.briefing.formato ?? undefined,
    campaignConcept: `${chosen.headline_concept} — ${chosen.emotional_truth}`,
    // Pass visual brief as spatial directive
    spatialDirective: visual_brief.composicao,
    tenantId: params.tenantId,
    clientId: params.clientId ?? undefined,
  };

  const [copyResult, arteResult] = await Promise.allSettled([
    runAgentRedator(redatorParams),
    params.skipArte ? Promise.resolve(null) : runAgentDiretorArte(daParams),
  ]);

  const copy = copyResult.status === 'fulfilled'
    ? copyResult.value
    : (() => { throw new Error(`Copy failed: ${(copyResult as PromiseRejectedResult).reason}`); })();

  const arte = arteResult.status === 'fulfilled'
    ? arteResult.value
    : null; // Arte failure is non-fatal — return copy without image

  if (arteResult.status === 'rejected') {
    console.warn('[jarvisExecutor] Arte failed (non-fatal):', arteResult.reason);
  }

  emit('generation_done', {
    copyVariants: copy.variants?.length ?? 0,
    arteSuccess: arte !== null,
  });

  return {
    cco,
    conceito: { ...conceitoResult, chosen },
    visual_brief,
    copy,
    arte,
    briefing_diagnostics: (cco.briefing.payload?.briefing_diagnostics_structured as BriefingDiagnostics | undefined) ?? null,
    duration_ms: Date.now() - t0,
    sources_used,
  };
}
