/**
 * Persona + AMD Prompt Blocks
 *
 * Injetados no pipeline de geração de copy para orientar a IA sobre:
 * 1. QUEM é a persona alvo e em que momento de consciência ela está
 * 2. O QUE queremos que ela faça (AMD — Ação Mínima Desejada)
 */

const MOMENTO_IMPLICATION: Record<string, string> = {
  problema:
    'Em fase de descoberta. NÃO venda — eduque. A copy deve criar awareness e nomear o problema que a persona sente mas não articula. Não mencione a solução antes de validar a dor.',
  solucao:
    'Avaliando opções. NÃO explique o problema — diferencie a solução. Responda implicitamente: por que esta solução e não a concorrente? Foco em diferenciais e provas concretas.',
  decisao:
    'Pronta para agir. Minimize fricção cognitiva. Copy curta, CTA direto e específico, remova objeções finais. Não eduque — feche. Cada palavra sem CTA é um desperdício.',
};

const AMD_GUIDANCE: Record<string, string> = {
  salvar:
    'AMD — SALVAR: Estruture como ferramenta de referência (checklist, framework, tabela comparativa). Gatilhos: especificidade + valor prático. O leitor salva o que vai usar depois — entregue algo que ele vai querer reler.',
  compartilhar:
    'AMD — COMPARTILHAR: Inclua 1 Dark Social Anchor — frase de autoridade que funciona como argumento standalone sem o contexto original do post. Gatilhos: dark social + prova social. O leitor compartilha o que o faz parecer inteligente na frente de alguém.',
  clicar:
    'AMD — CLICAR: Crie curiosity gap — informação incompleta que só se resolve no clique. CTA acima da dobra e específico (não "saiba mais", mas "veja o cálculo completo"). Gatilhos: aversão a perda + curiosidade.',
  responder:
    'AMD — RESPONDER: Termine com pergunta aberta sobre a experiência pessoal do leitor, não retórica. Gatilhos: PNL pacing + pergunta direta. "Você já passou por isso?" funciona. "O que você acha?" não funciona.',
  marcar_alguem:
    'AMD — MARCAR ALGUÉM: Referencie explicitamente uma situação que o leitor reconhece em alguém específico da vida dele (sócio, chefe, colega). "Manda isso para quem precisa ouvir" funciona melhor que qualquer CTA genérico.',
  pedir_proposta:
    'AMD — PEDIR PROPOSTA: Mostre o custo do não-agir (financeiro, competitivo ou de oportunidade). Inclua prova social de quem já agiu. CTA especifica o próximo passo exato — sem ambiguidade, sem "entre em contato". Gatilhos: ancoragem + aversão a perda.',
};

type PersonaShape = {
  id?: string;
  name: string;
  description: string;
  momento?: string;
  demographics?: string;
  pain_points?: string[];
};

/**
 * Constrói o bloco de persona para injeção no prompt.
 * Retorna string vazia se persona for null.
 */
export function buildPersonaBlock(persona: PersonaShape | null, momento: string | null): string {
  if (!persona) return '';
  const resolvedMomento = momento || persona.momento || '';
  const implication = MOMENTO_IMPLICATION[resolvedMomento] || '';

  const lines: string[] = [
    `PERSONA ALVO: ${persona.name}`,
    persona.description,
  ];
  if (persona.demographics) lines.push(`Demográfico: ${persona.demographics}`);
  if (Array.isArray(persona.pain_points) && persona.pain_points.length > 0) {
    lines.push(`Dores principais: ${persona.pain_points.slice(0, 5).join(' | ')}`);
  }
  if (implication) lines.push(`Implicação estratégica: ${implication}`);

  return `\n\nContexto de persona:\n${lines.join('\n')}`;
}

/**
 * Constrói o bloco de AMD para injeção no prompt.
 * Retorna string vazia se amd for null ou desconhecido.
 */
export function buildAMDBlock(amd: string | null, _momento: string | null): string {
  if (!amd) return '';
  const guidance = AMD_GUIDANCE[amd];
  if (!guidance) return '';
  return `\n\n${guidance}`;
}

type BehaviorIntentShape = {
  phase_name?: string;
  phase_objective?: string;
  audience_persona_name?: string;
  amd?: string;
  momento?: string;
  triggers?: string[];
  target_behavior?: string;
};

/**
 * Constrói o bloco de intenção comportamental da campanha.
 * Injeta o contexto estratégico (fase, público, gatilhos, comportamento-alvo)
 * para que a IA saiba qual resultado comportamental esta peça está servindo.
 * Retorna string vazia se intent for null.
 */
export function buildBehaviorIntentBlock(intent: BehaviorIntentShape | null): string {
  if (!intent) return '';
  const lines: string[] = ['INTENÇÃO COMPORTAMENTAL DA CAMPANHA:'];
  if (intent.phase_name) {
    lines.push(`Fase: ${intent.phase_name}${intent.phase_objective ? ` — ${intent.phase_objective}` : ''}`);
  }
  if (intent.audience_persona_name) {
    lines.push(`Público estratégico: ${intent.audience_persona_name}`);
  }
  if (intent.amd) lines.push(`Ação mínima desejada: ${intent.amd}`);
  if (intent.momento) lines.push(`Momento de consciência: ${intent.momento}`);
  if (intent.triggers?.length) {
    lines.push(`Gatilhos estratégicos: ${intent.triggers.join(', ')}`);
  }
  if (intent.target_behavior) {
    lines.push(`Comportamento-alvo: ${intent.target_behavior}`);
  }
  lines.push('INSTRUÇÃO: Esta peça está dentro de uma campanha planejada. Respeite os gatilhos estratégicos definidos acima. O comportamento-alvo é o critério de sucesso desta peça — não o engajamento genérico.');
  return `\n\n${lines.join('\n')}`;
}
