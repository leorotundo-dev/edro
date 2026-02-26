/**
 * Persona + AMD Prompt Blocks
 *
 * Injetados no pipeline de geração de copy para orientar a IA sobre:
 * 1. QUEM é a persona alvo e em que momento de consciência ela está
 * 2. O QUE queremos que ela faça (AMD — Ação Mínima Desejada)
 */

const MOMENTO_IMPLICATION: Record<string, string> = {
  problema:
    'Em fase de descoberta. NAO venda — eduque. A copy deve criar awareness e nomear o problema que a persona sente mas nao articula. Nao mencione a solucao antes de validar a dor.',
  solucao:
    'Avaliando opcoes. NAO explique o problema — diferencie a solucao. Responda implicitamente: por que esta solucao e nao a concorrente? Foco em diferenciais e provas concretas.',
  decisao:
    'Pronta para agir. Minimize friccao cognitiva. Copy curta, CTA direto e especifico, remova objecoes finais. Nao eduque — feche. Cada palavra sem CTA e um desperdicio.',
};

const AMD_GUIDANCE: Record<string, string> = {
  salvar:
    'AMD — SALVAR: Estruture como ferramenta de referencia (checklist, framework, tabela comparativa). Gatilhos: especificidade + valor pratico. O leitor salva o que vai usar depois — entregue algo que ele vai querer reler.',
  compartilhar:
    'AMD — COMPARTILHAR: Inclua 1 Dark Social Anchor — frase de autoridade que funciona como argumento standalone sem o contexto original do post. Gatilhos: dark social + prova social. O leitor compartilha o que o faz parecer inteligente na frente de alguem.',
  clicar:
    'AMD — CLICAR: Crie curiosity gap — informacao incompleta que so se resolve no clique. CTA acima da dobra e especifico (nao "saiba mais", mas "veja o calculo completo"). Gatilhos: aversao a perda + curiosidade.',
  responder:
    'AMD — RESPONDER: Termine com pergunta aberta sobre a experiencia pessoal do leitor, nao retorica. Gatilhos: PNL pacing + pergunta direta. "Voce ja passou por isso?" funciona. "O que voce acha?" nao funciona.',
  marcar_alguem:
    'AMD — MARCAR ALGUEM: Referencie explicitamente uma situacao que o leitor reconhece em alguem especifico da vida dele (socio, chefe, colega). "Manda isso para quem precisa ouvir" funciona melhor que qualquer CTA generico.',
  pedir_proposta:
    'AMD — PEDIR PROPOSTA: Mostre o custo do nao-agir (financeiro, competitivo ou de oportunidade). Inclua prova social de quem ja agiu. CTA especifica o proximo passo exato — sem ambiguidade, sem "entre em contato". Gatilhos: ancoragem + aversao a perda.',
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
  if (persona.demographics) lines.push(`Demografico: ${persona.demographics}`);
  if (Array.isArray(persona.pain_points) && persona.pain_points.length > 0) {
    lines.push(`Dores principais: ${persona.pain_points.slice(0, 5).join(' | ')}`);
  }
  if (implication) lines.push(`Implicacao estrategica: ${implication}`);

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
  if (intent.amd) lines.push(`Acao minima desejada: ${intent.amd}`);
  if (intent.momento) lines.push(`Momento de consciencia: ${intent.momento}`);
  if (intent.triggers?.length) {
    lines.push(`Gatilhos estrategicos: ${intent.triggers.join(', ')}`);
  }
  if (intent.target_behavior) {
    lines.push(`Comportamento-alvo: ${intent.target_behavior}`);
  }
  lines.push('INSTRUCAO: Esta peca esta dentro de uma campanha planejada. Respeite os gatilhos estrategicos definidos acima. O comportamento-alvo e o criterio de sucesso desta peca — nao o engajamento generico.');
  return `\n\n${lines.join('\n')}`;
}
