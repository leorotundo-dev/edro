/**
 * Prompt DNA — Camada Universal de Engenharia de Decisão
 *
 * Baseado no Master Blueprint: Engenharia de Decisão Digital 2026.
 * Esta camada aplica técnicas de neurociência, PNL e heurísticas mentais
 * que elevam a performance de qualquer copy gerado, independente de
 * plataforma ou cliente.
 *
 * Seções implementadas:
 *   II  — Neurociência da Atenção (Filtro do SAR)
 *   III — PNL & Psicodinâmica (VAK, Pacing & Leading)
 *   IV  — Matriz de Heurísticas e Gatilhos Mentais (seleção dinâmica por objetivo)
 *   V   — Veto de Baixa Proficiência (Negative Constraints)
 *
 * Fórmula Prompt DNA:
 *   Persona + SEO + Contexto + Gatilho (bio) + Constraint = Alta Performance
 *
 * Seleção de Gatilho Dominante por Objetivo:
 *   Venda/Conversão  → AVERSÃO À PERDA (dor da perda > prazer do ganho)
 *   Autoridade/Marca → ESPECIFICIDADE   (dados precisos anulam ceticismo)
 *   Retenção/Awareness → CURIOSIDADE   (Efeito Zeigarnik mantém atenção ativa)
 */

// ── SEÇÃO V — VETO DE BAIXA PROFICIÊNCIA (sempre aplicado) ─────────────────
const VETO_RULES: string[] = [
  'VETO DE ABERTURA CLICHÊ: NUNCA inicie com "No mundo de hoje", "Em um cenário de constantes mudanças", "Descubra como", "Em tempos como esses", "A cada dia que passa" ou variações. Comece sempre com a substância.',
  'VETO DE ADJETIVAÇÃO VAGA: Elimine "incrível", "revolucionário", "inovador", "excepcional", "transformador" sem dados. Substitua sempre por métricas, fatos ou resultados concretos.',
  'VETO DE VOZ PASSIVA: Use voz ativa e linguagem assertiva e imperativa. "A empresa entregou X" — não "X foi entregado pela empresa". Verbos de ação transmitem liderança.',
  'ESPECIFICIDADE OBRIGATÓRIA: Troque números redondos por dados precisos (exemplo: "13,4% de aumento" em vez de "13%" ou "mais de 10%"). Dados específicos ativam o córtex pré-frontal e anulam o ceticismo — a especificidade sinaliza que alguém mediu de verdade.',
  'VETO DE TEXTO EM IMAGEM: NUNCA inclua texto, subtítulos ou logotipos sobrepostos na arte/imagem. Toda informação textual vai na legenda ou no design estruturado. Texto em imagem conflita com o processamento visual e reduz a retenção.',
];

// ── SEÇÃO II — NEUROCIÊNCIA DA ATENÇÃO (Filtro do SAR) ─────────────────────
const ATTENTION_NEUROSCIENCE: string[] = [
  'PATTERN INTERRUPT (Quebra de Padrão): Inicie com asserção contraintuitiva, dado que inverte a expectativa ou afirmação que contradiz o senso comum do setor. Isso provoca pico de cortisol que força o cérebro a sair do modo automático e focar na resolução da tensão.',
  'MICRO-DOSES DE DOPAMINA: Estruture o conteúdo em "blocos de vitória" — cada parágrafo entrega uma conclusão lógica completa. Nunca deixe o leitor em suspense sem recompensa; recompense o progresso da leitura a cada bloco.',
  'LOOP DE CURIOSIDADE (Efeito Zeigarnik): Abra uma questão, tensão ou narrativa no início que só se resolve no CTA ou na conclusão. O cérebro mantém atenção ativa em problemas não fechados — o dedo não faz scroll porque a "tarefa ainda não terminou".',
];

// ── SEÇÃO III — PNL & PSICODINÂMICA ────────────────────────────────────────
const NLP_TECHNIQUES: string[] = [
  'PACING (Acompanhar — abrir receptividade): Valide 1 ou 2 dores, fatos ou realidades inegáveis do universo do leitor ANTES de qualquer solução. Quando a pessoa pensa "exatamente isso que acontece comigo", as guardas críticas caem e o estado de receptividade se abre.',
  'LEADING (Conduzir — encaminhar à solução): Após o "sim" mental do Pacing, introduza a solução como o único passo lógico e natural. A transição deve parecer inevitável — não uma venda, mas uma conclusão óbvia do raciocínio iniciado.',
  'POLISSENSORIALIDADE VAK: Alterne predicados sensoriais para atingir todos os perfis de processamento. Visual: "veja claramente", "o panorama é nítido", "a imagem que emerge". Auditivo: "sintonize a estratégia", "escute o mercado", "o sinal é claro". Cinestésico: "sinta a pressão", "mão na massa", "o peso da decisão", "toque o resultado".',
];

// ── SEÇÃO IV — GATILHOS MENTAIS (Heurísticas de Decisão) ───────────────────
// Gatilhos base (sempre disponíveis)
const TRIGGER_LOSS_AVERSION =
  'AVERSÃO À PERDA [GATILHO DOMINANTE para este objetivo]: Enquadre a solução como prevenção de uma perda iminente — tempo, dinheiro, posição competitiva, oportunidade de mercado. A dor da perda ativa o sistema límbico com intensidade 2x maior que a promessa de ganho equivalente. Formule: "Cada semana sem X custa Y" ou "O que está em risco se você não agir agora é Z".';

