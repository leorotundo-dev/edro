/**
 * Prompt DNA — Camada Universal de Engenharia de Persuasão e Biologia Algorítmica
 *
 * Baseado no Master Blueprint: Tratado de Engenharia de Decisão Digital 2026.
 *
 * Fórmula de Ouro:
 *   Atenção (Pattern Interrupt)
 *   + Retenção (Dopamina / White Space / Chunking)
 *   + Autoridade (Especificidade / Pratfall Effect)
 *   + Viralidade (Printability / Dark Social)
 *   = Resultado
 *
 * Seções implementadas:
 *   I    — O Terceiro Tom (Fluidez Nativa + Vulnerabilidade Controlada)
 *   II   — Neurociência da Atenção (Filtro do SAR)
 *   III  — PNL & Psicodinâmica (VAK, Pacing & Leading)
 *   IV   — Teoria da Carga Cognitiva (Chunking + Primazia/Recência)
 *   V    — Gatilhos Mentais (seleção dinâmica por objetivo)
 *   VI   — Dark Social Optimization (Printability)
 *   VII  — Bio-Sincronia (Timing Hormonal)
 *   VIII — Veto de Baixa Proficiência (Negative Constraints)
 */

// ── SEÇÃO VIII — VETO DE BAIXA PROFICIÊNCIA (sempre aplicado — muletas de IA genérica) ─────
const VETO_RULES: string[] = [
  'VETO DE ABERTURA CLICHÊ: NUNCA inicie com "No mundo de hoje", "Em um cenário de constantes mudanças", "Descubra como", "Em tempos como esses", "A cada dia que passa" ou variações. Comece sempre com a substância.',
  'VETO DE ADJETIVOS QUALITATIVOS VAZIOS: Elimine "incrível", "revolucionário", "inovador", "excepcional", "transformador", "eficiente", "ágil", "melhor" sem dados. Se você precisa dizer que é bom, não provou. Substitua sempre por evidências numéricas, fatos ou resultados concretos.',
  'VETO DE VOZ PASSIVA: Use voz ativa e linguagem assertiva e imperativa. "A empresa entregou X" — não "X foi entregado pela empresa". Voz ativa transmite liderança.',
  'VETO DE CONCLUSÕES ÓBVIAS: NUNCA use "Concluindo...", "Em resumo...", "Portanto...", "Como pudemos ver..." — o cérebro para de ler quando percebe que a novidade acabou. A conclusão deve ser um novo insight, não uma recapitulação.',
  'ESPECIFICIDADE OBRIGATÓRIA: Troque números redondos por dados precisos (exemplo: "13,4% de aumento" em vez de "13%" ou "mais de 10%"). Dados específicos ativam o córtex pré-frontal e anulam o ceticismo — especificidade sinaliza que alguém mediu de verdade.',
  'VETO DE TEXTO EM IMAGEM: NUNCA inclua texto, subtítulos ou logotipos sobrepostos na arte/imagem. Toda informação textual vai na legenda ou no design estruturado. Texto em imagem conflita com o processamento visual e reduz retenção (ruído no SAR).',
  'VETO DE INVENÇÃO FACTUAL — DATAS E CONTEXTOS REAIS: NUNCA invente datas de eventos, datas comemorativas, deadlines ou anos ("Dia das Mães é em X de maio", "lançado em 2023", "desde 1987"). Use apenas datas presentes explicitamente no briefing, no perfil do cliente ou no contexto do calendário fornecido. Se a data não está no contexto, escreva de forma genérica ou omita.',
  'VETO DE ESTATÍSTICAS E PESQUISAS INVENTADAS: NUNCA fabrique percentuais, estatísticas, números de pesquisa ou estudos ("53% dos consumidores", "segundo estudo da Universidade X", "pesquisa revela que..."). Use apenas dados fornecidos explicitamente no contexto. Se não houver dado real disponível, construa autoridade com especificidade narrativa (caso real, resultado do cliente, observação de mercado) — nunca com número inventado.',
];

// ── SEÇÃO I — O TERCEIRO TOM (Fluidez Nativa) ──────────────────────────────
// Nem "Corporativo Rígido" nem "Informal Forçado" — a voz de um especialista
// conversando com um par. O Terceiro Tom é o que separa conteúdo de elite do
// conteúdo de IA genérica.
const TERCEIRO_TOM: string[] = [
  'TERCEIRO TOM (Fluidez Nativa): Escreva como um especialista humano conversando com um par — nem corporativo rígido nem informal forçado. O leitor deve sentir que está recebendo uma perspectiva pessoal qualificada, não um comunicado de empresa.',
  'VULNERABILIDADE CONTROLADA (Pratfall Effect): O cérebro desconfia da perfeição absoluta. Quando pertinente à narrativa, insira um "aprendizado difícil", um "erro de processo" ou um "desafio técnico" que a marca superou. Marcas que admitem desafios reais geram 2.4x mais confiança do que as que pregam sucesso absoluto.',
  'ESPELHAMENTO LINGUÍSTICO (Mirroring): Mimetize não apenas as palavras, mas a SINTAXE e o RITMO do público-alvo do cliente. Se o nicho usa construções informais diretas ("sabe quando você..."), use essa estrutura. Se usam linguagem técnica, espelhe a terminologia. O leitor deve sentir "ele é um de nós".',
];

