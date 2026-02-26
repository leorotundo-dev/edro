import * as ClaudeService from './claudeService';

// ── Types ─────────────────────────────────────────────────────────────────

export type PersonaContext = {
  name: string;
  role?: string;
  momento_consciencia?: string; // problema | solucao | decisao
  language_style?: string;
  forbidden_terms?: string[];
  preferred_evidence?: string[];
  pain_points?: string[];
  objection_patterns?: string[];
};

export type BehaviorIntentContext = {
  amd: string;         // salvar | compartilhar | clicar | responder | marcar_alguem | pedir_proposta
  momento: string;     // problema | solucao | decisao
  triggers: string[];
  target_behavior: string;
  phase_id?: string;   // historia | prova | convite
};

export type WriterInput = {
  platform: string;      // linkedin, instagram, etc.
  format?: string;       // ex: Carrossel, Post, Story
  persona: PersonaContext;
  behaviorIntent: BehaviorIntentContext;
  campaignObjective?: string;
  clientName?: string;
  clientSegment?: string;
  knowledgeBlock?: string; // DNA do cliente, exemplos de copy, pilares
};

export type DraftContent = {
  hook_text: string;
  content_text: string;
  cta_text: string;
  media_type: 'image' | 'video' | 'carousel' | 'text_only';
  platform: string;
  behavioral_rationale: string; // por que essa copy deve funcionar
  tags: string[];
};

// ── Helpers ───────────────────────────────────────────────────────────────

const PLATFORM_RULES: Record<string, string> = {
  linkedin: '3–5 linhas antes do "Ver mais", autoridade, dados, white space, bullets, tom formal/profissional',
  instagram: 'Hook forte na primeira linha, parágrafos curtos, emojis moderados, palavras-chave para Social Search',
  instagram_story: 'Muito curto (máx 3 linhas), tom casual, CTA direto',
  tiktok: 'Hook em 1–1,5s, payoff em 3–5s, CTA leve, tom jovem e autêntico',
  reels: 'Hook visual + verbal, desenvolvimento em 15–25s, CTA claro',
  twitter: 'Máx 280 caracteres, punch direto, sem floreios',
  email: 'Assunto claro, primeiro parágrafo com valor, CTA único e específico',
};

function getPlatformRules(platform: string): string {
  const key = platform.toLowerCase().replace(/\s+/g, '_');
  return PLATFORM_RULES[key] || `Adaptar ao canal ${platform}: tom adequado, estrutura clara, CTA específico`;
}

const AMD_INSTRUCTIONS: Record<string, string> = {
  salvar: 'O texto deve ter VALOR DE REFERÊNCIA — algo que a pessoa vai querer guardar para reler. Use dados específicos, frameworks, checklists ou insights contraintuitivos.',
  compartilhar: 'O texto deve ter VALOR SOCIAL — algo que posiciona quem compartilha como alguém com bom gosto ou conhecimento. Use insights surpreendentes ou perspectivas únicas.',
  clicar: 'O texto deve criar CURIOSIDADE ESPECÍFICA — revelar parcialmente algo valioso, com CTA claro para ver mais. Não entregar tudo no post.',
  responder: 'O texto deve fazer uma PERGUNTA REAL ou levantar um ponto polêmico que convide resposta. Termine sempre com uma pergunta ou provocação.',
  marcar_alguem: 'O texto deve ser imediatamente IDENTIFICÁVEL com alguém específico. Use "manda para alguém que..." ou situações muito específicas que lembrem pessoas reais.',
  pedir_proposta: 'O texto deve mostrar COMPETÊNCIA ESPECÍFICA e dor clara, com CTA natural para contato. Sem pressão excessiva — autoridade que vende.',
};

const MOMENTO_CONTEXT: Record<string, string> = {
  problema: 'A audiência AINDA NÃO SABE que tem esse problema ou está negando. Aborde sem julgamento, com empatia e especificidade.',
  solucao: 'A audiência CONHECE o problema e busca solução. Posicione claramente o diferencial, use provas e dados.',
  decisao: 'A audiência está PRESTES A DECIDIR entre opções. Elimine objeções finais, use casos de sucesso, crie urgência genuína.',
};

function parseJsonFromText(text: string): DraftContent | null {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1)) as DraftContent;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function buildFallbackDraft(input: WriterInput): DraftContent {
  const amdInstruction = AMD_INSTRUCTIONS[input.behaviorIntent.amd] || '';
  return {
    hook_text: `[Atenção, ${input.persona.name}] Um dado que poucos sabem sobre ${input.campaignObjective || input.clientSegment || 'seu setor'}.`,
    content_text: `A realidade é que ${input.behaviorIntent.target_behavior.toLowerCase() || 'a mudança começa com consciência'}.\n\n${amdInstruction.slice(0, 120)}`,
    cta_text: input.behaviorIntent.amd === 'clicar' ? 'Leia mais no link da bio' :
              input.behaviorIntent.amd === 'pedir_proposta' ? 'Entre em contato para uma conversa rápida' :
              'Salve para reler depois',
    media_type: 'image',
    platform: input.platform,
    behavioral_rationale: `Rascunho de fallback gerado para AMD "${input.behaviorIntent.amd}" no momento "${input.behaviorIntent.momento}".`,
    tags: input.behaviorIntent.triggers,
  };
}

