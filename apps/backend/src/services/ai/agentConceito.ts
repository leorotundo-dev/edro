/**
 * agentConceito — Camada 2: A Grande Ideia
 *
 * Gera 5–10 conceitos criativos ANTES do agentRedator.
 * Um conceito é a tensão emocional central que une briefing e audiência.
 * Sem conceito definido, o Redator é execução sem estratégia.
 *
 * Pipeline:
 *   Claude  → nuance, voz, emoção, compliance
 *   GPT-4o  → volume, variantes, brainstorming criativo
 *
 * O planner escolhe 1 conceito, que é passado para runAgentRedator como contextBlock adicional.
 */

import { generateCompletion } from './claudeService';
import { generateWithProvider as generateWithOrchestrator } from './copyOrchestrator';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreativeConcept = {
  concept_id: string;
  headline_concept: string;      // A tensão central em 1 frase
  emotional_truth: string;       // A verdade emocional explorada
  cultural_angle: string;        // Conexão com o momento atual
  visual_direction: string;      // Direção visual sugerida para o DA
  suggested_structure: 'AIDA' | 'PAS' | 'BAB' | 'Storytelling' | 'Contraste' | 'Curiosidade';
  risk_level: 'safe' | 'bold' | 'disruptive';
  rationale: string;             // Por que este conceito funciona agora
};

export type AgentConceitoParams = {
  briefing?: { title?: string; objective?: string; context?: string } | null;
  clientProfile?: any;
  platform?: string | null;
  cultureBlock?: string | null;   // Injected by cultureBriefingService
  conceptCount?: number;          // Default: 6
};

export type AgentConceitoResult = {
  concepts: CreativeConcept[];
  recommended_index: number;      // Agent's top pick
};

// ─── Shared system prompt ─────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `Você é o melhor diretor de criação do Brasil.
Sua especialidade é a GRANDE IDEIA — o conceito que transforma um briefing em campanha memorável.

Um conceito não é uma copy. É a VERDADE EMOCIONAL que une o briefing e a audiência.
É o que separa um post bem escrito de uma campanha que as pessoas lembram anos depois.

PRINCÍPIOS DO BOM CONCEITO:
- Tensão central: conflito ou paradoxo que a marca resolve
- Verdade humana: algo que a audiência sente mas nunca verbalizou
- Ângulo cultural: por que isso importa AGORA, não seis meses atrás
- Direção visual: o DA deve conseguir imaginar a arte ao ler
- Estrutura narrativa clara: AIDA, PAS, BAB, Storytelling, Contraste ou Curiosidade

OUTPUT: retorne JSON puro, sem markdown, sem explicações.`;
}

function buildUserPrompt(params: AgentConceitoParams, count: number): string {
  const { briefing, clientProfile, platform, cultureBlock } = params;
  const kb = clientProfile?.knowledge_base ?? {};
  const profile = clientProfile?.profile ?? clientProfile ?? {};

  const lines: string[] = [];

  lines.push(`BRIEFING:`);
  lines.push(`- Título: ${briefing?.title ?? 'não informado'}`);
  lines.push(`- Objetivo: ${briefing?.objective ?? 'não informado'}`);
  if (briefing?.context) lines.push(`- Contexto: ${briefing.context}`);

  lines.push(`\nCLIENTE:`);
  lines.push(`- Marca: ${kb.brand_name ?? profile.name ?? 'não informado'}`);
  lines.push(`- Promessa: ${kb.brand_promise ?? 'não informada'}`);
  lines.push(`- Diferenciais: ${(kb.differentiators ?? []).slice(0, 3).join(' | ') || 'não informados'}`);
  lines.push(`- Tom de voz: ${profile.tone_description ?? kb.tone ?? 'não informado'}`);
  if (kb.forbidden_claims?.length) lines.push(`- Proibições: ${kb.forbidden_claims.slice(0, 3).join(', ')}`);

  if (platform) lines.push(`\nPLATAFORMA ALVO: ${platform}`);

  if (cultureBlock) {
    lines.push(`\nCONTEXTO CULTURAL ATUAL (use para dar relevância ao conceito):`);
    lines.push(cultureBlock);
  }

  lines.push(`\nGERE exatamente ${count} conceitos criativos distintos. Para cada um:
{
  "concept_id": "c1",
  "headline_concept": "A tensão central em 1 frase curta e poderosa",
  "emotional_truth": "A verdade humana que está sendo explorada",
  "cultural_angle": "Por que isso ressoa AGORA",
  "visual_direction": "Como o DA deve pensar a arte para este conceito",
  "suggested_structure": "AIDA|PAS|BAB|Storytelling|Contraste|Curiosidade",
  "risk_level": "safe|bold|disruptive",
  "rationale": "Por que este conceito funciona para esta marca neste momento"
}