const TRIGGER_SPECIFICITY =
  'ESPECIFICIDADE COMO CREDENCIAL [GATILHO DOMINANTE para este objetivo]: Use dados muito precisos (ex: "34,7% de aumento na taxa de conversão em 90 dias") — números específicos constroem autoridade imediata. Combine com prova social técnica: casos reais, metodologias com nome, resultados documentados. Evite qualquer adjetivo qualitativo não ancorado em dado.';

const TRIGGER_CURIOSITY =
  'CURIOSIDADE / EFEITO ZEIGARNIK [GATILHO DOMINANTE para este objetivo]: Abra um gap de informação que não pode ser ignorado. Formule como: "O que 90% das marcas não sabem sobre X", "O erro invisível que destrói Y" ou "A variável que ninguém está monitorando e que define Z". O cérebro é biologicamente compelido a fechar loops abertos — use isso para manter retenção do início ao CTA.';

const TRIGGER_ANCHORING =
  'ANCORAGEM: Apresente primeiro o custo do problema ou um benchmark elevado antes de introduzir a solução. Isso calibra a percepção de custo-benefício e faz a oferta parecer objetivamente vantajosa por contraste.';

const TRIGGER_SOCIAL_PROOF =
  'PROVA SOCIAL (neurônios espelho): Use dados de volume real ("mais de X empresas", "Y% dos gestores", "Z cases documentados") em vez de adjetivos de liderança. Dados de movimento ativam os neurônios espelho e reduzem o medo do risco por comparação social.';

/**
 * Mapeia o task_type / objetivo para o gatilho dominante e os complementares.
 * A fórmula: Gatilho dominante + Ancoragem + Prova Social = stack persuasivo completo.
 */
function selectTriggerStack(objective?: string): string[] {
  const normalized = (objective ?? '').toLowerCase();

  // Venda / conversão / ad
  if (['ad', 'venda', 'sales', 'conversao', 'conversion', 'oferta', 'promo'].some((k) => normalized.includes(k))) {
    return [TRIGGER_LOSS_AVERSION, TRIGGER_ANCHORING, TRIGGER_SOCIAL_PROOF];
  }

  // Autoridade / thought leadership / marca / institucional
  if (['thought_leadership', 'autoridade', 'brand', 'marca', 'institucional', 'reputacao', 'reputation'].some((k) => normalized.includes(k))) {
    return [TRIGGER_SPECIFICITY, TRIGGER_SOCIAL_PROOF, TRIGGER_ANCHORING];
  }

  // Retenção / awareness / conteúdo / engajamento
  if (['awareness', 'retencao', 'retention', 'engajamento', 'engagement', 'conteudo', 'social_post', 'educativo'].some((k) => normalized.includes(k))) {
    return [TRIGGER_CURIOSITY, TRIGGER_SOCIAL_PROOF, TRIGGER_ANCHORING];
  }

  // Default: stack completo equilibrado
  return [TRIGGER_LOSS_AVERSION, TRIGGER_ANCHORING, TRIGGER_SOCIAL_PROOF, TRIGGER_CURIOSITY];
}

/**
 * Retorna o bloco de DNA de prompt para injeção universal em qualquer copy.
 *
 * @param taskType - Tipo de tarefa ou objetivo da peça (ex: 'ad', 'thought_leadership', 'social_post').
 *                   Usado para selecionar o gatilho mental dominante.
 */
export function buildPromptDNABlock(taskType?: string): string {
  const triggerStack = selectTriggerStack(taskType);

  const objectiveLabel = (() => {
    const n = (taskType ?? '').toLowerCase();
    if (['ad', 'venda', 'sales', 'conversao', 'oferta', 'promo'].some((k) => n.includes(k))) return 'Venda/Conversão → Gatilho dominante: AVERSÃO À PERDA';
    if (['thought_leadership', 'autoridade', 'brand', 'marca', 'institucional'].some((k) => n.includes(k))) return 'Autoridade/Marca → Gatilho dominante: ESPECIFICIDADE';
    if (['awareness', 'retencao', 'engajamento', 'social_post', 'educativo'].some((k) => n.includes(k))) return 'Retenção/Engajamento → Gatilho dominante: CURIOSIDADE';
    return 'Objetivo não especificado → Stack completo de gatilhos';
  })();

  const sections: string[] = [
    '═══ ENGENHARIA DE DECISÃO — APLICAR EM TODA PEÇA ═══',
    `Objetivo detectado: ${objectiveLabel}`,
    '',
    'REGRAS DE VETO (NUNCA violar):',
    ...VETO_RULES.map((r) => `• ${r}`),
    '',
    'NEUROCIÊNCIA DA ATENÇÃO (Filtro SAR):',
    ...ATTENTION_NEUROSCIENCE.map((r) => `• ${r}`),
    '',
    'PNL & PSICODINÂMICA (Pacing → Leading):',
    ...NLP_TECHNIQUES.map((r) => `• ${r}`),
    '',
    `GATILHOS MENTAIS (stack para: ${objectiveLabel}):`,
    ...triggerStack.map((r) => `• ${r}`),
  ];

  return `\n\n${sections.join('\n')}`;
}
