import * as ClaudeService from './claudeService';
import { DraftContent, PersonaContext, BehaviorIntentContext } from './agentWriter';

// ── Types ─────────────────────────────────────────────────────────────────

export type AuditResult = {
  approval_status: 'approved' | 'needs_revision' | 'blocked';
  approved_text: string;       // texto final (pode ser o original ou revisado)
  revision_notes: string[];    // lista de pontos de atenção ou razões de rejeição
  fogg_score: {
    motivation: number;        // 1–10: o texto aumenta desejo/urgência?
    ability: number;           // 1–10: a ação pedida é simples o suficiente?
    prompt: number;            // 1–10: o CTA é claro, específico, oportuno?
  };
  behavior_tags: {
    stage: string;
    model: string;             // fogg | hook | generic
    triggers: string[];
    micro_behavior: string;
    emotional_tone: string;
  };
  policy_flags: string[];      // políticas violadas, se houver
};

type AuditorInput = {
  draft: DraftContent;
  persona: PersonaContext;
  behaviorIntent: BehaviorIntentContext;
  clientName?: string;
  phaseName?: string;          // historia | prova | convite
};

// ── Helpers ───────────────────────────────────────────────────────────────

const AI_CLICHÉS = [
  'mergulhe fundo', 'game changer', 'game-changer', 'revolucionar', 'paradigma',
  'sinergias', 'ecossistema', 'holístico', 'disruptivo', 'disrupção', 'jornada',
  'solução robusta', 'abordagem inovadora', 'transformação digital', 'no mundo de hoje',
  'nos dias atuais', 'em um mundo em constante mudança',
];

function detectClichés(text: string): string[] {
  const found: string[] = [];
  const lower = text.toLowerCase();
  for (const c of AI_CLICHÉS) {
    if (lower.includes(c)) found.push(c);
  }
  return found;
}

function detectForbiddenTerms(text: string, forbidden: string[]): string[] {
  const found: string[] = [];
  const lower = text.toLowerCase();
  for (const term of forbidden) {
    if (lower.includes(term.toLowerCase())) found.push(term);
  }
  return found;
}

function parseAuditFromText(text: string): AuditResult | null {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1)) as AuditResult;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function buildFallbackAudit(input: AuditorInput, preflightFlags: string[]): AuditResult {
  return {
    approval_status: preflightFlags.length > 2 ? 'needs_revision' : 'approved',
    approved_text: input.draft.content_text,
    revision_notes: preflightFlags,
    fogg_score: { motivation: 7, ability: 7, prompt: 7 },
    behavior_tags: {
      stage: input.behaviorIntent.momento,
      model: 'generic',
      triggers: input.behaviorIntent.triggers,
      micro_behavior: input.behaviorIntent.amd,
      emotional_tone: 'neutro',
    },
    policy_flags: [],
  };
}

// ── Main export ───────────────────────────────────────────────────────────

/**
 * AgentAuditor — Valida DraftContent contra o Modelo Fogg, linguagem da persona,
 * clichês de IA e políticas éticas básicas.
 *
 * Retorna:
 * - Texto aprovado ou revisado
 * - Score nas 3 dimensões do Fogg (motivação, habilidade, prompt/CTA)
 * - behavior_tags: metadados para análise de performance
 * - policy_flags: alertas de política violada
 */
