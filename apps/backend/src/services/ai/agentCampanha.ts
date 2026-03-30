/**
 * agentCampanha.ts
 *
 * Generates complete sequential campaigns where each piece assumes the audience
 * has seen the previous ones. Builds on generateSequencePlan() from agentConceito
 * and produces full PecaDaCampanha with copy + visual instructions + consistency rules.
 *
 * 4 built-in templates:
 *   1. lancamento       — 7-piece full funnel product launch
 *   2. data_comemorativa — 3-piece date campaign
 *   3. nurture          — 4-piece nurture sequence
 *   4. reativacao       — 3-piece reactivation
 */

import { generateCompletion } from './claudeService';
import { generateSequencePlan, type SequencePlan, type CreativeConcept } from './agentConceito';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FunilObjetivo =
  | 'awareness_only'
  | 'awareness_to_consideration'
  | 'full_funnel'
  | 'nurture'
  | 'retention'
  | 'reactivation';

export type TemplateType =
  | 'lancamento'
  | 'data_comemorativa'
  | 'nurture'
  | 'reativacao';

export type PecaDaCampanha = {
  id: string;
  posicao_no_funil: 'awareness' | 'consideracao' | 'conversao' | 'retencao' | 'reativacao';
  numero_na_sequencia: number;
  titulo_interno: string;
  plataforma: string;
  formato: string;
  copy: {
    headline: string;
    body: string;
    cta: string;
    contexto_assumido: string;    // what audience already knows when seeing this piece
  };
  instrucao_visual: string;       // direction for agentDiretorArte
  gatilho_psicologico: string;    // G01-G07
  timing_days: number;            // days after campaign start
  segmentacao?: string;
  dependencias?: string[];
};

export type CampanhaSequencialResult = {
  campanha_id: string;
  nome: string;
  template: TemplateType | 'custom';
  conceito_usado: string;
  arco_narrativo: string;
  pecas: PecaDaCampanha[];
  calendario_sugerido: {
    peca_id: string;
    data_sugerida: string;
    plataforma: string;
    horario_sugerido: string;
  }[];
  regras_de_consistencia: string[];
  metricas_de_sucesso: string[];
};

export type CampanhaParams = {
  template?: TemplateType;
  conceito?: CreativeConcept | null;
  briefing: {
    produto: string;
    objetivo_final: string;
    mensagem_chave: string;
    audiencia: string;
    tom: string;
    restricoes?: string[];
  };
  clientProfile?: any;
  plataformas?: string[];
  duracao_dias?: number;
  funilObjetivo?: FunilObjetivo;
  cultureBlock?: string | null;
};

// ── Template definitions ──────────────────────────────────────────────────────

const TEMPLATE_CONFIGS: Record<TemplateType, {
  label: string;
  phasesCount: number;
  funilObjetivo: FunilObjetivo;
  defaultDuracaoDias: number;
  arcDescription: string;
}> = {
  lancamento: {
    label: 'Lançamento de Produto',
    phasesCount: 7,
    funilObjetivo: 'full_funnel',
    defaultDuracaoDias: 21,
    arcDescription: 'Teaser → Revelação → Prova Social → Mecanismo → CTA → Urgência → Retargeting',
  },
  data_comemorativa: {
    label: 'Data Comemorativa',
    phasesCount: 3,
    funilObjetivo: 'awareness_to_consideration',
    defaultDuracaoDias: 7,
    arcDescription: 'Conexão emocional (D-5) → Conteúdo específico/oferta (D-2) → Gratidão/resultado (D+1)',
  },
  nurture: {
    label: 'Nurture de Base',
    phasesCount: 4,
    funilObjetivo: 'nurture',
    defaultDuracaoDias: 14,
    arcDescription: 'Valor gratuito → Caso de uso → Bastidores → CTA direto',
  },
  reativacao: {
    label: 'Reativação',
    phasesCount: 3,
    funilObjetivo: 'reactivation',
    defaultDuracaoDias: 7,
    arcDescription: 'Sentimos sua falta → O que perdeu → Oferta exclusiva de retorno',
  },
};

// ── Piece generator ───────────────────────────────────────────────────────────