Retorne: { "concepts": [...], "recommended_index": 0 }
Varie os estilos: misture safe + bold + disruptive. O índice recomendado deve ser o com maior potencial.`);

  return lines.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function runAgentConceito(params: AgentConceitoParams): Promise<AgentConceitoResult> {
  const count = Math.min(Math.max(params.conceptCount ?? 6, 3), 10);
  const system = buildSystemPrompt();
  const userPrompt = buildUserPrompt(params, count);

  // Run Claude (nuance) + GPT-4o (volume/creativity) in parallel, merge best
  const [claudeRes, gptRes] = await Promise.allSettled([
    generateCompletion({ prompt: userPrompt, systemPrompt: system, temperature: 0.85, maxTokens: 3000 }),
    generateWithOrchestrator('openai', { prompt: userPrompt, systemPrompt: system, temperature: 0.92, maxTokens: 3000 }),
  ]);

  const allConcepts: CreativeConcept[] = [];
  let recommendedIndex = 0;

  for (const res of [claudeRes, gptRes]) {
    if (res.status !== 'fulfilled') continue;
    const text = 'text' in res.value ? res.value.text : (res.value as any).output ?? '';
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;
      const parsed = JSON.parse(jsonMatch[0]) as { concepts: CreativeConcept[]; recommended_index: number };
      if (Array.isArray(parsed.concepts)) {
        allConcepts.push(...parsed.concepts);
        recommendedIndex = parsed.recommended_index ?? 0;
      }
    } catch { /* skip malformed */ }
  }

  // Deduplicate by headline concept (simple similarity check)
  const seen = new Set<string>();
  const unique = allConcepts.filter((c) => {
    const key = c.headline_concept?.slice(0, 40).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Ensure concept_ids are sequential and unique
  const concepts = unique.slice(0, count).map((c, i) => ({ ...c, concept_id: `c${i + 1}` }));

  // Fallback: if both models failed, return a minimal placeholder
  if (concepts.length === 0) {
    concepts.push({
      concept_id: 'c1',
      headline_concept: briefingFallback(params),
      emotional_truth: 'A ser explorada',
      cultural_angle: 'Contexto atual do mercado',
      visual_direction: 'Visual limpo com foco na mensagem',
      suggested_structure: 'AIDA',
      risk_level: 'safe',
      rationale: 'Conceito base para desenvolvimento',
    });
  }

  return { concepts, recommended_index: Math.min(recommendedIndex, concepts.length - 1) };
}

function briefingFallback(params: AgentConceitoParams): string {
  return params.briefing?.title ?? params.clientProfile?.name ?? 'Conceito a definir';
}

// ─── Sequential Campaign Plan ──────────────────────────────────────────────────

export type CampaignPhase = {
  phase: number;
  name: string;              // e.g. "Consciência", "Prova Social", "Conversão"
  objective: string;
  amd: 'salvar' | 'clicar' | 'compartilhar' | 'responder' | 'marcar_amigo';
  tone: string;
  key_message: string;
  trigger: string;           // Behavioral trigger to use
  suggested_format: string;  // e.g. "carrossel", "reels", "copy_legenda"
  timing_days: number;       // Publish N days after campaign start
};

export type SequencePlan = {
  campaign_title: string;
  objective: string;
  total_phases: number;
  phases: CampaignPhase[];
  narrative_arc: string;     // The emotional journey across phases
};

export type SequencePlanParams = {
  objective: string;          // Overall campaign objective
  clientProfile?: any;
  platform?: string | null;
  phases?: number;            // Number of phases (default: 3)
  cultureBlock?: string | null;
};

/**
 * Generates a sequential campaign plan with N phases.
 * Each phase has a specific AMD, tone, and timing.
 * Use the chosen concept from runAgentConceito as context.
 */
export async function generateSequencePlan(
  params: SequencePlanParams,
  concept?: CreativeConcept | null,
): Promise<SequencePlan> {
  const phaseCount = Math.min(Math.max(params.phases ?? 3, 2), 6);
  const kb = params.clientProfile?.knowledge_base ?? {};
  const profile = params.clientProfile?.profile ?? params.clientProfile ?? {};

  const conceptBlock = concept
    ? `\nCONCEITO CRIATIVO ESCOLHIDO: "${concept.headline_concept}"\nEstrutura: ${concept.suggested_structure}\n`
    : '';

  const prompt = `Você é um estrategista de marketing de performance especializado em campanhas sequenciais.