// ── SEÇÃO II — NEUROCIÊNCIA DA ATENÇÃO (Filtro do SAR) ─────────────────────
const ATTENTION_NEUROSCIENCE: string[] = [
  'PATTERN INTERRUPT (Quebra de Padrão): Inicie com asserção contraintuitiva, dado que inverte a expectativa ou afirmação que contradiz o senso comum do setor. Isso provoca pico de cortisol que força o cérebro a sair do modo automático e focar na resolução da tensão.',
  'MICRO-DOSES DE DOPAMINA: Estruture o conteúdo em "blocos de vitória" — cada parágrafo entrega uma conclusão lógica completa. Nunca deixe o leitor no vazio; recompense o progresso da leitura a cada bloco.',
  'LOOP DE CURIOSIDADE (Efeito Zeigarnik): Abra uma questão, tensão ou narrativa no início que só se resolve no CTA ou na conclusão. O cérebro mantém atenção ativa em problemas não fechados — o dedo não faz scroll porque a "tarefa ainda não terminou".',
];

// ── SEÇÃO III — PNL & PSICODINÂMICA ────────────────────────────────────────
const NLP_TECHNIQUES: string[] = [
  'PACING (Acompanhar — abrir receptividade): Valide 1 ou 2 dores, fatos ou realidades inegáveis do universo do leitor ANTES de qualquer solução. Quando a pessoa pensa "exatamente isso que acontece comigo", as guardas críticas caem.',
  'LEADING (Conduzir — encaminhar à solução): Após o "sim" mental do Pacing, introduza a solução como o único passo lógico e natural. A transição deve parecer inevitável — não uma venda, mas uma conclusão óbvia do raciocínio iniciado.',
  'POLISSENSORIALIDADE VAK: Alterne predicados sensoriais para atingir todos os perfis de processamento. Visual: "veja claramente", "o panorama é nítido", "a imagem que emerge". Auditivo: "sintonize a estratégia", "escute o mercado", "o sinal é claro". Cinestésico: "sinta a pressão", "mão na massa", "o peso da decisão".',
];

// ── SEÇÃO IV — TEORIA DA CARGA COGNITIVA (RAM Cerebral) ────────────────────
// O cérebro tem capacidade de processamento limitada para novidades.
// Conteúdo que exige muito esforço é abandonado.
const COGNITIVE_LOAD: string[] = [
  'CHUNKING ESTRATÉGICO: Nunca entregue uma ideia complexa de uma vez. Quebre a tese central em "pedaços" que o cérebro consiga processar em menos de 5 segundos cada — um parágrafo = uma ideia completa. Separe cada chunk com linha em branco (white space) para deixar o cérebro "respirar".',
  'EFEITO DE PRIMAZIA E RECÊNCIA: As pessoas lembram apenas do primeiro e do último ponto. Coloque o dado de MAIOR IMPACTO no topo (primazia — quando o foco está 100%) e a CTA no rodapé (recência — última memória ativa). O "meio" é o espaço do suporte técnico e evidências que sustentam a autoridade.',
  'WHITE SPACE COMO FERRAMENTA: Parágrafos de no máximo 3 linhas. O espaço em branco entre blocos não é falta de conteúdo — é a "respiração" que permite ao cérebro consolidar o que acabou de ler antes de processar o próximo bloco.',
];

// ── SEÇÃO VI — DARK SOCIAL OPTIMIZATION (O Alcance Invisível) ─────────────
// 70% da conversão real acontece em canais privados (WhatsApp, DMs, Slack).
// O conteúdo deve ser engenheirado para ser encaminhado, não apenas curtido.
const DARK_SOCIAL: string[] = [
  'ENGENHARIA DE PRINTABILITY: O conteúdo deve ser designado para ser printado ou encaminhado. Isso significa: (a) tabelas comparativas prontas para screenshot, (b) checklists de "dor de cabeça" que o usuário pode enviar ao seu sócio ou chefe, (c) frases de autoridade formatadas como argumento autônomo que funciona sem o contexto original do post.',
  'CONTEÚDO COMO FERRAMENTA: O post não é uma leitura — é uma FERRAMENTA que o leitor usa. Formule como: "Use estes 3 critérios para avaliar X", "Checklist para auditar Y", "Tabela: custo de fazer vs custo de não fazer Z". Ferramentas são encaminhadas; textos inspiracionais são esquecidos.',
  'DARK SOCIAL ANCHOR: Inclua pelo menos um elemento no conteúdo projetado especificamente para ser enviado em conversa privada — uma frase de impacto que funciona como argumento de autoridade autônomo, ou uma tabela/dado que resolve uma dúvida comum de tomada de decisão.',
];

