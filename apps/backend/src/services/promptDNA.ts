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
 *   IV  — Matriz de Heurísticas e Gatilhos Mentais
 *   V   — Veto de Baixa Proficiência (Negative Constraints)
 *
 * Fórmula Prompt DNA:
 *   Persona (Setorial) + Contexto (SEO) + Constraint (Regras) + Gatilho (Bio) = Performance
 */

// ── SEÇÃO V — VETO DE BAIXA PROFICIÊNCIA (sempre aplicado) ─────────────────
// Regras de ouro que NUNCA devem ser violadas.
const VETO_RULES: string[] = [
  'VETO DE ABERTURA CLICHÊ: NUNCA inicie com "No mundo de hoje", "Em um cenário de constantes mudanças", "Descubra como", "Em tempos como esses", "A cada dia que passa" ou variações. Comece sempre com a substância.',
  'VETO DE ADJETIVAÇÃO VAGA: Elimine "incrível", "revolucionário", "inovador", "excepcional", "transformador" sem dados. Substitua sempre por métricas, fatos ou resultados concretos.',
  'VETO DE VOZ PASSIVA: Use voz ativa e linguagem assertiva. "A empresa entregou X" — não "X foi entregado pela empresa". Voz ativa transmite liderança e segurança.',
  'ESPECIFICIDADE OBRIGATÓRIA: Troque números redondos por dados precisos quando houver números (exemplo: "13,4% de aumento" em vez de "13% de aumento" ou "mais de 10%"). Dados específicos ativam o córtex pré-frontal e anulam o ceticismo do leitor.',
  'VETO DE TEXTO EM IMAGEM: NUNCA inclua texto, subtítulos ou logotipos sobrepostos dentro da arte/imagem — toda informação textual vai na legenda ou no design estruturado. Texto em imagem conflita com o processamento visual e reduz retenção.',
];

// ── SEÇÃO II — NEUROCIÊNCIA DA ATENÇÃO (Filtro do SAR) ─────────────────────
// Técnicas para vencer o Sistema Ativador Reticular (porteiro do cérebro)
// e garantir que a mensagem seja de fato processada.
const ATTENTION_NEUROSCIENCE: string[] = [
  'PATTERN INTERRUPT (Quebra de Padrão): Inicie com uma asserção contraintuitiva, dado surpreendente ou afirmação que contradiz o senso comum do setor. Isso provoca um pico de cortisol que força o cérebro a sair do modo automático e focar.',
  'MICRO-DOSES DE DOPAMINA: Estruture o conteúdo em "blocos de vitória" — cada parágrafo deve entregar uma conclusão lógica completa, uma pequena recompensa de insight. Não deixe o leitor no vazio; recompense o progresso da leitura.',
  'LOOP DE CURIOSIDADE (Efeito Zeigarnik): Abra uma questão, tensão ou narrativa no início do conteúdo que só será resolvida no CTA ou na conclusão. O cérebro mantém atenção ativa em problemas não fechados.',
];

// ── SEÇÃO III — PNL & PSICODINÂMICA ────────────────────────────────────────
// Programação Neurolinguística aplicada à construção de conexão e confiança.
const NLP_TECHNIQUES: string[] = [
  'PACING (Acompanhar — baixar as guardas): Valide 1 ou 2 dores, fatos ou realidades inegáveis do universo do leitor antes de qualquer solução. Quando a pessoa pensa "exatamente isso que acontece comigo", o estado de receptividade abre.',
  'LEADING (Conduzir — encaminhar à solução): Após o "sim" mental estabelecido no Pacing, introduza a solução como o único passo lógico e natural. A transição deve parecer inevitável, não uma venda.',
  'POLISSENSORIALIDADE VAK: Varie os predicados sensoriais para atingir diferentes perfis de processamento mental. Visual: "veja claramente", "o panorama é nítido", "a imagem que emerge". Auditivo: "sintonize a estratégia", "escute o mercado", "o sinal é claro". Cinestésico: "sinta a pressão", "mão na massa", "o peso da decisão", "toque o resultado".',
];

// ── SEÇÃO IV — GATILHOS MENTAIS (Heurísticas de Decisão) ───────────────────
// Atalhos cognitivos que aceleram o processo de decisão do leitor.
const MENTAL_TRIGGERS: string[] = [
  'AVERSÃO À PERDA: Enquadre a solução como a prevenção de uma perda iminente (lucro, tempo, posição competitiva, oportunidade). A dor da perda ativa o sistema límbico com intensidade 2x maior que a promessa de ganho equivalente.',
  'ANCORAGEM: Quando apresentar valor, custo ou magnitude, mencione primeiro o custo do problema ou um benchmark alto antes da solução. Isso calibra a percepção do leitor e faz a solução parecer mais razoável e vantajosa.',
  'PROVA SOCIAL (neurônios espelho): Use dados de volume ou movimento real ("mais de X empresas", "Y% dos gestores de marketing", "Z cases documentados") em vez de adjetivos de liderança como "líder de mercado". Dados ativam os neurônios espelho e reduzem o medo do risco.',
  'ESPECIFICIDADE COMO CREDIBILIDADE: Dados muito específicos (ex: "aumentou a taxa de abertura em 34,7%") geram mais confiança que dados arredondados. A especificidade sinaliza que alguém mediu de verdade.',
];

/**
 * Retorna o bloco de DNA de prompt para injeção universal em qualquer copy.
 * Inclui veto rules (sempre), neurociência, PNL e gatilhos mentais.
 */
export function buildPromptDNABlock(): string {
  const sections: string[] = [
    '═══ ENGENHARIA DE DECISÃO — APLICAR EM TODA PEÇA ═══',
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
    'GATILHOS MENTAIS (usar quando pertinente ao contexto):',
    ...MENTAL_TRIGGERS.map((r) => `• ${r}`),
  ];

  return `\n\n${sections.join('\n')}`;
}