Crie um plano de campanha com ${phaseCount} fases para o objetivo abaixo.
Cada fase deve ter uma função específica na jornada do consumidor.
As fases devem se construir umas sobre as outras, criando um arco narrativo.

OBJETIVO: ${params.objective}
CLIENTE: ${kb.brand_name ?? profile.name ?? 'não informado'}
PLATAFORMA: ${params.platform ?? 'instagram'}
${conceptBlock}
${params.cultureBlock ? `\nCONTEXTO CULTURAL:\n${params.cultureBlock}` : ''}

Padrão de arco recomendado para ${phaseCount} fases:
${phaseCount === 2 ? '- Consciência → Conversão' : ''}
${phaseCount === 3 ? '- Consciência → Prova/Engajamento → Conversão' : ''}
${phaseCount === 4 ? '- Atenção → Interesse → Desejo → Ação' : ''}
${phaseCount >= 5 ? '- Consciência → Curiosidade → Prova → Objeção → Urgência → Conversão' : ''}

Para cada fase, especifique o AMD (ação mínima desejada): salvar | clicar | compartilhar | responder | marcar_amigo

Responda APENAS com JSON:
{
  "campaign_title": "Título da campanha",
  "objective": "Objetivo principal",
  "total_phases": ${phaseCount},
  "narrative_arc": "O arco emocional da campanha em 1-2 frases",
  "phases": [
    {
      "phase": 1,
      "name": "Nome da fase",
      "objective": "O que esta fase deve conseguir",
      "amd": "salvar|clicar|compartilhar|responder|marcar_amigo",
      "tone": "Tom desta fase (ex: curioso, inspirador, urgente)",
      "key_message": "Mensagem principal desta fase em 1 frase",
      "trigger": "Gatilho comportamental principal (ex: curiosidade, prova social, escassez)",
      "suggested_format": "carrossel|reels|copy_legenda|stories|video|thread",
      "timing_days": 0
    }
  ]
}`;

  const fallback: SequencePlan = {
    campaign_title: params.objective,
    objective: params.objective,
    total_phases: phaseCount,
    narrative_arc: 'Jornada do consumidor da consciência à conversão.',
    phases: Array.from({ length: phaseCount }, (_, i) => ({
      phase: i + 1,
      name: ['Consciência', 'Engajamento', 'Conversão', 'Retenção', 'Upsell', 'Defesa'][i] ?? `Fase ${i + 1}`,
      objective: 'A definir',
      amd: (i === phaseCount - 1 ? 'clicar' : i === 0 ? 'salvar' : 'compartilhar') as CampaignPhase['amd'],
      tone: 'neutro',
      key_message: 'Mensagem a definir',
      trigger: 'curiosidade',
      suggested_format: 'carrossel',
      timing_days: i * 7,
    })),
  };

  try {
    const result = await generateCompletion({ prompt, temperature: 0.75, maxTokens: 2500 });
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback;
    return JSON.parse(jsonMatch[0]) as SequencePlan;
  } catch (err: any) {
    console.error('[agentConceito] generateSequencePlan failed:', err?.message);
    return fallback;
  }
}