// ── SEÇÃO VII — BIO-SINCRONIA (Timing Hormonal) ────────────────────────────
// O estado de atenção do público varia ao longo do dia conforme o perfil
// hormonal dominante. O conteúdo deve ser calibrado para a janela certa.
const BIO_SINCRONIA: string[] = [
  'JANELA ANALÍTICA — MANHÃ (Cortisol dominante): Para conteúdos programados para manhã/início do dia, priorize dados de mercado, alertas de risco, análises densas e frameworks de resolução de problemas. O cérebro está em modo "resolução de problemas" — receptivo a inteligência técnica e dados que justificam decisões.',
  'JANELA DE CONEXÃO — TARDE (Oxitocina dominante): Para conteúdos do período da tarde, priorize histórias de pessoas, bastidores da operação, cases de sucesso humanizados e validação social. O foco hormonal é relacionamento e pertencimento — conteúdo emocional e narrativo performa melhor.',
  'JANELA DE ENTRETENIMENTO — NOITE (Dopamina dominante): Para conteúdos noturnos ou de fim de semana, priorize vídeos curtos, ganchos emocionais, visual storytelling e humor contextual. O estado é de baixa barreira de atenção — conteúdo deve ser imediato, sensorial e recompensador.',
];

// ── SEÇÃO V — GATILHOS MENTAIS (Heurísticas de Decisão — seleção dinâmica) ──
const TRIGGER_LOSS_AVERSION =
  'AVERSÃO À PERDA [GATILHO DOMINANTE para este objetivo]: Enquadre a solução como prevenção de uma perda iminente — tempo, dinheiro, posição competitiva, oportunidade de mercado. A dor da perda ativa o sistema límbico com intensidade 2x maior que a promessa de ganho equivalente. Formule: "Cada semana sem X custa Y" ou "O que está em risco se você não agir agora é Z".';

const TRIGGER_SPECIFICITY =
  'ESPECIFICIDADE COMO CREDENCIAL [GATILHO DOMINANTE para este objetivo]: Use dados muito precisos (ex: "34,7% de aumento na taxa de conversão em 90 dias") — números específicos constroem autoridade imediata. Combine com prova social técnica: cases reais, metodologias com nome, resultados documentados. Evite qualquer adjetivo qualitativo não ancorado em dado.';

const TRIGGER_CURIOSITY =
  'CURIOSIDADE / EFEITO ZEIGARNIK [GATILHO DOMINANTE para este objetivo]: Abra um gap de informação que não pode ser ignorado. Formule como: "O que 90% das marcas não sabem sobre X", "O erro invisível que destrói Y" ou "A variável que ninguém está monitorando e que define Z". O cérebro é biologicamente compelido a fechar loops abertos — use isso para manter retenção do início ao CTA.';

const TRIGGER_ANCHORING =
  'ANCORAGEM: Apresente primeiro o custo do problema ou um benchmark elevado antes de introduzir a solução. Isso calibra a percepção de custo-benefício e faz a oferta parecer objetivamente vantajosa por contraste.';

const TRIGGER_SOCIAL_PROOF =
  'PROVA SOCIAL (neurônios espelho): Use dados de volume real ("mais de X empresas", "Y% dos gestores", "Z cases documentados") em vez de adjetivos de liderança. Dados de movimento ativam os neurônios espelho e reduzem o medo do risco por comparação social.';

/**
 * Mapeia AMD para task_type equivalente para override de trigger selection.
 */
function resolveTaskTypeFromAMD(amd: string): string | null {
  const map: Record<string, string> = {
    salvar:         'autoridade',
    compartilhar:   'awareness',
    clicar:         'venda',
    responder:      'engagement',
    marcar_alguem:  'awareness',
    pedir_proposta: 'venda',
  };
  return map[amd] ?? null;
}

/**
 * Mapeia o task_type / objetivo para o gatilho dominante e os complementares.
 */