async function generatePecaDaCampanha(params: {
  phase: SequencePlan['phases'][0];
  phaseIndex: number;
  totalPhases: number;
  conceito: string;
  tensao: string;
  plataforma: string;
  clientProfile: any;
  previousPieces: PecaDaCampanha[];
  regrasConsistencia: string[];
}): Promise<PecaDaCampanha> {
  const kb = params.clientProfile?.knowledge_base ?? {};
  const previousContext = params.previousPieces.length > 0
    ? `\nPEÇAS ANTERIORES DA CAMPANHA:\n${params.previousPieces
        .map((p, i) => `Peça ${i + 1} (${p.posicao_no_funil}): "${p.copy.headline}" → CTA: "${p.copy.cta}"`)
        .join('\n')}`
    : '';

  const consistenciaBlock = params.regrasConsistencia.length > 0
    ? `\nREGRAS DE CONSISTÊNCIA (NUNCA quebrar):\n${params.regrasConsistencia.map(r => `• ${r}`).join('\n')}`
    : '';

  const prompt = `Você é um redator de campanhas sequenciais. Crie a peça ${params.phaseIndex + 1} de ${params.totalPhases} para esta campanha.

CONCEITO DA CAMPANHA: "${params.conceito}"
TENSÃO: "${params.tensao}"
FASE: ${params.phase.name} (${params.phase.objective})
AMD: ${params.phase.amd}
TOM: ${params.phase.tone}
MENSAGEM-CHAVE DESTA FASE: ${params.phase.key_message}
GATILHO SUGERIDO: ${params.phase.trigger}
PLATAFORMA: ${params.plataforma}
FORMATO: ${params.phase.suggested_format}
CLIENTE: ${kb.brand_name ?? 'não informado'}
${previousContext}
${consistenciaBlock}

IMPORTANTE: Esta peça é a ${params.phaseIndex + 1}ª de ${params.totalPhases}.
${params.phaseIndex > 0 ? `A audiência JÁ viu as peças anteriores — não reexplique o problema básico.` : `Esta é a PRIMEIRA peça — apresente a tensão/problema com curiosidade, SEM revelar o produto ainda.`}

Responda APENAS com JSON:
{
  "headline": "Texto principal ou legenda curta de abertura (máx 15 palavras)",
  "body": "Corpo da mensagem (máx 150 palavras, adaptado para ${params.plataforma})",
  "cta": "Call-to-action específico (máx 10 palavras)",
  "contexto_assumido": "O que a audiência já sabe ao ver esta peça (1 frase)",
  "instrucao_visual": "Direção para o DA: cena, emoção visual, paleta, o que evitar (3-4 frases)",
  "posicao_no_funil": "awareness|consideracao|conversao|retencao|reativacao"
}`;

  try {
    const res = await generateCompletion({ prompt, temperature: 0.7, maxTokens: 600 });
    const raw = res.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(raw);

    const funilMap: Record<string, PecaDaCampanha['posicao_no_funil']> = {
      awareness: 'awareness', consideracao: 'consideracao', conversao: 'conversao',
      retencao: 'retencao', reativacao: 'reativacao',
    };

    return {
      id: `peca_${params.phaseIndex + 1}`,
      posicao_no_funil: funilMap[parsed.posicao_no_funil] ?? 'awareness',
      numero_na_sequencia: params.phaseIndex + 1,
      titulo_interno: params.phase.name,
      plataforma: params.plataforma,
      formato: params.phase.suggested_format,
      copy: {
        headline:          parsed.headline ?? '',
        body:              parsed.body ?? '',
        cta:               parsed.cta ?? '',
        contexto_assumido: parsed.contexto_assumido ?? '',
      },
      instrucao_visual:   parsed.instrucao_visual ?? params.phase.key_message,
      gatilho_psicologico: params.phase.trigger,
      timing_days:        params.phase.timing_days,
      dependencias:       params.phaseIndex > 0 ? [`peca_${params.phaseIndex}`] : [],
    };
  } catch {
    // Fallback piece
    return {
      id: `peca_${params.phaseIndex + 1}`,
      posicao_no_funil: 'awareness',
      numero_na_sequencia: params.phaseIndex + 1,
      titulo_interno: params.phase.name,
      plataforma: params.plataforma,
      formato: params.phase.suggested_format,
      copy: {
        headline:          params.phase.key_message,
        body:              params.phase.objective,
        cta:               params.phase.amd === 'clicar' ? 'Saiba mais' : 'Ver agora',
        contexto_assumido: params.phaseIndex > 0 ? 'Audiência já viu peças anteriores' : 'Primeira exposição',
      },
      instrucao_visual:   `Visual para fase ${params.phase.name}: ${params.phase.tone}`,
      gatilho_psicologico: params.phase.trigger,
      timing_days:        params.phase.timing_days,
    };
  }
}