export async function auditDraftContent(input: AuditorInput): Promise<AuditResult> {
  const { draft, persona, behaviorIntent, clientName, phaseName } = input;

  // ── Preflight checks (rápidos, sem IA) ──────────────────────────────────
  const preflightFlags: string[] = [];

  const clichéFound = detectClichés(draft.content_text + ' ' + draft.hook_text);
  if (clichéFound.length > 0) {
    preflightFlags.push(`Clichês de IA detectados: ${clichéFound.join(', ')}`);
  }

  const forbiddenFound = detectForbiddenTerms(
    draft.content_text + ' ' + draft.hook_text,
    persona.forbidden_terms || []
  );
  if (forbiddenFound.length > 0) {
    preflightFlags.push(`Termos proibidos da persona: ${forbiddenFound.join(', ')}`);
  }

  if (!draft.cta_text || draft.cta_text.length < 5) {
    preflightFlags.push('CTA ausente ou muito curto — o Fogg Prompt não será ativado');
  }

  // ── IA audit via Claude ──────────────────────────────────────────────────
  const prompt = `Você é o AgentAuditor da Edro Digital — um diretor de criação sênior que valida copy contra critérios comportamentais e éticos rigorosos.

━━━ COPY A AUDITAR ━━━
Hook: ${draft.hook_text}
Corpo: ${draft.content_text}
CTA: ${draft.cta_text}
Plataforma: ${draft.platform}

━━━ CONTEXTO ━━━
Cliente: ${clientName || 'não informado'}
Persona: ${persona.name} · ${persona.language_style || 'tom profissional'}
AMD alvo: ${behaviorIntent.amd} (micro-comportamento: ${behaviorIntent.target_behavior})
Momento de consciência: ${behaviorIntent.momento}
Gatilhos usados: ${behaviorIntent.triggers.join(', ')}
Fase da campanha: ${phaseName || 'não informada'}
${persona.forbidden_terms?.length ? `Termos proibidos: ${persona.forbidden_terms.join(', ')}` : ''}
${preflightFlags.length ? `\nAlertas de preflight (já detectados):\n${preflightFlags.map(f => `- ${f}`).join('\n')}` : ''}

━━━ CRITÉRIOS DE AUDITORIA ━━━

1. MODELO FOGG:
   - Motivação (1–10): o texto aumenta o desejo/urgência de agir? É específico e relevante para a persona?
   - Habilidade (1–10): a ação pedida no CTA é simples o suficiente para esta persona?
   - Prompt (1–10): o CTA é claro, específico e posicionado no momento certo?

2. LINGUAGEM:
   - Tom consistente com "${persona.language_style || 'profissional'}"?
   - Ausência de clichês de IA (game changer, revolucionar, jornada, etc)?
   - Ausência de promessas não fundamentadas?

3. RISCO ÉTICO:
   - Urgência extrema sem justificativa concreta?
   - Combinação medo + culpa (proibido)?
   - Promessas de resultados que o cliente não pode garantir?

━━━ OUTPUT ━━━
Retorne APENAS JSON válido, sem markdown:

{
  "approval_status": "approved|needs_revision|blocked",
  "approved_text": "Texto final aprovado (pode ser o original se ok, ou versão revisada se needs_revision)",
  "revision_notes": ["nota 1 se houver", "nota 2 se houver"],
  "fogg_score": {
    "motivation": 8,
    "ability": 9,
    "prompt": 7
  },
  "behavior_tags": {
    "stage": "${behaviorIntent.momento}",
    "model": "fogg|hook|generic",
    "triggers": ${JSON.stringify(behaviorIntent.triggers)},
    "micro_behavior": "${behaviorIntent.amd}",
    "emotional_tone": "curiosidade|autoridade|urgencia|esperanca|alerta|empatia|orgulho|confianca"
  },
  "policy_flags": []
}

Regras:
- "approved": cumpre todos os critérios, texto ok como está
- "needs_revision": há problemas menores — reescreva o approved_text corrigindo
- "blocked": violação grave (promessa falsa, medo+culpa, urgência extrema) — approved_text = original sem alteração
- revision_notes: lista de strings em português, específicas e acionáveis
- Se "approved": revision_notes = [] e approved_text = original`;

  let parsed: AuditResult | null = null;
  try {
    const result = await ClaudeService.generateCompletion({
      prompt,
      temperature: 0.2,
      maxTokens: 1000,
    });
    parsed = parseAuditFromText(result.text);
  } catch (err: any) {
    console.error('[agentAuditor] generateCompletion failed:', err?.message);
  }

  if (!parsed || !parsed.approval_status) {
    console.warn('[agentAuditor] falling back to default audit');
    return buildFallbackAudit(input, preflightFlags);
  }

  // Merge preflight flags into the AI result
  if (preflightFlags.length > 0) {
    parsed.revision_notes = [...preflightFlags, ...(parsed.revision_notes || [])];
    if (parsed.approval_status === 'approved' && preflightFlags.length > 0) {
      parsed.approval_status = 'needs_revision';
    }
  }

  return parsed;
}