function selectTriggerStack(objective?: string): string[] {
  const normalized = (objective ?? '').toLowerCase();

  if (['ad', 'venda', 'sales', 'conversao', 'conversion', 'oferta', 'promo'].some((k) => normalized.includes(k))) {
    return [TRIGGER_LOSS_AVERSION, TRIGGER_ANCHORING, TRIGGER_SOCIAL_PROOF];
  }
  if (['thought_leadership', 'autoridade', 'brand', 'marca', 'institucional', 'reputacao', 'reputation'].some((k) => normalized.includes(k))) {
    return [TRIGGER_SPECIFICITY, TRIGGER_SOCIAL_PROOF, TRIGGER_ANCHORING];
  }
  if (['awareness', 'retencao', 'retention', 'engajamento', 'engagement', 'conteudo', 'social_post', 'educativo'].some((k) => normalized.includes(k))) {
    return [TRIGGER_CURIOSITY, TRIGGER_SOCIAL_PROOF, TRIGGER_ANCHORING];
  }
  // Default: stack completo equilibrado
  return [TRIGGER_LOSS_AVERSION, TRIGGER_ANCHORING, TRIGGER_SOCIAL_PROOF, TRIGGER_CURIOSITY];
}

function resolveObjectiveLabel(taskType?: string): string {
  const n = (taskType ?? '').toLowerCase();
  if (['ad', 'venda', 'sales', 'conversao', 'oferta', 'promo'].some((k) => n.includes(k)))
    return 'Venda/Conversão → Gatilho dominante: AVERSÃO À PERDA';
  if (['thought_leadership', 'autoridade', 'brand', 'marca', 'institucional'].some((k) => n.includes(k)))
    return 'Autoridade/Marca → Gatilho dominante: ESPECIFICIDADE';
  if (['awareness', 'retencao', 'engajamento', 'social_post', 'educativo'].some((k) => n.includes(k)))
    return 'Retenção/Engajamento → Gatilho dominante: CURIOSIDADE';
  return 'Objetivo não especificado → Stack completo de gatilhos';
}

/**
 * Retorna o bloco de DNA de prompt para injeção universal em qualquer copy.
 * Inclui: Terceiro Tom, Veto rules, Neurociência, PNL, Carga Cognitiva,
 * Dark Social, Bio-Sincronia e stack de gatilhos selecionado por objetivo.
 *
 * @param taskType    - Tipo de tarefa ou objetivo ('ad', 'thought_leadership', 'social_post', etc.)
 * @param amdOverride - AMD da peça (ex: 'salvar', 'clicar') — quando presente, sobrepõe taskType no stack de gatilhos
 */
export function buildPromptDNABlock(taskType?: string, amdOverride?: string | null): string {
  const effectiveObjective = (amdOverride ? resolveTaskTypeFromAMD(amdOverride) : null) ?? taskType;
  const triggerStack = selectTriggerStack(effectiveObjective);
  const objectiveLabel = resolveObjectiveLabel(effectiveObjective);

  const sections: string[] = [
    '═══ ENGENHARIA DE PERSUASÃO E BIOLOGIA ALGORÍTMICA 2026 — APLICAR EM TODA PEÇA ═══',
    `Fórmula: Atenção (Pattern Interrupt) + Retenção (Dopamina/Chunking) + Autoridade (Especificidade/Pratfall) + Viralidade (Printability) = Resultado`,
    `Objetivo detectado: ${objectiveLabel}`,
    '',
    '— REGRAS DE VETO (NUNCA violar — muletas de IA genérica):',
    ...VETO_RULES.map((r) => `• ${r}`),
    '',
    '— O TERCEIRO TOM (voz de especialista para par — não corporativo, não forçado):',
    ...TERCEIRO_TOM.map((r) => `• ${r}`),
    '',
    '— NEUROCIÊNCIA DA ATENÇÃO (vencer o Filtro SAR):',
    ...ATTENTION_NEUROSCIENCE.map((r) => `• ${r}`),
    '',
    '— PNL & PSICODINÂMICA (Pacing → Leading):',
    ...NLP_TECHNIQUES.map((r) => `• ${r}`),
    '',
    '— TEORIA DA CARGA COGNITIVA (RAM Cerebral — facilitar processamento):',
    ...COGNITIVE_LOAD.map((r) => `• ${r}`),
    '',
    '— DARK SOCIAL OPTIMIZATION (projetar para ser encaminhado):',
    ...DARK_SOCIAL.map((r) => `• ${r}`),
    '',
    '— BIO-SINCRONIA (calibrar tom ao estado hormonal do público):',
    ...BIO_SINCRONIA.map((r) => `• ${r}`),
    '',
    `— GATILHOS MENTAIS (stack para objetivo: ${objectiveLabel}):`,
    ...triggerStack.map((r) => `• ${r}`),
  ];

  return `\n\n${sections.join('\n')}`;
}