// ── Consistency rules generator ───────────────────────────────────────────────

async function generateConsistencyRules(
  conceito: string,
  tensao: string,
  clientProfile: any,
): Promise<string[]> {
  const kb = clientProfile?.knowledge_base ?? {};
  const prompt = `Para a campanha com o conceito "${conceito}" e tensão "${tensao}" para ${kb.brand_name ?? 'esta marca'}, liste 5 regras de consistência narrativa que NÃO podem ser quebradas entre as peças. Seja específico para este cliente. Responda com JSON: ["regra1", "regra2", ...]`;
  try {
    const res = await generateCompletion({ prompt, temperature: 0.3, maxTokens: 200 });
    const raw = res.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const rules = JSON.parse(raw);
    return Array.isArray(rules) ? rules : REGRAS_PADRAO;
  } catch {
    return REGRAS_PADRAO;
  }
}

const REGRAS_PADRAO = [
  'Todas as peças partem da mesma tensão central',
  'Vocabulário e expressões-âncora se repetem entre peças',
  'Tom não muda entre peças',
  'A promessa feita na Peça 1 é cumprida na última peça',
  'CTA escala em compromisso: Descubra → Conheça → Fale conosco',
];

// ── Calendar builder ──────────────────────────────────────────────────────────

function buildCalendario(
  pecas: PecaDaCampanha[],
  plataforma: string,
  startDate = new Date(),
): CampanhaSequencialResult['calendario_sugerido'] {
  const BEST_TIMES: Record<string, string> = {
    instagram: '18:00', linkedin: '09:00', tiktok: '19:00',
    facebook: '12:00', twitter: '08:00', default: '12:00',
  };
  const horario = BEST_TIMES[plataforma.toLowerCase()] ?? BEST_TIMES.default;

  return pecas.map((peca) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + peca.timing_days);
    return {
      peca_id: peca.id,
      data_sugerida: date.toISOString().split('T')[0],
      plataforma,
      horario_sugerido: horario,
    };
  });
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function runAgentCampanha(
  params: CampanhaParams,
): Promise<CampanhaSequencialResult> {
  const template = params.template ?? 'nurture';
  const config = TEMPLATE_CONFIGS[template];
  const plataforma = params.plataformas?.[0] ?? 'instagram';
  const conceito = params.conceito;
  const conceitoText = conceito?.headline_concept ?? params.briefing.mensagem_chave;
  const tensaoText = conceito?.emotional_truth ?? params.briefing.mensagem_chave;

  // Step 1: Generate sequence plan
  const plan = await generateSequencePlan(
    {
      objective: params.briefing.objetivo_final,
      clientProfile: params.clientProfile,
      platform: plataforma,
      phases: config.phasesCount,
      cultureBlock: params.cultureBlock,
    },
    conceito ?? null,
  );

  // Step 2: Generate consistency rules
  const regrasConsistencia = await generateConsistencyRules(conceitoText, tensaoText, params.clientProfile);

  // Step 3: Generate each piece sequentially (each knows what came before)
  const pecas: PecaDaCampanha[] = [];
  for (let i = 0; i < plan.phases.length; i++) {
    const peca = await generatePecaDaCampanha({
      phase: plan.phases[i],
      phaseIndex: i,
      totalPhases: plan.phases.length,
      conceito: conceitoText,
      tensao: tensaoText,
      plataforma,
      clientProfile: params.clientProfile ?? {},
      previousPieces: pecas,
      regrasConsistencia,
    });
    pecas.push(peca);
  }

  // Step 4: Build calendar
  const calendario = buildCalendario(pecas, plataforma);

  const campanha_id = `campanha_${Date.now()}`;

  return {
    campanha_id,
    nome: plan.campaign_title,
    template,
    conceito_usado: conceitoText,
    arco_narrativo: plan.narrative_arc || config.arcDescription,
    pecas,
    calendario_sugerido: calendario,
    regras_de_consistencia: regrasConsistencia,
    metricas_de_sucesso: [
      'Taxa de salvamento por peça (referência: >4% Instagram)',
      'Alcance acumulado da sequência vs posts isolados',
      'Taxa de clique por fase (awareness esperada: <1%, conversão: >3%)',
      'Custo por conversão vs campanha pontual do período anterior',
    ],
  };
}