// ── Main export ───────────────────────────────────────────────────────────

/**
 * AgentWriter — Gera DraftContent estruturado a partir de um BehaviorIntent.
 *
 * Diferente do pipeline genérico (collaborative/standard), o AgentWriter:
 * - Usa o AMD (micro-comportamento alvo) para instruir a estrutura da copy
 * - Usa o momento de consciência da persona para calibrar o ponto de entrada
 * - Usa os gatilhos psicológicos definidos no BehaviorIntent
 * - Retorna copy estruturada: hook, corpo, CTA separados
 */
export async function generateBehavioralDraft(input: WriterInput): Promise<DraftContent> {
  const {
    platform, format, persona, behaviorIntent,
    campaignObjective, clientName, clientSegment, knowledgeBlock,
  } = input;

  const platformRules = getPlatformRules(platform);
  const amdInstruction = AMD_INSTRUCTIONS[behaviorIntent.amd] || '';
  const momentoCtx = MOMENTO_CONTEXT[behaviorIntent.momento] || '';
  const forbiddenBlock = persona.forbidden_terms?.length
    ? `\nTermos PROIBIDOS: ${persona.forbidden_terms.join(', ')}`
    : '';
  const evidenceBlock = persona.preferred_evidence?.length
    ? `\nEvidências preferidas por esta persona: ${persona.preferred_evidence.join(', ')}`
    : '';
  const knowledgeSection = knowledgeBlock
    ? `\n\nCONHECIMENTO DO CLIENTE:\n${knowledgeBlock.slice(0, 1200)}`
    : '';

  const prompt = `Você é o AgentWriter da Edro Digital — um redator comportamental especializado.
Sua missão: criar copy que muda COMPORTAMENTOS, não apenas informa.

━━━ CONTEXTO ━━━
Cliente: ${clientName || 'não informado'}
Segmento: ${clientSegment || 'não informado'}
Objetivo da campanha: ${campaignObjective || 'não informado'}

━━━ PERSONA ALVO ━━━
Nome/Label: ${persona.name}
Papel: ${persona.role || 'não informado'}
Tom de linguagem: ${persona.language_style || 'profissional'}
Dores: ${persona.pain_points?.join('; ') || 'não informadas'}
Objeções comuns: ${persona.objection_patterns?.join('; ') || 'não informadas'}${forbiddenBlock}${evidenceBlock}

━━━ INTENÇÃO COMPORTAMENTAL ━━━
AMD (micro-comportamento alvo): ${behaviorIntent.amd}
Instrução AMD: ${amdInstruction}
Momento de consciência: ${behaviorIntent.momento}
Contexto do momento: ${momentoCtx}
Gatilhos psicológicos a usar: ${behaviorIntent.triggers.join(', ')}
Comportamento esperado após ver a peça: "${behaviorIntent.target_behavior}"

━━━ PLATAFORMA ━━━
Canal: ${platform}${format ? ` · Formato: ${format}` : ''}
Regras: ${platformRules}
${knowledgeSection}
━━━ TAREFA ━━━
Gere uma copy completa. Retorne APENAS JSON válido, sem markdown:

{
  "hook_text": "Primeira frase/linha de impacto — para parar o scroll. Máx 15 palavras.",
  "content_text": "Corpo do conteúdo. Respeite as regras da plataforma. Use os gatilhos indicados. Estrutura: hook → desenvolvimento → CTA.",
  "cta_text": "Call to action específico e acionável. 1 frase.",
  "media_type": "image|video|carousel|text_only",
  "behavioral_rationale": "Por que esta copy deve funcionar para este AMD e momento. 1–2 frases técnicas.",
  "tags": ["topico1", "topico2"]
}

Regras críticas:
- NÃO use termos proibidos da persona
- NÃO use clichês de IA: "mergulhe fundo", "game changer", "revolucionar", "paradigma", "sinergias"
- O hook deve ser específico, não genérico
- O AMD "${behaviorIntent.amd}" deve ser alcançável — não force
- A copy deve soar humana, não robótica`;

  let parsed: DraftContent | null = null;
  try {
    const result = await ClaudeService.generateCompletion({
      prompt,
      temperature: 0.65,
      maxTokens: 1200,
    });
    parsed = parseJsonFromText(result.text);
  } catch (err: any) {
    console.error('[agentWriter] generateCompletion failed:', err?.message);
  }

  if (!parsed || !parsed.hook_text || !parsed.content_text) {
    console.warn('[agentWriter] falling back to default draft');
    return buildFallbackDraft(input);
  }

  return {
    ...parsed,
    platform,
  };
}
